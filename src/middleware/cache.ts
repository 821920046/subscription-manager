// 缓存中间件 - 自动缓存 GET 请求响应

import type { Context, Next } from 'hono';
import { createCacheManager } from '../utils/cache';

interface CacheMiddlewareOptions {
  ttl?: number; // 缓存时间（秒）
  tags?: string[]; // 缓存标签
  keyGenerator?: (c: Context) => string; // 自定义缓存键生成器
  shouldCache?: (c: Context) => boolean; // 是否缓存的判断函数
}

// 生成缓存键
function defaultKeyGenerator(c: Context): string {
  const url = new URL(c.req.url);
  // 包含查询参数
  return `cache:${c.req.method}:${url.pathname}${url.search}`;
}

// 判断是否应该缓存
function defaultShouldCache(c: Context): boolean {
  // 只缓存 GET 请求
  if (c.req.method !== 'GET') return false;

  // 不缓存包含敏感信息的路径
  const sensitivePaths = ['/auth', '/login', '/logout', '/api/config'];
  const url = new URL(c.req.url);
  if (sensitivePaths.some((path) => url.pathname.includes(path))) {
    return false;
  }

  return true;
}

// 缓存中间件
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 300, // 默认5分钟
    tags = [],
    keyGenerator = defaultKeyGenerator,
    shouldCache = defaultShouldCache,
  } = options;

  return async (c: Context, next: Next) => {
    const kv = c.env?.SUBSCRIPTIONS_KV;
    if (!kv) {
      // 没有 KV，跳过缓存
      return await next();
    }

    // 判断是否缓存
    if (!shouldCache(c)) {
      return await next();
    }

    const cacheManager = createCacheManager(kv);
    const cacheKey = keyGenerator(c);

    // 尝试从缓存获取
    const cached = await cacheManager.get<{ body: string; headers: Record<string, string> }>(cacheKey);
    if (cached) {
      // 返回缓存的响应
      c.header('X-Cache', 'HIT');
      c.header('Content-Type', cached.headers['content-type'] || 'application/json');
      return c.body(cached.body);
    }

    // 执行请求
    await next();

    // 缓存响应
    if (c.res && c.res.status === 200) {
      const body = await c.res.clone().text();
      const headers: Record<string, string> = {};
      c.res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      await cacheManager.set(
        cacheKey,
        { body, headers },
        ttl,
        tags
      );

      c.header('X-Cache', 'MISS');
    }
  };
}

// 缓存失效中间件
export function cacheInvalidateMiddleware(tags: string[]) {
  return async (c: Context, next: Next) => {
    await next();

    // 在响应成功后失效相关缓存
    if (c.res && (c.res.status === 200 || c.res.status === 201 || c.res.status === 204)) {
      const kv = c.env?.SUBSCRIPTIONS_KV;
      if (kv) {
        const cacheManager = createCacheManager(kv);
        // 异步失效缓存，不阻塞响应
        Promise.all(tags.map((tag) => cacheManager.invalidateByTag(tag))).catch((error) => {
          console.error('Cache invalidate error:', error);
        });
      }
    }
  };
}

// 缓存统计中间件
export function cacheStatsMiddleware() {
  return async (c: Context, next: Next) => {
    const kv = c.env?.SUBSCRIPTIONS_KV;
    if (!kv) {
      return await next();
    }

    const cacheManager = createCacheManager(kv);
    const startTime = Date.now();

    await next();

    // 添加缓存统计头
    const stats = cacheManager.getStats();
    c.header('X-Cache-Stats', JSON.stringify(stats));
    c.header('X-Response-Time', `${Date.now() - startTime}ms`);
  };
}
