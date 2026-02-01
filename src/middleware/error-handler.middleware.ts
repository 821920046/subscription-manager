import type { ErrorHandler } from 'hono';
import type { Env } from '../types';

/**
 * 全局错误处理中间件
 */
export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
  console.error('Error:', err);
  
  // 根据环境返回不同的错误信息
  const isDev = c.env.NODE_ENV === 'development';
  
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: isDev ? err.message : '服务器内部错误',
        ...(isDev && { stack: err.stack }),
      },
    },
    500
  );
};
