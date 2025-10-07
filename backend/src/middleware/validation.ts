import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

/**
 * Input Validation and Sanitization Middleware
 * 
 * Protects against XSS, SQL Injection, and other input-based attacks.
 * Following OWASP Input Validation Cheat Sheet.
 */

interface ValidationRules {
  email?: boolean;
  username?: boolean;
  password?: boolean;
  solanaWallet?: boolean;
  url?: boolean;
  alphanumeric?: boolean;
  numeric?: boolean;
  decimal?: boolean;
  maxLength?: number;
  minLength?: number;
}

/**
 * Sanitize HTML to prevent XSS attacks
 * Using validator.escape for server-side sanitization
 */
export const sanitizeHTML = (input: string): string => {
  // Escape HTML entities to prevent XSS
  // This converts <, >, &, ', ", and / to their HTML entity equivalents
  return validator.escape(input);
};

/**
 * Validate and sanitize input fields
 */
export const validateInput = (
  value: any,
  rules: ValidationRules
): { isValid: boolean; sanitized: string | number; errors: string[] } => {
  const errors: string[] = [];
  let sanitized: string | number = value;

  // Type checking
  if (value === undefined || value === null) {
    return { isValid: false, sanitized: '', errors: ['Value is required'] };
  }

  // Convert to string for validation
  const strValue = String(value).trim();

  // Length validation
  if (rules.minLength && strValue.length < rules.minLength) {
    errors.push(`Must be at least ${rules.minLength} characters`);
  }
  if (rules.maxLength && strValue.length > rules.maxLength) {
    errors.push(`Must be no more than ${rules.maxLength} characters`);
  }

  // Email validation
  if (rules.email) {
    if (!validator.isEmail(strValue)) {
      errors.push('Invalid email format');
    }
    sanitized = validator.normalizeEmail(strValue) || strValue;
  }

  // Username validation (alphanumeric + underscores)
  if (rules.username) {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(strValue)) {
      errors.push('Username must be 3-20 characters (letters, numbers, underscores only)');
    }
    sanitized = sanitizeHTML(strValue);
  }

  // Password validation
  if (rules.password) {
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(strValue)) {
      errors.push('Password must be 8+ characters with uppercase, lowercase, and number');
    }
    // Don't sanitize passwords - store as-is (will be hashed)
    sanitized = strValue;
  }

  // Solana wallet validation
  if (rules.solanaWallet) {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(strValue)) {
      errors.push('Invalid Solana wallet address format');
    }
    sanitized = strValue; // Wallet addresses should not be modified
  }

  // URL validation
  if (rules.url) {
    if (!validator.isURL(strValue, { protocols: ['http', 'https'], require_protocol: true })) {
      errors.push('Invalid URL format');
    }
    sanitized = validator.escape(strValue);
  }

  // Alphanumeric validation
  if (rules.alphanumeric) {
    if (!validator.isAlphanumeric(strValue, 'en-US')) {
      errors.push('Must contain only letters and numbers');
    }
    sanitized = sanitizeHTML(strValue);
  }

  // Numeric validation
  if (rules.numeric) {
    if (!validator.isNumeric(strValue)) {
      errors.push('Must be a valid number');
    }
    sanitized = parseFloat(strValue);
  }

  // Decimal validation
  if (rules.decimal) {
    if (!validator.isDecimal(strValue)) {
      errors.push('Must be a valid decimal number');
    }
    sanitized = parseFloat(strValue);
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors,
  };
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeBody = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body) {
      return next();
    }

    fields.forEach((field) => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = sanitizeHTML(req.body[field]);
      }
    });

    next();
  };
};

/**
 * Middleware to validate and sanitize query parameters
 */
export const sanitizeQuery = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.query) {
      return next();
    }

    fields.forEach((field) => {
      if (req.query[field] && typeof req.query[field] === 'string') {
        req.query[field] = sanitizeHTML(req.query[field] as string);
      }
    });

    next();
  };
};

/**
 * Prevent NoSQL Injection in query parameters
 */
export const preventNoSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const checkObject = (obj: any): boolean => {
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          return false;
        }
        if (typeof obj[key] === 'object' && !checkObject(obj[key])) {
          return false;
        }
      }
    }
    return true;
  };

  if (!checkObject(req.body) || !checkObject(req.query) || !checkObject(req.params)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request parameters',
    });
  }

  next();
};

/**
 * Validate trade amount
 */
export const validateTradeAmount = (amount: number): { isValid: boolean; error?: string } => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  if (amount > 1000000) {
    return { isValid: false, error: 'Amount exceeds maximum limit' };
  }
  if (amount.toString().split('.')[1]?.length > 9) {
    return { isValid: false, error: 'Amount has too many decimal places (max 9)' };
  }
  return { isValid: true };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (
  limit?: string | number,
  offset?: string | number
): { limit: number; offset: number; errors: string[] } => {
  const errors: string[] = [];
  let validLimit = 20; // Default
  let validOffset = 0; // Default

  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      errors.push('Limit must be a positive number');
    } else if (parsedLimit > 100) {
      errors.push('Limit cannot exceed 100');
    } else {
      validLimit = parsedLimit;
    }
  }

  if (offset !== undefined) {
    const parsedOffset = Number(offset);
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      errors.push('Offset must be a non-negative number');
    } else {
      validOffset = parsedOffset;
    }
  }

  return { limit: validLimit, offset: validOffset, errors };
};

/**
 * Validate Solana address format
 * Solana addresses are base58 encoded, 32-44 characters, no 0OIl
 */
export const validateSolanaAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') return false;
  if (address.length < 32 || address.length > 44) return false;
  
  // Base58 alphabet (excludes 0, O, I, l to avoid confusion)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
};

/**
 * Validate URL with stricter rules
 * Prevents javascript:, data:, and other dangerous protocols
 */
export const validateURL = (url: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Prevent localhost/private IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
};
