# 优化功能使用指南

本文档说明如何使用项目优化后添加的新功能。

## 📋 目录

- [数据验证](#数据验证)
- [错误处理](#错误处理)
- [日志记录](#日志记录)
- [速率限制](#速率限制)
- [缓存管理](#缓存管理)
- [导出和备份](#导出和备份)
- [监控服务](#监控服务)
- [测试](#测试)

## 🔍 数据验证

### 使用 Zod Schema 验证输入数据

```typescript
import { SubscriptionSchema } from './utils/validation';

try {
  // 验证订阅数据
  const validatedData = SubscriptionSchema.parse(inputData);
  // 使用验证后的数据
} catch (error) {
  if (error instanceof z.ZodError) {
    // 处理验证错误
    console.error(error.errors);
  }
}
```

### SafeParse（不抛出异常）

```typescript
const result = SubscriptionSchema.safeParse(inputData);

if (result.success) {
  // 使用 result.data
} else {
  // 处理 result.error
}
```

## ⚠️ 错误处理

### 使用自定义错误类

```typescript
import { ValidationError, NotFoundError } from './utils/errors';

// 抛出验证错误
if (!subscription.name) {
  throw new ValidationError('服务名称不能为空');
}

// 抛出未找到错误
const sub = await getSubscription(id);
if (!sub) {
  throw new NotFoundError('订阅不存在');
}
```

### 创建错误响应

```typescript
import { createErrorResponse } from './utils/errors';

try {
  // ... 业务逻辑
} catch (error) {
  return createErrorResponse(error);
}
```

## 📝 日志记录

### 使用结构化日志

```typescript
import { Logger } from './utils/logger';

// 记录信息
Logger.info('订阅已创建', { subscriptionId: '123', name: 'Netflix' });

// 记录警告
Logger.warn('配置值缺失', { key: 'TG_BOT_TOKEN' });

// 记录错误
Logger.error('通知发送失败', error);

// 调试信息
Logger.debug('计算剩余天数', { days: 7, expiryDate: '2024-12-31' });
```

### 日志输出格式

```json
{
  "timestamp": "2026-01-13T14:30:00.000Z",
  "level": "INFO",
  "message": "订阅已创建",
  "data": {
    "subscriptionId": "123",
    "name": "Netflix"
  }
}
```

## 🚦 速率限制

### 检查速率限制

```typescript
import { RateLimiter } from './utils/rateLimit';

// 检查并获取结果
const result = await RateLimiter.check(env, ip, 'login');

if (!result.allowed) {
  return new Response('请求过于频繁', { status: 429 });
}

// 使用剩余次数信息
const remainingRequests = result.remaining;
```

### 检查并抛出异常

```typescript
// 如果超限会自动抛出 RateLimitError
await RateLimiter.checkOrThrow(env, ip, 'api');
```

### 重置速率限制（管理员功能）

```typescript
await RateLimiter.reset(env, ip, 'login');
```

## 💾 缓存管理

### 使用缓存

```typescript
import { CacheManager } from './utils/cache';

// 设置缓存（默认 60 秒）
CacheManager.set('config', configData, 60000);

// 获取缓存
const cached = CacheManager.get<Config>('config');
if (cached) {
  return cached;
}

// 检查缓存是否存在
if (CacheManager.has('config')) {
  // ...
}

// 删除缓存
CacheManager.delete('config');

// 清空所有缓存
CacheManager.clear();
```

### 缓存配置示例

```typescript
import { CONFIG } from './config/constants';

// 配置缓存 TTL
const configTTL = CONFIG.CACHE.CONFIG_TTL; // 60000ms
const subscriptionTTL = CONFIG.CACHE.SUBSCRIPTION_TTL; // 30000ms
```

## 📤 导出和备份

### 导出为 JSON

```typescript
import { ExportService } from './services/export';

const subscriptions = await getAllSubscriptions();
const jsonData = ExportService.exportToJSON(subscriptions);

// 返回下载
return new Response(jsonData, {
  headers: {
    'Content-Type': 'application/json',
    'Content-Disposition': 'attachment; filename="subscriptions.json"',
  },
});
```

### 导出为 CSV

```typescript
const csvData = ExportService.exportToCSV(subscriptions);

return new Response(csvData, {
  headers: {
    'Content-Type': 'text/csv',
    'Content-Disposition': 'attachment; filename="subscriptions.csv"',
  },
});
```

### 从 CSV 导入

```typescript
try {
  const subscriptions = ExportService.importFromCSV(csvContent);
  
  for (const sub of subscriptions) {
    await createSubscription(sub);
  }
} catch (error) {
  Logger.error('CSV 导入失败', error);
}
```

### 创建备份

```typescript
const subscriptions = await getAllSubscriptions();
const config = await getConfig(env);

const backup = ExportService.createBackup(subscriptions, config);

// 保存备份
return new Response(backup, {
  headers: {
    'Content-Type': 'application/json',
    'Content-Disposition': `attachment; filename="backup-${Date.now()}.json"`,
  },
});
```

### 从备份恢复

```typescript
try {
  const { subscriptions, config, version } = ExportService.restoreFromBackup(backupContent);
  
  Logger.info('备份版本', { version });
  
  // 恢复订阅
  for (const sub of subscriptions) {
    await createSubscription(sub);
  }
  
  // 恢复配置（谨慎操作）
  // await updateConfig(config);
} catch (error) {
  Logger.error('备份恢复失败', error);
}
```

## 📊 监控服务

### 创建监控实例

```typescript
import { MonitoringService } from './services/monitoring';

const monitoring = new MonitoringService();
```

### 健康检查

```typescript
const health = await monitoring.healthCheck(env);

console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
console.log(health.checks);  // { kv: true, config: true }
console.log(health.uptime);  // 毫秒数
```

### 记录度量指标

```typescript
await monitoring.trackMetric({
  name: 'subscription_created',
  value: 1,
  timestamp: Date.now(),
  tags: { type: 'manual' },
});
```

### 记录 API 请求

```typescript
const startTime = Date.now();
// ... 处理请求
const duration = Date.now() - startTime;

await monitoring.trackRequest('/api/subscriptions', 'POST', 201, duration);
```

### 记录通知发送

```typescript
const success = await sendTelegramNotification(message, config);
await monitoring.trackNotification('telegram', success);
```

### 捕获异常

```typescript
try {
  // ... 业务逻辑
} catch (error) {
  monitoring.captureException(error, {
    context: 'subscription_creation',
    userId: 'admin',
  });
  throw error;
}
```

### 性能追踪

```typescript
await monitoring.trackPerformance('kv_batch_read', durationMs);
```

### 获取系统统计

```typescript
const stats = await monitoring.getStats(env);

console.log(stats.totalSubscriptions);
console.log(stats.uptime);
```

## 🧪 测试

### 运行所有测试

```bash
npm run test
```

### 运行单元测试（一次）

```bash
npm run test:unit
```

### 生成覆盖率报告

```bash
npm run test:coverage
```

### 编写测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { SubscriptionService } from '../src/services/subscription';

describe('Subscription Service', () => {
  it('should create a subscription', async () => {
    const service = new SubscriptionService(mockEnv);
    
    const result = await service.createSubscription({
      name: 'Netflix',
      expiryDate: '2024-12-31T00:00:00.000Z',
      isActive: true,
      autoRenew: true,
    });
    
    expect(result.success).toBe(true);
    expect(result.subscription).toBeDefined();
  });
});
```

## 🔧 开发工具

### 类型检查

```bash
npm run typecheck
```

### 代码检查

```bash
npm run lint

# 自动修复
npm run lint:fix
```

### 代码格式化

```bash
npm run format

# 检查格式
npm run format:check
```

### 运行所有验证

```bash
npm run validate
```

## 📐 常量配置

所有常量都集中在 `src/config/constants.ts`：

```typescript
import { CONFIG } from './config/constants';

// JWT 配置
const jwtExpiry = CONFIG.JWT.EXPIRY; // '24h'
const minSecretLength = CONFIG.JWT.MIN_SECRET_LENGTH; // 32

// 速率限制
const loginLimit = CONFIG.RATE_LIMIT.LOGIN.maxRequests; // 5
const apiLimit = CONFIG.RATE_LIMIT.API.maxRequests; // 100

// 缓存 TTL
const configTTL = CONFIG.CACHE.CONFIG_TTL; // 60000

// 验证限制
const maxNameLength = CONFIG.VALIDATION.MAX_NAME_LENGTH; // 100
const maxPrice = CONFIG.VALIDATION.MAX_PRICE; // 999999.99

// 默认值
const defaultTimezone = CONFIG.DEFAULTS.TIMEZONE; // 'UTC'
```

## 🚀 部署

### Staging 环境

```bash
npm run deploy:staging
```

### Production 环境

```bash
npm run deploy:production
```

或者通过 Git commit 消息触发：

```bash
git commit -m "feat: new feature [deploy-prod]"
git push
```

## 📚 更多资源

- [架构文档](ARCHITECTURE.md) - 系统架构详解
- [贡献指南](CONTRIBUTING.md) - 如何参与开发
- [变更日志](CHANGELOG.md) - 版本历史
- [优化报告](OPTIMIZATION_REPORT.md) - 优化详情

## 💡 最佳实践

1. **始终使用数据验证**：所有用户输入都应通过 Zod Schema 验证
2. **使用结构化日志**：便于问题追踪和分析
3. **合理使用缓存**：减少 KV 访问，提升性能
4. **监控关键操作**：记录重要的度量指标
5. **编写测试**：为新功能添加单元测试
6. **遵循代码规范**：使用 ESLint 和 Prettier
7. **类型安全**：充分利用 TypeScript 的类型系统

## ❓FAQ

### Q: 如何处理密码迁移？
A: 现有明文密码需要通过 Web UI 重新设置，系统会自动使用 bcrypt 哈希存储。

### Q: 缓存在 Workers 中持久吗？
A: 不持久。Cloudflare Workers 每次请求都是独立的，缓存仅在单次请求生命周期内有效。但对于同一请求中的多次访问，缓存仍然有效。

### Q: 如何集成第三方监控服务？
A: 可以在 `MonitoringService` 中添加对 Sentry、Datadog 等服务的集成。

### Q: 测试如何模拟 KV？
A: 参考 `tests/services/subscription.test.ts` 中的 `createMockKV` 函数。

## 🆘 获取帮助

如果遇到问题：

1. 查看 [ARCHITECTURE.md](ARCHITECTURE.md) 了解系统架构
2. 检查 [CHANGELOG.md](CHANGELOG.md) 查看最近的变更
3. 阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解开发流程
4. 在 GitHub 上提交 Issue
