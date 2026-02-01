import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './types';

// 导入路由
import { authRoutes } from './routes/auth.routes';
import { subscriptionRoutes } from './routes/subscription.routes';
import { configRoutes } from './routes/config.routes';
import { notifyRoutes } from './routes/notify.routes';

// 导入中间件
import { errorHandler } from './middleware/error-handler.middleware';
import { authMiddleware } from './middleware/auth.middleware';

// 创建Hono应用
const app = new Hono<{ Bindings: Env }>();

// 全局中间件
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'"],
  },
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));

// 错误处理
app.onError(errorHandler);

// 安全信息端点
app.get('/.well-known/security.txt', (c) => {
  const content = `Contact: mailto:security@example.com
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: zh-cn, en
Canonical: https://${c.req.header('host')}/.well-known/security.txt`;
  
  return c.text(content);
});

// 健康检查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
  });
});

// 公开路由
app.route('/api/auth', authRoutes);

// 需要认证的路由
app.use('/api/subscriptions/*', authMiddleware);
app.use('/api/config/*', authMiddleware);
app.use('/api/notify/*', authMiddleware);

app.route('/api/subscriptions', subscriptionRoutes);
app.route('/api/config', configRoutes);
app.route('/api/notify', notifyRoutes);

// 页面路由
app.get('/', (c) => {
  return c.redirect('/login');
});

app.get('/login', (c) => {
  // 返回登录页面HTML
  return c.html(loginPage);
});

app.get('/admin', authMiddleware, (c) => {
  return c.html(adminPage);
});

app.get('/admin/config', authMiddleware, (c) => {
  return c.html(configPage);
});

app.get('/debug', (c) => {
  return c.html(debugPage);
});

// 定时任务处理器
export async function scheduled(
  event: ScheduledEvent,
  env: Env,
  ctx: ExecutionContext
) {
  // 导入服务
  const { ConfigService } = await import('./services/config.service');
  const { SubscriptionService } = await import('./services/subscription.service');
  const { notificationManager } = await import('./notifiers');
  
  const configService = new ConfigService(env);
  const subscriptionService = new SubscriptionService(env);
  
  // 设置env到通知管理器
  notificationManager.setEnv(env);
  
  // 获取配置
  const config = await configService.getConfig();
  const timezone = config.timezone || 'UTC';
  
  // 获取当前时间
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const currentTime = `${get('hour')}:${get('minute')}`;
  
  const globalTimes = config.reminderTimes.length > 0 ? config.reminderTimes : ['08:00'];
  
  // 检查是否有订阅需要提醒
  const { notifications } = await subscriptionService.checkExpiringSubscriptions();
  
  // 过滤当前时段需要提醒的订阅
  const filtered = notifications.filter((n) => {
    const subTimes = n.subscription.dailyReminderTimes || [];
    if (subTimes.length > 0) {
      return subTimes.includes(currentTime);
    }
    return globalTimes.includes(currentTime);
  });
  
  if (filtered.length > 0) {
    // 按到期时间排序
    filtered.sort((a, b) => a.daysUntil - b.daysUntil);
    
    const subscriptions = filtered.map((n) => ({
      ...n.subscription,
      daysRemaining: n.daysUntil,
    }));
    
    // 发送通知
    ctx.waitUntil(
      notificationManager.sendToAllChannels(
        {
          title: '订阅到期提醒',
          content: '',
          subscriptions,
        },
        config,
        '[定时任务]'
      )
    );
  }
}

// 页面HTML模板（简化版）
const loginPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>登录 - 订阅管理系统</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-blue-500 to-purple-600 min-h-screen flex items-center justify-center">
  <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
    <h1 class="text-2xl font-bold text-center mb-6">订阅管理系统</h1>
    <form id="loginForm" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">用户名</label>
        <input type="text" id="username" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">密码</label>
        <input type="password" id="password" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md" required>
      </div>
      <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
        登录
      </button>
    </form>
  </div>
  <script>
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      
      if (res.ok) {
        window.location.href = '/admin';
      } else {
        alert('登录失败');
      }
    });
  </script>
</body>
</html>`;

const adminPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>管理 - 订阅管理系统</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen">
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-bold">订阅管理系统</h1>
        </div>
        <div class="flex items-center space-x-4">
          <a href="/admin/config" class="text-gray-600 hover:text-gray-900">系统配置</a>
          <button onclick="logout()" class="text-red-600 hover:text-red-900">退出</button>
        </div>
      </div>
    </div>
  </nav>
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white shadow rounded-lg p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-lg font-semibold">订阅列表</h2>
        <button onclick="addSubscription()" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
          添加订阅
        </button>
      </div>
      <div id="subscriptionList" class="space-y-4">
        <!-- 订阅列表将在这里渲染 -->
      </div>
    </div>
  </main>
  
  <script>
    async function loadSubscriptions() {
      const res = await fetch('/api/subscriptions');
      const data = await res.json();
      // 渲染订阅列表
    }
    
    function logout() {
      fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
    }
    
    loadSubscriptions();
  </script>
</body>
</html>`;

const configPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>系统配置 - 订阅管理系统</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen">
  <nav class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <h1 class="text-xl font-bold">系统配置</h1>
        </div>
        <div class="flex items-center space-x-4">
          <a href="/admin" class="text-gray-600 hover:text-gray-900">返回管理</a>
        </div>
      </div>
    </div>
  </nav>
  
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white shadow rounded-lg p-6">
      <form id="configForm" class="space-y-6">
        <!-- 配置表单内容 -->
        <div>
          <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
            保存配置
          </button>
        </div>
      </form>
    </div>
  </main>
</body>
</html>`;

const debugPage = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>调试 - 订阅管理系统</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen p-8">
  <div class="max-w-4xl mx-auto">
    <h1 class="text-2xl font-bold mb-6">系统调试</h1>
    <div class="bg-white shadow rounded-lg p-6">
      <pre id="debugInfo" class="text-sm">加载中...</pre>
    </div>
  </div>
  <script>
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        document.getElementById('debugInfo').textContent = JSON.stringify(data, null, 2);
      });
  </script>
</body>
</html>`;

// 导出Cloudflare Workers处理器
export default {
  fetch: app.fetch,
  scheduled,
};
