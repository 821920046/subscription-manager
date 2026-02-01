import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  BadRequestError,
  InternalError,
  ServiceUnavailableError,
  ErrorCode,
  createErrorResponse,
  normalizeError,
  isAppError,
  isValidationError,
  isNotFoundError,
  isUnauthorizedError,
} from '../src/errors';

describe('Error Classes', () => {
  describe('AppError (Base Class)', () => {
    it('should create an AppError with all properties', () => {
      const error = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Test error',
        500,
        { field: 'test', value: 'invalid' }
      );

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ field: 'test', value: 'invalid' });
      expect(error.timestamp).toBeDefined();
      expect(error.name).toBe('AppError');
    });

    it('should convert to JSON correctly', () => {
      const error = new AppError(ErrorCode.NOT_FOUND, 'Not found', 404);
      const json = error.toJSON();

      expect(json.success).toBe(false);
      expect(json.error.code).toBe(ErrorCode.NOT_FOUND);
      expect(json.error.message).toBe('Not found');
      expect(json.error.timestamp).toBeDefined();
    });

    it('should capture stack trace', () => {
      const error = new AppError(ErrorCode.INTERNAL_ERROR, 'Test', 500);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with status 400', () => {
      const error = new ValidationError('Invalid input', { field: 'email' });

      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
      expect(error.details).toEqual({ field: 'email' });
    });
  });

  describe('NotFoundError', () => {
    it('should create a not found error with resource and id', () => {
      const error = new NotFoundError('Subscription', '123');

      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Subscription with id '123' not found");
      expect(error.details).toEqual({ resource: 'Subscription', id: '123' });
    });

    it('should create a not found error with resource only', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.details).toEqual({ resource: 'User', id: undefined });
    });
  });

  describe('UnauthorizedError', () => {
    it('should create an unauthorized error with status 401', () => {
      const error = new UnauthorizedError();

      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('Unauthorized');
    });

    it('should accept custom message', () => {
      const error = new UnauthorizedError('Token expired');
      expect(error.message).toBe('Token expired');
    });
  });

  describe('ForbiddenError', () => {
    it('should create a forbidden error with status 403', () => {
      const error = new ForbiddenError();

      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe('Forbidden');
    });

    it('should accept custom message', () => {
      const error = new ForbiddenError('Access denied');
      expect(error.message).toBe('Access denied');
    });
  });

  describe('ConflictError', () => {
    it('should create a conflict error with status 409', () => {
      const error = new ConflictError('Resource already exists', { id: '123' });

      expect(error.code).toBe(ErrorCode.CONFLICT);
      expect(error.statusCode).toBe(409);
      expect(error.message).toBe('Resource already exists');
      expect(error.details).toEqual({ id: '123' });
    });
  });

  describe('BadRequestError', () => {
    it('should create a bad request error with status 400', () => {
      const error = new BadRequestError('Malformed request', { field: 'data' });

      expect(error.code).toBe(ErrorCode.BAD_REQUEST);
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Malformed request');
      expect(error.details).toEqual({ field: 'data' });
    });
  });

  describe('InternalError', () => {
    it('should create an internal error with status 500', () => {
      const error = new InternalError();

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe('Internal server error');
    });

    it('should accept custom message and details', () => {
      const error = new InternalError('Database connection failed', { retry: true });
      expect(error.message).toBe('Database connection failed');
      expect(error.details).toEqual({ retry: true });
    });
  });

  describe('ServiceUnavailableError', () => {
    it('should create a service unavailable error with status 503', () => {
      const error = new ServiceUnavailableError();

      expect(error.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe('Service unavailable');
    });

    it('should accept custom message', () => {
      const error = new ServiceUnavailableError('Maintenance in progress');
      expect(error.message).toBe('Maintenance in progress');
    });
  });
});

describe('Error Utilities', () => {
  describe('createErrorResponse', () => {
    it('should create error response from AppError', () => {
      const error = new ValidationError('Invalid data');
      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(response.error.message).toBe('Invalid data');
    });
  });

  describe('normalizeError', () => {
    it('should return AppError as-is', () => {
      const original = new ValidationError('Test');
      const normalized = normalizeError(original);

      expect(normalized).toBe(original);
    });

    it('should convert standard Error to InternalError', () => {
      const standardError = new Error('Something went wrong');
      const normalized = normalizeError(standardError);

      expect(normalized).toBeInstanceOf(InternalError);
      expect(normalized.message).toBe('Something went wrong');
      expect(normalized.details?.originalError).toBe('Error');
      expect(normalized.details?.stack).toBeDefined();
    });

    it('should convert unknown error to InternalError', () => {
      const normalized = normalizeError('string error');

      expect(normalized).toBeInstanceOf(InternalError);
      expect(normalized.message).toBe('Unknown error occurred');
      expect(normalized.details?.originalError).toBe('string error');
    });

    it('should handle null error', () => {
      const normalized = normalizeError(null);

      expect(normalized).toBeInstanceOf(InternalError);
      expect(normalized.message).toBe('Unknown error occurred');
    });
  });

  describe('Type Guards', () => {
    it('should identify AppError correctly', () => {
      const appError = new AppError(ErrorCode.INTERNAL_ERROR, 'Test', 500);
      const standardError = new Error('Test');

      expect(isAppError(appError)).toBe(true);
      expect(isAppError(standardError)).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError('error')).toBe(false);
    });

    it('should identify ValidationError correctly', () => {
      const validationError = new ValidationError('Test');
      const otherError = new NotFoundError('Test');

      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(otherError)).toBe(false);
    });

    it('should identify NotFoundError correctly', () => {
      const notFoundError = new NotFoundError('Test');
      const otherError = new ValidationError('Test');

      expect(isNotFoundError(notFoundError)).toBe(true);
      expect(isNotFoundError(otherError)).toBe(false);
    });

    it('should identify UnauthorizedError correctly', () => {
      const unauthorizedError = new UnauthorizedError();
      const otherError = new ValidationError('Test');

      expect(isUnauthorizedError(unauthorizedError)).toBe(true);
      expect(isUnauthorizedError(otherError)).toBe(false);
    });
  });
});

describe('ErrorCode Enum', () => {
  it('should have all expected error codes', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCode.CONFLICT).toBe('CONFLICT');
    expect(ErrorCode.BAD_REQUEST).toBe('BAD_REQUEST');
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCode.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
  });
});
