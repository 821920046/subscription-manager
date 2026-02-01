import { Hono } from 'hono';
import type { Env } from '../types';
import { generateJWT, setCookie, clearCookie, hashPassword } from '../utils/crypto';
import { ConfigService } from '../services/config.service';
import { rateLimitMiddleware } from '../middleware/rate-limit.middleware';

const app = new Hono<{ Bindings: Env }>();

/**
 * 登录
 * POST /api/auth/login
 */
app.post('/login', rateLimitMiddleware(5, 60), async (c) => {
  try {
    const { username, password } = await c.req.json();
    
    if (!username || !password) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: '用户名和密码不能为空',
          },
        },
        400
      );
    }
    
    const configService = new ConfigService(c.env);
    const config = await configService.getConfig();
    
    // 验证用户名密码
    const isValid =
      username === config.adminUsername &&
      password === config.adminPassword;
    
    if (!isValid) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: '用户名或密码错误',
          },
        },
        401
      );
    }
    
    // 生成JWT
    const token = await generateJWT(username, config.jwtSecret);
    
    // 设置cookie
    const cookie = setCookie('token', token, {
      maxAge: 86400,
      httpOnly: true,
      secure: c.req.url.startsWith('https'),
      sameSite: 'Lax',
    });
    
    c.header('Set-Cookie', cookie);
    
    return c.json({
      success: true,
      data: { username },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message: error instanceof Error ? error.message : '登录失败',
        },
      },
      500
    );
  }
});

/**
 * 登出
 * POST /api/auth/logout
 */
app.post('/logout', async (c) => {
  const cookie = clearCookie('token');
  c.header('Set-Cookie', cookie);
  
  return c.json({
    success: true,
  });
});

/**
 * 开发环境重置登录
 * POST /api/auth/dev/reset-login
 */
app.post('/dev/reset-login', async (c) => {
  // 只允许本地开发环境
  const url = new URL(c.req.url);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  
  if (!isLocal) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '仅限本地开发环境使用',
        },
      },
      403
    );
  }
  
  try {
    const configService = new ConfigService(c.env);
    await configService.updateConfig({
      adminUsername: 'admin',
      adminPassword: 'password',
    });
    
    return c.json({
      success: true,
      message: '已重置为默认账号: admin / password',
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: {
          code: 'RESET_ERROR',
          message: error instanceof Error ? error.message : '重置失败',
        },
      },
      500
    );
  }
});

export const authRoutes = app;
