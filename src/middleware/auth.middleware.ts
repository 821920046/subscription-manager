import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types';
import { verifyJWT, getCookieValue } from '../utils/crypto';
import { ConfigService } from '../services/config.service';

/**
 * JWT认证中间件
 */
export const authMiddleware: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  // 从cookie获取token
  const cookie = c.req.header('Cookie');
  const token = getCookieValue(cookie, 'token');
  
  if (!token) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未登录或登录已过期',
        },
      },
      401
    );
  }
  
  // 获取配置验证token
  const configService = new ConfigService(c.env);
  const config = await configService.getConfig();
  
  if (!config.jwtSecret) {
    return c.json(
      {
        success: false,
        error: {
          code: 'CONFIG_ERROR',
          message: '系统配置错误',
        },
      },
      500
    );
  }
  
  // 验证token
  const username = await verifyJWT(token, config.jwtSecret);
  
  if (!username) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '登录已过期，请重新登录',
        },
      },
      401
    );
  }
  
  // 将用户信息存储在context中
  c.set('user', { username });
  
  await next();
};
