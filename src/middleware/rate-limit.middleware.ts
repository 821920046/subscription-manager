import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types';

/**
 * 限流中间件
 * 基于IP地址进行限流
 */
export function rateLimitMiddleware(
  maxRequests: number = 10,
  windowSeconds: number = 60
): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for') ||
      'unknown';
    
    const path = c.req.path;
    const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
    const key = `rate:${path}:${ip}:${bucket}`;
    
    // 获取当前计数
    const current = await c.env.SUBSCRIPTIONS_KV.get(key);
    let count = current ? parseInt(current, 10) : 0;
    
    if (count >= maxRequests) {
      return c.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: '请求过于频繁，请稍后再试',
          },
        },
        429
      );
    }
    
    // 增加计数
    count++;
    await c.env.SUBSCRIPTIONS_KV.put(key, count.toString(), {
      expirationTtl: windowSeconds,
    });
    
    await next();
  };
}
