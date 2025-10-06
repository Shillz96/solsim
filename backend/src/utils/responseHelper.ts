/**
 * Standardized API Response Helper
 * Ensures consistent response structure across all endpoints
 */

import { Response } from 'express';
import { serializeDecimals } from './decimal.js';
import { logger } from './logger.js';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    userId?: string;
    timestamp?: number;
    pagination?: PaginationMeta;
    count?: number;
    limit?: number;
    category?: string;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  statusCode?: number;
  timestamp?: number;
  path?: string;
}

export interface PaginationMeta {
  limit: number;
  offset: number;
  hasMore: boolean;
  total?: number;
}

/**
 * Send a successful response with consistent format
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options?: {
    message?: string;
    meta?: Record<string, any>;
    statusCode?: number;
  }
): void {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data: serializeDecimals(data),
  };

  if (options?.message) {
    response.message = options.message;
  }

  if (options?.meta) {
    response.meta = {
      ...options.meta,
      timestamp: Date.now(),
    };
  }

  res.status(options?.statusCode || 200).json(response);
}

/**
 * Send an error response with consistent format
 */
export function sendError(
  res: Response,
  error: string | Error,
  options?: {
    code?: string;
    statusCode?: number;
    path?: string;
    logError?: boolean;
  }
): void {
  const errorMessage = error instanceof Error ? error.message : error;
  const statusCode = options?.statusCode || 500;

  const response: ApiErrorResponse = {
    success: false,
    error: errorMessage,
    statusCode,
    timestamp: Date.now(),
  };

  if (options?.code) {
    response.code = options.code;
  }

  if (options?.path) {
    response.path = options.path;
  }

  // Log error if requested
  if (options?.logError !== false) {
    logger.error('API Error Response:', {
      error: errorMessage,
      code: options?.code,
      statusCode,
      path: options?.path,
    });
  }

  res.status(statusCode).json(response);
}

/**
 * Send a paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: {
    limit: number;
    offset: number;
    total?: number;
  },
  options?: {
    message?: string;
    meta?: Record<string, any>;
  }
): void {
  const paginationMeta: PaginationMeta = {
    limit: pagination.limit,
    offset: pagination.offset,
    hasMore: pagination.total ? pagination.offset + data.length < pagination.total : data.length === pagination.limit,
    total: pagination.total,
  };

  sendSuccess(res, data, {
    message: options?.message,
    meta: {
      ...options?.meta,
      pagination: paginationMeta,
      count: data.length,
    },
  });
}

/**
 * Send a created resource response (201)
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  options?: {
    message?: string;
    meta?: Record<string, any>;
  }
): void {
  sendSuccess(res, data, {
    ...options,
    statusCode: 201,
  });
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Validation error (400)
 */
export function sendValidationError(
  res: Response,
  error: string,
  options?: {
    code?: string;
    path?: string;
  }
): void {
  sendError(res, error, {
    ...options,
    statusCode: 400,
    code: options?.code || 'VALIDATION_ERROR',
  });
}

/**
 * Unauthorized error (401)
 */
export function sendUnauthorized(
  res: Response,
  error: string = 'Unauthorized',
  options?: {
    code?: string;
    path?: string;
  }
): void {
  sendError(res, error, {
    ...options,
    statusCode: 401,
    code: options?.code || 'UNAUTHORIZED',
  });
}

/**
 * Forbidden error (403)
 */
export function sendForbidden(
  res: Response,
  error: string = 'Forbidden',
  options?: {
    code?: string;
    path?: string;
  }
): void {
  sendError(res, error, {
    ...options,
    statusCode: 403,
    code: options?.code || 'FORBIDDEN',
  });
}

/**
 * Not found error (404)
 */
export function sendNotFound(
  res: Response,
  error: string = 'Resource not found',
  options?: {
    code?: string;
    path?: string;
  }
): void {
  sendError(res, error, {
    ...options,
    statusCode: 404,
    code: options?.code || 'NOT_FOUND',
  });
}

/**
 * Conflict error (409)
 */
export function sendConflict(
  res: Response,
  error: string,
  options?: {
    code?: string;
    path?: string;
  }
): void {
  sendError(res, error, {
    ...options,
    statusCode: 409,
    code: options?.code || 'CONFLICT',
  });
}

/**
 * Internal server error (500)
 */
export function sendInternalError(
  res: Response,
  error: string = 'Internal server error',
  options?: {
    code?: string;
    path?: string;
  }
): void {
  sendError(res, error, {
    ...options,
    statusCode: 500,
    code: options?.code || 'INTERNAL_ERROR',
  });
}

/**
 * Service unavailable error (503)
 */
export function sendServiceUnavailable(
  res: Response,
  error: string = 'Service unavailable',
  options?: {
    code?: string;
    path?: string;
  }
): void {
  sendError(res, error, {
    ...options,
    statusCode: 503,
    code: options?.code || 'SERVICE_UNAVAILABLE',
  });
}
