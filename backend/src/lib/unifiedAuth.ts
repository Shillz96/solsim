/**
 * UNIFIED AUTHENTICATION SERVICE
 * 
 * Single source of truth for authentication in the Sol Sim backend.
 * Consolidates and replaces:
 * - backend/src/lib/auth.ts (old authentication middleware)
 * - Duplicate error handling from middleware/errorHandler.ts and lib/errors.ts
 * 
 * Key improvements:
 * - Single authentication implementation
 * - Clear separation of development and production modes
 * - Proper environment validation
 * - Type-safe interfaces
 * - Comprehensive error handling
 */

import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import prisma from './prisma.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';
import { UserTier } from '@prisma/client';
import { tierService } from '../services/tierService.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email?: string;
    username?: string;
    userTier?: UserTier;
    walletAddress?: string;
  };
}

export interface JWTPayload {
  sub: string;        // User ID (standard JWT claim)
  email?: string;
  username?: string;
  userTier?: UserTier;
  walletAddress?: string;
  iat?: number;       // Issued at
  exp?: number;       // Expiration
}

export interface AuthConfig {
  isDevelopment: boolean;
  jwtSecret: string;
  jwtExpiresIn: string;
  allowDevBypass: boolean;
}

// ============================================================================
// AUTHENTICATION SERVICE
// ============================================================================

export class AuthenticationService {
  private static instance: AuthenticationService;
  private config: AuthConfig;

  private constructor() {
    this.config = this.validateAndLoadConfig();
  }

  public static getInstance(): AuthenticationService {
    if (!AuthenticationService.instance) {
      AuthenticationService.instance = new AuthenticationService();
    }
    return AuthenticationService.instance;
  }

  /**
   * Validate and load authentication configuration
   * Prevents production deployment with insecure settings
   */
  private validateAndLoadConfig(): AuthConfig {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const jwtSecret = config.jwt.secret as string;
    
    // CRITICAL: Validate JWT secret in production
    if (!isDevelopment) {
      if (!jwtSecret || jwtSecret === 'development-secret-key') {
        logger.error('🚨 CRITICAL: JWT_SECRET not configured for production');
        throw new Error('JWT_SECRET must be set for production deployment');
      }
      
      if (jwtSecret.length < 32) {
        logger.error('🚨 CRITICAL: JWT_SECRET is too short (minimum 32 characters)');
        throw new Error('JWT_SECRET must be at least 32 characters');
      }
    }

    const authConfig: AuthConfig = {
      isDevelopment,
      jwtSecret,
      jwtExpiresIn: config.jwt.expiresIn as string,
      allowDevBypass: isDevelopment && config.development.authBypass
    };

    if (authConfig.allowDevBypass) {
      logger.warn('⚠️  Development authentication bypass is ENABLED');
    }

    return authConfig;
  }

  /**
   * Main authentication middleware
   * Routes to appropriate auth method based on environment
   */
  public authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Development bypass (only in development mode)
      if (this.config.allowDevBypass) {
        await this.handleDevelopmentAuth(req, res, next);
        return;
      }

      // Production JWT authentication
      await this.handleProductionAuth(req, res, next);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Optional authentication middleware
   * Attempts to authenticate but doesn't fail if no auth is provided
   */
  public optionalAuthenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Development bypass (only in development mode)
      if (this.config.allowDevBypass) {
        await this.handleDevelopmentAuth(req, res, next);
        return;
      }

