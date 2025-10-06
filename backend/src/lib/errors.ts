/**
 * UNIFIED ERROR HANDLING SYSTEM
 * 
 * Consolidates error classes from:
 * - backend/src/lib/errors.ts (SolSimError hierarchy)
 * - backend/src/middleware/errorHandler.ts (AppError hierarchy)
 * 
 * This file now serves as the single source of truth for all application errors.
 * 
 * Migration completed: December 29, 2025
 */

/**
 * Base error class for all application errors
 * Extends Error with additional metadata for proper error handling
 */
export class AppError extends Error {
  public readonly isOperational: boolean;
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
    
    // Set the prototype explicitly for proper instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Validation errors (400)
 * Used for invalid input, missing fields, etc.
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

/**
 * Authentication errors (401)
 * Used when user is not authenticated or token is invalid
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR', true);
  }
}

/**
 * Authorization errors (403)
 * Used when user is authenticated but lacks permission
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR', true);
  }
}

/**
 * Not found errors (404)
 * Used when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND', true);
  }
}

/**
 * Conflict errors (409)
 * Used for duplicate resources or conflicting operations
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT_ERROR', true);
  }
}

/**
 * Rate limit errors (429)
 * Used when user exceeds rate limits
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR', true);
  }
}

/**
 * Domain-specific errors
 */

/**
 * Insufficient balance error (400)
 * Used when user doesn't have enough balance for operation
 */
export class InsufficientBalanceError extends AppError {
  constructor(required?: string, available?: string) {
    const message = required && available
      ? `Insufficient balance. Required: ${required}, Available: ${available}`
      : 'Insufficient balance';
    super(message, 400, 'INSUFFICIENT_BALANCE', true);
  }
}

/**
 * Invalid token error (400)
 * Used for invalid cryptocurrency token addresses
 */
export class InvalidTokenError extends AppError {
  constructor(message: string = 'Invalid token address') {
    super(message, 400, 'INVALID_TOKEN', true);
  }
}

/**
 * Invalid trade error (400)
 * Used for invalid trade operations
 */
export class InvalidTradeError extends AppError {
  constructor(message: string) {
    super(`Invalid trade: ${message}`, 400, 'INVALID_TRADE', true);
  }
}

/**
 * Token not found error (404)
 * Used when cryptocurrency token doesn't exist
 */
export class TokenNotFoundError extends AppError {
  constructor(tokenAddress: string) {
    super(`Token not found: ${tokenAddress}`, 404, 'TOKEN_NOT_FOUND', true);
  }
}

/**
 * External API error (503)
 * Used when external API calls fail
 */
export class ExternalAPIError extends AppError {
  constructor(service: string, originalError?: any) {
    super(
      `External API error: ${service}`,
      503,
      'EXTERNAL_API_ERROR',
      true,
      originalError
    );
  }
}

/**
 * Price service error (503)
 * Used when price service is unavailable
 */
export class PriceServiceError extends AppError {
  constructor(message: string = 'Price service unavailable') {
    super(message, 503, 'PRICE_SERVICE_ERROR', true);
  }
}

/**
 * Database error (500)
 * Used for database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, 'DATABASE_ERROR', false, details);
  }
}

/**
 * Concurrency error (409)
 * Used when operations fail due to concurrent access
 */
export class ConcurrencyError extends AppError {
  constructor(message: string = 'Operation failed due to concurrent access') {
    super(message, 409, 'CONCURRENCY_ERROR', true);
  }
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use AppError instead
 */
export class SolSimError extends AppError {
  constructor(message: string, statusCode: number = 500, errorCode: string = 'INTERNAL_ERROR') {
    super(message, statusCode, errorCode, true);
    console.warn('SolSimError is deprecated. Use AppError or specific error classes instead.');
  }
}

// Export all error classes as a collection
export const Errors = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InsufficientBalanceError,
  InvalidTokenError,
  InvalidTradeError,
  TokenNotFoundError,
  ExternalAPIError,
  PriceServiceError,
  DatabaseError,
  ConcurrencyError,
  SolSimError
};

export default Errors;