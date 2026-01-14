/**
 * 应用程序错误类
 */

import { HTTP_STATUS } from '../config/constants';

/**
 * 基础应用错误类
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational: boolean = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;

        // 维护正确的堆栈跟踪
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, HTTP_STATUS.BAD_REQUEST, true);
    }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, HTTP_STATUS.UNAUTHORIZED, true);
    }
}

/**
 * 授权错误
 */
export class AuthorizationError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, HTTP_STATUS.FORBIDDEN, true);
    }
}

/**
 * 资源未找到错误
 */
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, HTTP_STATUS.NOT_FOUND, true);
    }
}

/**
 * 速率限制错误
 */
export class RateLimitError extends AppError {
    constructor(message: string = '请求过于频繁，请稍后再试') {
        super(message, HTTP_STATUS.TOO_MANY_REQUESTS, true);
    }
}

/**
 * 内部服务器错误
 */
export class InternalServerError extends AppError {
    constructor(message: string = 'Internal server error') {
        super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
    }
}

/**
 * 错误响应生成器
 */
export function createErrorResponse(error: Error | AppError): Response {
    const isAppError = error instanceof AppError;
    const statusCode = isAppError ? error.statusCode : HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = isAppError && error.isOperational ? error.message : 'Internal server error';

    return new Response(
        JSON.stringify({
            success: false,
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
        }),
        {
            status: statusCode,
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );
}