      // Production JWT authentication - but optional
      await this.handleOptionalProductionAuth(req, res, next);
    } catch (error) {
      // In optional auth, we don't fail - just continue without user
      logger.debug('Optional auth failed, continuing without user', { error: error.message });
      next();
    }
  };

  /**
   * Development authentication bypass
   * Creates/uses test users without password verification
   */
  private async handleDevelopmentAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const devUserId = (req.headers['x-dev-user-id'] as string) || 'dev-user-1';
    const devEmail = (req.headers['x-dev-email'] as string) || `${devUserId}@dev.local`;

    logger.debug('🔓 Development auth bypass', { userId: devUserId });

    try {
      // Find or create development user
      let user = await prisma.user.findUnique({
        where: { id: devUserId },
        select: { 
          id: true, 
          email: true, 
          username: true,
          userTier: true,
          walletAddress: true 
        }
      });

      if (!user) {
        logger.info('Creating development user', { userId: devUserId });
        user = await prisma.user.create({
          data: {
            id: devUserId,
            email: devEmail,
            username: devUserId,
            passwordHash: 'dev-mode-no-password',
            virtualSolBalance: 100,  // Dev users start with 100 SOL
            userTier: UserTier.SIM_HOLDER // Dev users get premium tier for testing
          },
          select: { 
            id: true, 
            email: true, 
            username: true,
            userTier: true,
            walletAddress: true 
          }
        });
      }

      // Attach user to request
      (req as AuthenticatedRequest).user = {
        id: user.id,
        email: user.email,
        username: user.username,
        userTier: user.userTier,
        walletAddress: user.walletAddress || undefined
      };

      next();
    } catch (error) {
      logger.error('Development auth failed', { error, userId: devUserId });
      next(new AuthenticationError('Development authentication failed'));
    }
  }

  /**
   * Production JWT authentication
   * Verifies JWT token from Authorization header
   */
  private async handleProductionAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No valid authorization token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (!token) {
      throw new AuthenticationError('Empty authorization token');
    }

    await this.verifyAndAttachUser(req, token);
    next();
  }

  /**
   * Optional production JWT authentication
   * Attempts to verify JWT token but doesn't fail if not provided
   */
  private async handleOptionalProductionAuth(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth header provided - that's okay for optional auth
      next();
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (!token) {
      // Empty token - that's okay for optional auth
      next();
      return;
    }

    try {
      await this.verifyAndAttachUser(req, token);
    } catch (error) {
      // Auth failed - that's okay for optional auth, just log and continue
      logger.debug('Optional auth token verification failed', { error: error.message });
    }
    
    next();
  }

  /**
   * Verify JWT token and attach user to request
   */
  private async verifyAndAttachUser(req: Request, token: string): Promise<void> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, this.config.jwtSecret as string) as JWTPayload;

      // Extract and validate user ID
      const userId = decoded.sub;
      if (!userId) {
        throw new AuthenticationError('Invalid token payload: missing user ID');
      }

      // Attach user to request
      (req as AuthenticatedRequest).user = {
        id: userId,
        email: decoded.email,
        username: decoded.username,
        userTier: decoded.userTier,
        walletAddress: decoded.walletAddress
      };

      logger.debug('✅ User authenticated', { userId: userId.substring(0, 8) });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError('Invalid token format');
      } else if (error instanceof AuthenticationError) {
        throw error;
      } else {
        logger.error('JWT verification failed', { error });
        throw new AuthenticationError('Token verification failed');
      }
    }
  }

  /**
   * Generate JWT token for authenticated user
   */
  public generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    // @ts-ignore - Temporary fix for JWT type issues in v1
    return jwt.sign(payload, this.config.jwtSecret, {
      expiresIn: this.config.jwtExpiresIn
    });
  }

  /**
   * Verify and decode JWT token
   */
  public verifyToken(token: string): JWTPayload {
    return jwt.verify(token, this.config.jwtSecret as string) as JWTPayload;
  }

  /**
   * Check if running in development mode
   */
  public isDevelopment(): boolean {
    return this.config.isDevelopment;
  }
}

// ============================================================================
// IMPORT UNIFIED ERROR CLASSES
// ============================================================================

import { AuthenticationError, AuthorizationError } from './errors.js';

// Re-export for convenience
export { AuthenticationError, AuthorizationError };

// ============================================================================
// MIDDLEWARE EXPORTS
// ============================================================================

const authService = AuthenticationService.getInstance();

/**
 * Standard authentication middleware
 * Use this for all protected routes
 */
export const authenticate = authService.authenticate;

/**
 * Optional authentication middleware
 * Attempts authentication but doesn't fail if not provided
 */
export const optionalAuthenticate = authService.optionalAuthenticate;

/**
 * Legacy alias for backward compatibility
 * @deprecated Use 'authenticate' instead
 */
export const authMiddleware = authenticate;

/**
 * Extract user ID from authenticated request
 */
export function getUserId(req: Request): string {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user?.id) {
    throw new AuthenticationError('User not authenticated');
  }
  return authReq.user.id;
}

/**
 * Extract full user info from authenticated request
 */
export function getUser(req: Request): AuthenticatedRequest['user'] {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    throw new AuthenticationError('User not authenticated');
  }
  return authReq.user;
}

/**
 * Generate JWT token (for login/register endpoints)
 */
