// Input validation schemas and middleware
import { FastifyRequest, FastifyReply } from 'fastify';

export interface ValidationSchema {
  type: 'object';
  required?: string[];
  properties: Record<string, any>;
  additionalProperties?: boolean;
}

// Common field validation patterns
const commonPatterns = {
  email: {
    type: 'string',
    format: 'email',
    maxLength: 254
  },
  password: {
    type: 'string',
    minLength: 8,
    maxLength: 128
    // Removed strict pattern for production - can be re-enabled later
    // pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$'
  },
  uuid: {
    type: 'string',
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  },
  solanaAddress: {
    type: 'string',
    pattern: '^[1-9A-HJ-NP-Za-km-z]{32,44}$'
  },
  handle: {
    type: 'string',
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-zA-Z0-9_-]+$'
  },
  decimal: {
    type: 'string',
    pattern: '^[0-9]+\\.?[0-9]*$'
  },
  url: {
    type: 'string',
    format: 'uri',
    maxLength: 2048
  }
};

// Auth validation schemas
export const authSchemas = {
  emailSignup: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: commonPatterns.email,
      password: commonPatterns.password,
      handle: { ...commonPatterns.handle, nullable: true },
      profileImage: { ...commonPatterns.url, nullable: true }
    },
    additionalProperties: false
  } as ValidationSchema,

  emailLogin: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: commonPatterns.email,
      password: { type: 'string', minLength: 1, maxLength: 128 }
    },
    additionalProperties: false
  } as ValidationSchema,

  walletNonce: {
    type: 'object',
    required: ['walletAddress'],
    properties: {
      walletAddress: commonPatterns.solanaAddress
    },
    additionalProperties: false
  } as ValidationSchema,

  walletVerify: {
    type: 'object',
    required: ['walletAddress', 'signature'],
    properties: {
      walletAddress: commonPatterns.solanaAddress,
      signature: {
        type: 'string',
        pattern: '^[1-9A-HJ-NP-Za-km-z]{60,100}$' // Base58 signature pattern
      }
    },
    additionalProperties: false
  } as ValidationSchema,

  profileUpdate: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: commonPatterns.uuid,
      handle: { ...commonPatterns.handle, nullable: true },
      profileImage: { ...commonPatterns.url, nullable: true },
      bio: { 
        type: 'string', 
        maxLength: 500, 
        nullable: true 
      },
      displayName: {
        type: 'string',
        minLength: 1,
        maxLength: 50,
        nullable: true
      }
    },
    additionalProperties: false
  } as ValidationSchema,

  changePassword: {
    type: 'object',
    required: ['userId', 'currentPassword', 'newPassword'],
    properties: {
      userId: commonPatterns.uuid,
      currentPassword: { type: 'string', minLength: 1, maxLength: 128 },
      newPassword: commonPatterns.password
    },
    additionalProperties: false
  } as ValidationSchema,

  refreshToken: {
    type: 'object',
    required: ['refreshToken'],
    properties: {
      refreshToken: { type: 'string', minLength: 50 }
    },
    additionalProperties: false
  } as ValidationSchema,

  logout: {
    type: 'object',
    properties: {},
    additionalProperties: false
  } as ValidationSchema
};

// Trade validation schemas
export const tradeSchemas = {
  trade: {
    type: 'object',
    required: ['userId', 'mint', 'side', 'qty'],
    properties: {
      userId: commonPatterns.uuid,
      mint: commonPatterns.solanaAddress,
      side: {
        type: 'string',
        enum: ['BUY', 'SELL']
      },
      qty: {
        type: 'string',
        pattern: '^(0|[1-9]\\d*)(\\.\\d+)?$', // Positive decimal
        maxLength: 50
      }
    },
    additionalProperties: false
  } as ValidationSchema
};

// Query parameter validation schemas
export const querySchemas = {
  pagination: {
    type: 'object',
    properties: {
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 50
      },
      offset: {
        type: 'integer',
        minimum: 0,
        default: 0
      }
    },
    additionalProperties: false
  } as ValidationSchema,

  userId: {
    type: 'object',
    required: ['userId'],
    properties: {
      userId: commonPatterns.uuid
    },
    additionalProperties: false
  } as ValidationSchema
};

