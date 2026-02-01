import type { Context, Next } from 'hono';
import {
  AppError,
  normalizeError,
  isAppError,
  ErrorCode,
} from '../errors';

// 错误日志记录函数
function logError(error: AppError, c: Context): void {
  const timestamp = new Date().toISOString();
  const requestId = c.get('requestId') || crypto.randomUUID();
  
  console.error(JSON.stringify({
    timestamp,
    requestId,
    level: 'error',
    code: error.code,
    statusCode: error.statusCode,
    message: error.message,
    details: error.details,
    path: c.req.path,
    method: c.req.method,
    stack: error.stack,
  }));
}

// 全局错误处理中间件
export async function errorHandler(c: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err) {
    // 转换错误为 AppError
    const appError = isAppError(err) ? err : normalizeError(err);
    
    // 记录错误日志
    logError(appError, c);
    
    // 构建错误响应
    const isDevelopment = c.env?.ENVIRONMENT === 'development';
    
    const errorResponse = {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        ...(isDevelopment && {
          details: appError.details,
          stack: appError.stack,
          timestamp: appError.timestamp,
        }),
      },
    };
    
    // 返回错误响应
    c.status(appError.statusCode as any);
    c.json(errorResponse);
  }
}

// Zod 验证错误处理中间件
export function handleZodError(error: any, c: Context): Response {
  const issues = error.issues || [];
  const details = issues.map((issue: any) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
  
  return c.json({
    success: false,
    error: {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Validation failed',
      details,
    },
  }, 400);
}

// 404 错误处理
export function notFoundHandler(c: Context): Response {
  return c.json({
    success: false,
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route ${c.req.path} not found`,
    },
  }, 404);
}