export function generateToken(userId: string, email?: string, username?: string, userTier?: UserTier, walletAddress?: string): string {
  return authService.generateToken({ 
    sub: userId, 
    email, 
    username, 
    userTier, 
    walletAddress 
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return authService.verifyToken(token);
}

// ============================================================================
// TIER-BASED ACCESS CONTROL MIDDLEWARE
// ============================================================================

/**
 * Require minimum user tier for access
 */
export function requireTier(minimumTier: UserTier) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = getUser(req);
      
      // Get fresh user tier info from database for accuracy
      const { tier: currentTier } = await tierService.getUserTierInfo(user.id);
      
      if (!hasRequiredTier(currentTier, minimumTier)) {
        const tierNames = {
          [UserTier.EMAIL_USER]: 'Email User',
          [UserTier.WALLET_USER]: 'Wallet User', 
          [UserTier.SIM_HOLDER]: '$SIM Holder',
          [UserTier.ADMINISTRATOR]: 'Administrator'
        };
        
        throw new AuthorizationError(
          `Access denied. Required tier: ${tierNames[minimumTier]}, current tier: ${tierNames[currentTier]}`
        );
      }
      
      // Update request with current tier info
      (req as AuthenticatedRequest).user.userTier = currentTier;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require premium features access ($SIM holders or admins)
 */
export function requirePremiumFeature(feature: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = getUser(req);
      const { tier } = await tierService.getUserTierInfo(user.id);
      
      if (!tierService.canPerformAction(tier, feature)) {
        throw new AuthorizationError(`Premium feature '${feature}' requires $SIM token holdings`);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require wallet connection
 */
export function requireWallet() {
  return requireTier(UserTier.WALLET_USER);
}

/**
 * Require $SIM token holdings
 */
export function requireSimHolder() {
  return requireTier(UserTier.SIM_HOLDER);
}

/**
 * Require administrator access
 */
export function requireAdmin() {
  return requireTier(UserTier.ADMINISTRATOR);
}

/**
 * Check if current tier meets minimum requirement
 */
function hasRequiredTier(currentTier: UserTier, minimumTier: UserTier): boolean {
  const tierHierarchy = {
    [UserTier.EMAIL_USER]: 0,
    [UserTier.WALLET_USER]: 1,
    [UserTier.SIM_HOLDER]: 2,
    [UserTier.ADMINISTRATOR]: 3
  };
  
  return tierHierarchy[currentTier] >= tierHierarchy[minimumTier];
}

/**
 * Get user tier from request (with database lookup for accuracy)
 */
export async function getUserTier(req: Request): Promise<UserTier> {
  const user = getUser(req);
  const { tier } = await tierService.getUserTierInfo(user.id);
  return tier;
}

/**
 * Check if user can perform specific action
 */
export async function canUserPerformAction(req: Request, action: string): Promise<boolean> {
  try {
    const tier = await getUserTier(req);
    return tierService.canPerformAction(tier, action);
  } catch {
    return false;
  }
}

/**
 * Middleware to add tier info to response headers (for debugging)
 */
export function addTierHeaders() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if ((req as AuthenticatedRequest).user) {
        const tier = await getUserTier(req);
        const benefits = tierService.getTierBenefits(tier);
        
        res.setHeader('X-User-Tier', tier);
        res.setHeader('X-Virtual-Sol-Limit', benefits.virtualSolBalance);
        res.setHeader('X-Monthly-Conversion-Limit', benefits.monthlyConversionLimit);
      }
    } catch (error) {
      logger.debug('Failed to add tier headers', { error });
    }
    next();
  };
}

// ============================================================================
// VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validate required fields in request body
 */
export function validateRequired(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const missing = fields.filter(
      field => req.body[field] === undefined || req.body[field] === null || req.body[field] === ''
    );

    if (missing.length > 0) {
      const error = new Error(`Missing required fields: ${missing.join(', ')}`);
      (error as any).statusCode = 400;
      (error as any).code = 'VALIDATION_ERROR';
      return next(error);
    }

    next();
  };
}

/**
 * Validate trade request
 */
export function validateTradeRequest(req: Request, res: Response, next: NextFunction): void {
  const { action, tokenAddress, amount } = req.body;

  // Check required fields
  if (!action || !tokenAddress || amount === undefined) {
    const error = new Error('Missing required fields: action, tokenAddress, amount');
    (error as any).statusCode = 400;
    (error as any).code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Validate action
  const normalizedAction = action.toLowerCase();
  if (!['buy', 'sell'].includes(normalizedAction)) {
    const error = new Error('Invalid action. Must be "buy" or "sell"');
    (error as any).statusCode = 400;
    (error as any).code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Validate tokenAddress
  if (typeof tokenAddress !== 'string' || tokenAddress.trim().length === 0) {
    const error = new Error('Invalid tokenAddress. Must be a non-empty string');
    (error as any).statusCode = 400;
    (error as any).code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Validate amount
  if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
    const error = new Error('Invalid amount. Must be a positive finite number');
    (error as any).statusCode = 400;
    (error as any).code = 'VALIDATION_ERROR';
    return next(error);
  }

  // Normalize action
  req.body.action = normalizedAction;

  next();
}

export default {
  authenticate,
  authMiddleware,
  getUserId,
  getUser,
  generateToken,
  verifyToken,
  validateRequired,
  validateTradeRequest,
  // Tier-based access control
  requireTier,
  requirePremiumFeature,
  requireWallet,
  requireSimHolder,
  requireAdmin,
  getUserTier,
  canUserPerformAction,
  addTierHeaders,
  // Error classes
  AuthenticationError,
  AuthorizationError
};