// Validation error class
class ValidationError extends Error {
  public statusCode = 400;
  public code = 'VALIDATION_ERROR';
  public details: any[];

  constructor(message: string, details: any[] = []) {
    super(message);
    this.details = details;
  }
}

// Simple JSON Schema validator (basic implementation)
class SimpleValidator {
  static validate(data: any, schema: ValidationSchema): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (schema.type === 'object') {
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        errors.push('Must be an object');
        return { valid: false, errors };
      }

      // Check required fields
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in data) || data[field] === undefined || data[field] === null) {
            errors.push(`Missing required field: ${field}`);
          }
        }
      }

      // Check additional properties
      if (schema.additionalProperties === false) {
        const allowedKeys = Object.keys(schema.properties);
        for (const key of Object.keys(data)) {
          if (!allowedKeys.includes(key)) {
            errors.push(`Unexpected field: ${key}`);
          }
        }
      }

      // Validate properties
      for (const [key, value] of Object.entries(data)) {
        if (schema.properties[key]) {
          const fieldErrors = this.validateField(value, schema.properties[key], key);
          errors.push(...fieldErrors);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private static validateField(value: any, fieldSchema: any, fieldName: string): string[] {
    const errors: string[] = [];

    // Handle nullable fields
    if (fieldSchema.nullable && (value === null || value === undefined)) {
      return errors;
    }

    // Type validation
    if (fieldSchema.type) {
      const expectedType = fieldSchema.type;
      const actualType = typeof value;

      if (expectedType === 'string' && actualType !== 'string') {
        errors.push(`${fieldName} must be a string`);
        return errors;
      }

      if (expectedType === 'integer' && (!Number.isInteger(value))) {
        errors.push(`${fieldName} must be an integer`);
        return errors;
      }

      if (expectedType === 'number' && typeof value !== 'number') {
        errors.push(`${fieldName} must be a number`);
        return errors;
      }
    }

    // String validations
    if (fieldSchema.type === 'string' && typeof value === 'string') {
      if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
        errors.push(`${fieldName} must be at least ${fieldSchema.minLength} characters`);
      }

      if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
        errors.push(`${fieldName} must be at most ${fieldSchema.maxLength} characters`);
      }

      if (fieldSchema.pattern && !new RegExp(fieldSchema.pattern).test(value)) {
        errors.push(`${fieldName} format is invalid`);
      }

      if (fieldSchema.format === 'email' && !this.isValidEmail(value)) {
        errors.push(`${fieldName} must be a valid email address`);
      }

      if (fieldSchema.format === 'uri' && !this.isValidUrl(value)) {
        errors.push(`${fieldName} must be a valid URL`);
      }
    }

    // Enum validation
    if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${fieldSchema.enum.join(', ')}`);
    }

    // Number validations
    if (typeof value === 'number') {
      if (fieldSchema.minimum !== undefined && value < fieldSchema.minimum) {
        errors.push(`${fieldName} must be at least ${fieldSchema.minimum}`);
      }

      if (fieldSchema.maximum !== undefined && value > fieldSchema.maximum) {
        errors.push(`${fieldName} must be at most ${fieldSchema.maximum}`);
      }
    }

    return errors;
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Validation middleware factory
export function validateBody(schema: ValidationSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { valid, errors } = SimpleValidator.validate(request.body, schema);
      
      if (!valid) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: errors
        });
      }
    } catch (error: any) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Failed to validate request data',
        details: [error.message]
      });
    }
  };
}

// Query parameter validation middleware
export function validateQuery(schema: ValidationSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { valid, errors } = SimpleValidator.validate(request.query, schema);
      
      if (!valid) {
        return reply.code(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors
        });
      }
    } catch (error: any) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Failed to validate query parameters',
        details: [error.message]
      });
    }
  };
}

// Sanitize input (basic XSS prevention)
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .trim()
      .slice(0, 10000); // Limit length
  }
  
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
}

export { ValidationError, SimpleValidator };