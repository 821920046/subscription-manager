// 审计中间件

import type { Context, Next } from 'hono';
import { createAuditService } from '../services/audit';

// 审计中间件配置
interface AuditMiddlewareOptions {
  excludePaths?: string[]; // 不记录的路径
  excludeMethods?: string[]; // 不记录的 HTTP 方法
}

// 默认配置
const DEFAULT_OPTIONS: AuditMiddlewareOptions = {
  excludePaths: ['/health', '/metrics', '/favicon.ico'],
  excludeMethods: ['OPTIONS', 'HEAD'],
};

// 审计中间件
export function auditMiddleware(options: AuditMiddlewareOptions = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (c: Context, next: Next) => {
    const kv = c.env?.SUBSCRIPTIONS_KV;
    if (!kv) {
      // 没有 KV，跳过审计
      return await next();
    }

    const url = new URL(c.req.url);

    // 检查是否需要跳过
    if (opts.excludePaths?.some((path) => url.pathname.includes(path))) {
      return await next();
    }

    if (opts.excludeMethods?.includes(c.req.method)) {
      return await next();
    }

    const auditService = createAuditService(kv);
    const startTime = Date.now();
    let error: string | undefined;

    try {
      await next();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      throw e; // 继续抛出错误
    } finally {
      // 记录请求
      const statusCode = c.res?.status || 500;
      await auditService.logRequest(c, startTime, statusCode, error);
    }
  };
}

// 审计日志查询处理函数
export async function handleAuditLogQuery(c: Context): Promise<Response> {
  try {
    const kv = c.env?.SUBSCRIPTIONS_KV;
    if (!kv) {
      return c.json(
        {
          success: false,
          error: {
            code: 'CONFIG_ERROR',
            message: 'KV storage not configured',
          },
        },
        500
      );
    }

    const auditService = createAuditService(kv);

    // 解析查询参数
    const url = new URL(c.req.url);
    const options = {
      startTime: url.searchParams.get('startTime') || undefined,
      endTime: url.searchParams.get('endTime') || undefined,
      userId: url.searchParams.get('userId') || undefined,
      path: url.searchParams.get('path') || undefined,
      method: url.searchParams.get('method') || undefined,
      statusCode: url.searchParams.get('statusCode')
        ? parseInt(url.searchParams.get('statusCode')!, 10)
        : undefined,
      limit: url.searchParams.get('limit')
        ? parseInt(url.searchParams.get('limit')!, 10)
        : 50,
      offset: url.searchParams.get('offset')
        ? parseInt(url.searchParams.get('offset')!, 10)
        : 0,
    };

    const result = await auditService.queryLogs(options);

    return c.json({
      success: true,
      data: result.logs,
      meta: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
      },
    });
  } catch (error) {
    console.error('Audit log query error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while querying audit logs',
        },
      },
      500
    );
  }
}

// 导出类型
export type { AuditMiddlewareOptions };
