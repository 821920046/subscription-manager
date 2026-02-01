// 错误代码枚举
export enum ErrorCode {
  // 客户端错误 (4xx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  BAD_REQUEST = 'BAD_REQUEST',

  // 服务器错误 (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// 错误详情类型
export interface ErrorDetails {
  field?: string;
  value?: any;
  reason?: string;
  [key: string]: any;
}

// 基础应用错误类
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: ErrorDetails;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number,
    details?: ErrorDetails
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // 转换为 JSON 格式
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: this.timestamp,
      },
    };
  }
}

// 验证错误 (400)
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
  }
}

// 资源未找到错误 (404)
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, 404, { resource, id });
  }
}

// 未授权错误 (401)
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(ErrorCode.UNAUTHORIZED, message, 401);
  }
}

// 禁止访问错误 (403)
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(ErrorCode.FORBIDDEN, message, 403);
  }
}

// 资源冲突错误 (409)
export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(ErrorCode.CONFLICT, message, 409, details);
  }
}

// 请求错误 (400)
export class BadRequestError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(ErrorCode.BAD_REQUEST, message, 400, details);
  }
}

// 内部服务器错误 (500)
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', details?: ErrorDetails) {
    super(ErrorCode.INTERNAL_ERROR, message, 500, details);
  }
}

// 服务不可用错误 (503)
export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable') {
    super(ErrorCode.SERVICE_UNAVAILABLE, message, 503);
  }
}

// 创建错误响应的辅助函数
export function createErrorResponse(error: AppError) {
  return error.toJSON();
}

// 将未知错误转换为 AppError
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new InternalError('Unknown error occurred', {
    originalError: String(error),
  });
}

// 检查错误类型的辅助函数
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: unknown): error is NotFoundError {
  return error instanceof NotFoundError;
}

export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}
