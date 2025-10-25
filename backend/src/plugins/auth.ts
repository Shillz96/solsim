// JWT Authentication Middleware
import jwt from 'jsonwebtoken';
import { FastifyRequest, FastifyReply } from 'fastify';
import prisma from '../plugins/prisma.js';
import redis from '../plugins/redis.js';

// Get JWT config from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// Validate JWT_SECRET exists (critical for security)
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// TypeScript assertion after validation
const VERIFIED_JWT_SECRET: string = JWT_SECRET;

export interface JWTPayload {
  userId: string;
  userTier: string;
  sessionId: string;
  type?: string;
  iat?: number;
  exp?: number;
}

// Import FastifyRequest directly - user property is augmented via fastify.d.ts
export type AuthenticatedRequest<T = any> = FastifyRequest<{ Body: T }>;

class AuthService {
  // Generate JWT token pair
  static generateTokens(userId: string, userTier: string, sessionId: string) {
    const payload: JWTPayload = {
      userId,
      userTier,
      sessionId
    };

    const accessToken = jwt.sign(payload, VERIFIED_JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
      issuer: 'virtualsol.fun',
      audience: 'virtualsol.fun'
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId, sessionId, type: 'refresh' },
      VERIFIED_JWT_SECRET, 
      {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        issuer: 'virtualsol.fun',
        audience: 'virtualsol.fun'
      } as jwt.SignOptions
    );

    return { accessToken, refreshToken };
  }

  // Verify JWT token
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, VERIFIED_JWT_SECRET, {
        issuer: 'virtualsol.fun',
        audience: 'virtualsol.fun'
      }) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Create session in Redis
  static async createSession(userId: string, userTier: string, metadata?: any) {
    const sessionId = `session_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionData = {
      userId,
      userTier,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      ...metadata
    };

    // Store session in Redis with 7 day expiry
    await redis.setex(`session:${sessionId}`, 7 * 24 * 60 * 60, JSON.stringify(sessionData));
    
    return sessionId;
  }

  // Validate session exists and is active
  static async validateSession(sessionId: string): Promise<boolean> {
    const sessionData = await redis.get(`session:${sessionId}`);
    if (!sessionData) return false;

    // Update last activity
    const session = JSON.parse(sessionData);
    session.lastActivity = new Date().toISOString();
    await redis.setex(`session:${sessionId}`, 7 * 24 * 60 * 60, JSON.stringify(session));
    
    return true;
  }

  // Invalidate session
  static async invalidateSession(sessionId: string): Promise<void> {
    await redis.del(`session:${sessionId}`);
  }

  // Invalidate all user sessions
  static async invalidateAllUserSessions(userId: string): Promise<void> {
    const pattern = `session:session_${userId}_*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  }
}

// Authentication middleware
export const authenticateToken = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return reply.code(401).send({ 
        error: 'UNAUTHORIZED', 
        message: 'Access token required' 
      });
    }

    // Verify JWT
    const payload = AuthService.verifyToken(token);
    
    // Validate session exists in Redis
    const isValidSession = await AuthService.validateSession(payload.sessionId);
    if (!isValidSession) {
      return reply.code(401).send({ 
        error: 'SESSION_EXPIRED', 
        message: 'Session has expired' 
      });
    }

    // Validate user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, userTier: true, email: true }
    });

    if (!user) {
      await AuthService.invalidateSession(payload.sessionId);
      return reply.code(401).send({ 
        error: 'USER_NOT_FOUND', 
        message: 'User account not found' 
      });
    }

    // Attach user info to request
    request.user = {
      id: payload.userId,
      userTier: payload.userTier,
      sessionId: payload.sessionId
    };

  } catch (error: any) {
    return reply.code(401).send({ 
      error: 'INVALID_TOKEN', 
      message: error.message || 'Invalid authentication token' 
    });
  }
};

// Optional authentication (for endpoints that work with or without auth)
export const optionalAuthentication = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return; // No token provided, continue without authentication
    }

    // Try to authenticate, but don't fail if token is invalid
    const payload = AuthService.verifyToken(token);
    const isValidSession = await AuthService.validateSession(payload.sessionId);
    
    if (isValidSession) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, userTier: true }
      });

      if (user) {
        request.user = {
          id: payload.userId,
          userTier: payload.userTier,
          sessionId: payload.sessionId
        };
      }
    }
  } catch (error) {
    // Silently fail for optional authentication
    console.warn('Optional authentication failed:', error);
  }
};

// Admin-only middleware
export const requireAdmin = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  if (!request.user) {
    return reply.code(401).send({ 
      error: 'UNAUTHORIZED', 
      message: 'Authentication required' 
    });
  }

  if (request.user.userTier !== 'ADMINISTRATOR') {
    return reply.code(403).send({ 
      error: 'FORBIDDEN', 
      message: 'Administrator access required' 
    });
  }
};

// Admin or Moderator middleware (for moderation features)
export const requireAdminOrModerator = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  if (!request.user) {
    return reply.code(401).send({ 
      error: 'UNAUTHORIZED', 
      message: 'Authentication required' 
    });
  }

  if (request.user.userTier !== 'ADMINISTRATOR' && request.user.userTier !== 'MODERATOR') {
    return reply.code(403).send({ 
      error: 'FORBIDDEN', 
      message: 'Administrator or Moderator access required' 
    });
  }
};

export { AuthService };