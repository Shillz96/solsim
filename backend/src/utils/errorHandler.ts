import { Response } from 'express';
import { logger } from './logger.js';
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
} from '../lib/errors.js';

// Re-export error classes for backward compatibility
export {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
};

/**
 * Centralized Error Handler for Routes
 * 
 * Provides consistent error responses across all endpoints
 * Logs errors with context for debugging
 * 
 * @param error - The error object
 * @param res - Express response object
 * @param context - Context string for logging (e.g., "Getting trending tokens")
 */
export function handleRouteError(
  error: unknown,
  res: Response,
  context: string
): void {
  // Log the error with context
  logger.error(`Error in ${context}:`, error);

  // Validation errors (400)
  if (error instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: error.message
    });
    return;
  }

  // Not found errors (404)
  if (error instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: error.message
    });
    return;
  }

  // Authentication errors (401)
  if (error instanceof AuthenticationError) {
    res.status(401).json({
      success: false,
      error: error.message
    });
    return;
  }

  // Authorization errors (403)
  if (error instanceof AuthorizationError) {
    res.status(403).json({
      success: false,
      error: error.message
    });
    return;
  }

  // Rate limit errors (429)
  if (error instanceof RateLimitError) {
    res.status(429).json({
      success: false,
      error: error.message
    });
    return;
  }

  // Generic error fallback (500)
  res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : 'Internal server error'
  });
}

/**
 * Async route handler wrapper
 * Automatically catches errors and passes to error handler
 * 
 * Usage:
 * router.get('/endpoint', asyncHandler(async (req, res) => {
 *   // Your async code here
 * }));
 */
export function asyncHandler(
  fn: (req: any, res: Response, next?: any) => Promise<void>
) {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      handleRouteError(error, res, req.path || 'unknown');
    });
  };
}

/**
 * Validate and sanitize query parameters
 * 
 * @param params - Object with query parameters
 * @param schema - Validation schema
 * @returns Validated and sanitized parameters
 * @throws ValidationError if validation fails
 */
export function validateQueryParams(
  params: Record<string, any>,
  schema: Record<string, { type: string; required?: boolean; default?: any; min?: number; max?: number }>
): Record<string, any> {
  const validated: Record<string, any> = {};
  const errors: string[] = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = params[key];

    // Required check
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${key} is required`);
      continue;
    }

    // Use default if not provided
    if (value === undefined || value === null) {
      if (rules.default !== undefined) {
        validated[key] = rules.default;
      }
      continue;
    }

    // Type validation and conversion
    switch (rules.type) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`${key} must be a number`);
        } else if (rules.min !== undefined && num < rules.min) {
          errors.push(`${key} must be at least ${rules.min}`);
        } else if (rules.max !== undefined && num > rules.max) {
          errors.push(`${key} must be at most ${rules.max}`);
        } else {
          validated[key] = num;
        }
        break;

      case 'string':
        const str = String(value).trim();
        if (rules.min !== undefined && str.length < rules.min) {
          errors.push(`${key} must be at least ${rules.min} characters`);
        } else if (rules.max !== undefined && str.length > rules.max) {
          errors.push(`${key} must be at most ${rules.max} characters`);
        } else {
          validated[key] = str;
        }
        break;

      case 'boolean':
        validated[key] = value === 'true' || value === true;
        break;

      default:
        validated[key] = value;
    }
  }

  if (errors.length > 0) {
    throw new ValidationError(errors.join(', '));
  }

  return validated;
}
