import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * UNIFIED ERROR HANDLER MIDDLEWARE
 * 
 * Import error classes from the unified errors module:
 * import { AppError, ValidationError, AuthenticationError } from '../lib/errors.js';
 */
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InsufficientBalanceError,
  InvalidTokenError,
  ExternalAPIError
} from '../lib/errors.js';

// Re-export for backward compatibility
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InsufficientBalanceError,
  InvalidTokenError,
  ExternalAPIError
};

/**
 * Database error handler
 * Sanitizes database errors to prevent information leakage
 */
function handleDatabaseError(error: any): AppError {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Prisma errors
  if (error.code === 'P2002') {
    return new ConflictError('A record with this value already exists');
  }
  if (error.code === 'P2025') {
    return new NotFoundError('Record');
  }
  if (error.code === 'P2003') {
    return new ValidationError('Foreign key constraint failed');
  }
  
  // Generic database errors - sanitize in production
  if (error.message?.includes('connect')) {
    const message = isProduction 
      ? 'Database temporarily unavailable' 
      : 'Database connection error';
    return new AppError(message, 503, 'DB_CONNECTION_ERROR', false);
  }
  
  // Don't expose internal database details in production
  const message = isProduction 
    ? 'A database error occurred' 
    : 'Database error';
  return new AppError(message, 500, 'DB_ERROR', false, isProduction ? undefined : error);
}

/**
 * JWT error handler
 */
function handleJWTError(error: any): AppError {
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token expired');
  }
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }
  if (error.name === 'NotBeforeError') {
    return new AuthenticationError('Token not active');
  }
  
  return new AuthenticationError();
}

/**
 * Async error catcher for route handlers
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error: AppError;

  // Convert known errors to AppError
  if (err instanceof AppError) {
    error = err;
  } else if (err.name === 'ValidationError') {
    error = new ValidationError(err.message);
  } else if (err.name?.includes('JWT') || err.name?.includes('Token')) {
    error = handleJWTError(err);
  } else if ((err as any).code?.startsWith('P')) {
    error = handleDatabaseError(err);
  } else {
    // Unknown errors
    error = new AppError(
      err.message || 'Internal server error',
      500,
      'UNKNOWN_ERROR',
      false
    );
  }

  // Log error details (sanitized for production)
  const isProduction = process.env.NODE_ENV === 'production';
  
  const logData = {
    error: {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      isOperational: error.isOperational,
      stack: isProduction ? undefined : error.stack, // Don't log full stack traces in production
      details: error.details
    },
    request: {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      // Sanitize body in production - don't log sensitive data
      body: isProduction ? '[REDACTED]' : req.body,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      },
      ip: req.ip
    },
    timestamp: new Date().toISOString()
  };

  // Log based on error type
  if (error.statusCode >= 500) {
    logger.error('Server error:', logData);
  } else if (error.statusCode >= 400) {
    logger.warn('Client error:', logData);
  } else {
    logger.info('Request error:', logData);
  }

  // Send standardized error response
  const response: any = {
    success: false,
    error: {
      message: error.message,
      code: error.code
    },
    timestamp: new Date().toISOString()
  };

  // Add retry-after header for rate limit errors
  if (error.statusCode === 429 || error.code === 'RATE_LIMIT_ERROR') {
    res.setHeader('Retry-After', '60');
    response.retryAfter = 60;
  }

  // Add stack trace and details in development only
  if (process.env.NODE_ENV === 'development') {
    response.error.statusCode = error.statusCode;
    response.error.stack = error.stack;
    response.error.details = error.details;
  }

  res.status(error.statusCode).json(response);
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

/**
 * Unhandled rejection handler
 */
export const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at:', {
      promise,
      reason: reason?.message || reason,
      stack: reason?.stack
    });
    
    // Exit process in production to restart
    if (process.env.NODE_ENV === 'production') {
      logger.error('Shutting down due to unhandled rejection...');
      process.exit(1);
    }
  });
};

/**
 * Uncaught exception handler
 */
export const handleUncaughtException = () => {
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', {
      message: error.message,
      stack: error.stack
    });
    
    // Exit process to restart
    logger.error('Shutting down due to uncaught exception...');
    process.exit(1);
  });
};
