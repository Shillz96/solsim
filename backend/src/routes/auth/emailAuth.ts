/**
 * Email Authentication Routes
 *
 * Handles email-based authentication flows:
 * - Email signup with password
 * - Email login with brute force protection
 * - Email verification
 * - Resend verification email
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import authPrisma from "../../plugins/authPrisma.js"; // CRITICAL FIX: Use dedicated auth pool to prevent blocking
import bcrypt from "bcryptjs";
import redis from "../../plugins/redis.js";
import { AuthService, authenticateToken, type AuthenticatedRequest } from "../../plugins/auth.js";
import { validateBody, authSchemas, sanitizeInput } from "../../plugins/validation.js";
import { authRateLimit } from "../../plugins/rateLimiting.js";
import { EmailService } from "../../services/emailService.js";
import * as notificationService from "../../services/notificationService.js";
import { validatePasswordStrength, getPasswordErrorMessage } from "../../utils/password-validator.js";
import { getAuthConnectionStats } from "../../plugins/authPrisma.js";

// Helper function for retrying operations during high traffic
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isLastAttempt = attempt === maxRetries;
      const isConnectionError = error.code === 'P2024' || error.message?.includes('connection') || error.message?.includes('pool');

      if (isLastAttempt || !isConnectionError) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Signup attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`, {
        error: error.message,
        code: error.code
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

export default async function emailAuthRoutes(app: FastifyInstance) {
  // Email signup with validation
  app.post("/signup-email", {
    preHandler: [validateBody(authSchemas.emailSignup)]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        email: string;
        password: string;
        handle?: string;
        avatarUrl?: string;
        rewardWalletAddress?: string;
      };

      const { email, password, handle, avatarUrl, rewardWalletAddress } = sanitizedBody;

      // Validate password strength
      const passwordValidation = validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        return reply.code(400).send({
          error: "WEAK_PASSWORD",
          message: getPasswordErrorMessage(passwordValidation),
          details: passwordValidation.errors
        });
      }

      // Check if user already exists
      const existingUser = await authPrisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return reply.code(409).send({
          error: "USER_EXISTS",
          message: "An account with this email already exists"
        });
      }

      // Hash password with secure salt rounds
      const hash = await bcrypt.hash(password, 12);

      // Generate email verification token
      const verificationToken = EmailService.generateToken();
      const verificationExpiry = EmailService.generateTokenExpiry(24);

      // Create user with retry logic for high traffic resilience
      const user = await retryWithBackoff(async () => {
        return await authPrisma.user.create({
          data: {
            email,
            passwordHash: hash,
            handle: handle || email.split('@')[0],
            avatarUrl: avatarUrl || null,
            walletAddress: rewardWalletAddress || null,
            virtualSolBalance: 100,
            userTier: 'EMAIL_USER',
            emailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpiry: verificationExpiry
          }
        });
      });

      // Send verification email (non-blocking)
      EmailService.sendVerificationEmail(email, verificationToken, user.handle || email).catch(error => {
        console.error('Failed to send verification email:', error);
      });

      // Send welcome notification (non-blocking)
      notificationService.notifyWelcome(user.id, user.handle || email).catch(error => {
        console.error('Failed to send welcome notification:', error);
      });

      // Create session and generate tokens
      const sessionId = await AuthService.createSession(user.id, user.userTier, {
        signupMethod: 'email',
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      const { accessToken, refreshToken } = AuthService.generateTokens(user.id, user.userTier, sessionId);

      console.log(`✅ New user registered: ${email} (${user.id})`);

      return {
        userId: user.id,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          userTier: user.userTier,
          virtualSolBalance: user.virtualSolBalance.toString(),
          emailVerified: user.emailVerified
        }
      };

    } catch (error: any) {
      // Log detailed error with connection pool stats for debugging
      const poolStats = getAuthConnectionStats();
      console.error('🚨 Signup failed:', {
        error: error.message,
        code: error.code,
        stack: error.stack,
        authPoolStats: poolStats
      });

      // Provide user-friendly error message
      const isConnectionError = error.code === 'P2024' || error.message?.includes('connection') || error.message?.includes('pool');

      if (isConnectionError) {
        return reply.code(503).send({
          error: "HIGH_TRAFFIC",
          message: "Service experiencing high traffic. Please try again in a moment."
        });
      }

      return reply.code(500).send({
        error: "SIGNUP_FAILED",
        message: "Failed to create account. Please try again."
      });
    }
  });

  // Email login with brute force protection
  app.post("/login-email", {
    preHandler: [validateBody(authSchemas.emailLogin)]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        email: string;
        password: string;
      };

      const { email, password } = sanitizedBody;

      // Check for account lockout (protection against brute force)
      const lockoutKey = `lockout:${email}`;
      const failedAttemptsKey = `failed_attempts:${email}`;

      const isLockedOut = await redis.get(lockoutKey);
      if (isLockedOut) {
        const ttl = await redis.ttl(lockoutKey);
        return reply.code(429).send({
          error: "ACCOUNT_LOCKED",
          message: `Too many failed login attempts. Please try again in ${Math.ceil(ttl / 60)} minutes.`
        });
      }

      const user = await authPrisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        // Increment failed attempts even for non-existent users to prevent email enumeration timing attacks
        const attempts = await redis.incr(failedAttemptsKey);
        await redis.expire(failedAttemptsKey, 900); // 15 minutes

        if (attempts >= 5) {
          await redis.setex(lockoutKey, 900, '1'); // Lock for 15 minutes
          await redis.del(failedAttemptsKey);
        }

        return reply.code(401).send({
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password"
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        // Track failed login attempts
        const attempts = await redis.incr(failedAttemptsKey);
        await redis.expire(failedAttemptsKey, 900); // 15 minutes

        if (attempts >= 5) {
          await redis.setex(lockoutKey, 900, '1'); // Lock for 15 minutes
          await redis.del(failedAttemptsKey);
          console.log(`🔒 Account locked due to too many failed attempts: ${email}`);

          return reply.code(429).send({
            error: "ACCOUNT_LOCKED",
            message: "Too many failed login attempts. Your account has been locked for 15 minutes."
          });
        }

        return reply.code(401).send({
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password"
        });
      }

      // Clear failed attempts on successful login
      await redis.del(failedAttemptsKey);
      await redis.del(lockoutKey);

      // Create session and generate tokens
      const sessionId = await AuthService.createSession(user.id, user.userTier, {
        loginMethod: 'email',
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      const { accessToken, refreshToken } = AuthService.generateTokens(user.id, user.userTier, sessionId);

      console.log(`✅ User logged in: ${email} (${user.id})`);

      return {
        userId: user.id,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          userTier: user.userTier,
          virtualSolBalance: user.virtualSolBalance.toString(),
          emailVerified: user.emailVerified
        }
      };

    } catch (error: any) {
      console.error('Login error:', error);
      return reply.code(500).send({
        error: "LOGIN_FAILED",
        message: "Failed to log in"
      });
    }
  });

  // Verify email with token
  app.get("/verify-email/:token", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = req.params as { token: string };

      console.log(`🔍 Email verification attempt - Token: ${token.substring(0, 8)}...`);

      if (!token || token.length < 32) {
        console.warn(`❌ Invalid token format: length=${token?.length}`);
        return reply.code(400).send({
          error: "INVALID_TOKEN",
          message: "Invalid verification token format"
        });
      }

      // First, check if user exists with this token (ignore expiry for now)
      const userWithToken = await authPrisma.user.findFirst({
        where: {
          emailVerificationToken: token
        }
      });

      // If no user found with this token, it might have been used already
      if (!userWithToken) {
        console.warn(`❌ No user found with token ${token.substring(0, 8)}...`);

        return reply.code(400).send({
          error: "TOKEN_NOT_FOUND",
          message: "This verification link has already been used or is invalid. If you've already verified your email, you can log in directly."
        });
      }

      // Check if email is already verified
      if (userWithToken.emailVerified) {
        console.log(`✅ Email already verified for user: ${userWithToken.email} (${userWithToken.id})`);
        return {
          success: true,
          message: "Your email is already verified! You can log in.",
          user: {
            id: userWithToken.id,
            email: userWithToken.email,
            emailVerified: true
          }
        };
      }

      // Check if token is expired
      const now = new Date();
      const expiryTime = userWithToken.emailVerificationExpiry;

      if (!expiryTime || expiryTime < now) {
        const expiredAgo = expiryTime
          ? Math.floor((now.getTime() - expiryTime.getTime()) / 1000 / 60)
          : 'unknown';

        console.warn(
          `❌ Token expired for user: ${userWithToken.email} ` +
          `(expired ${expiredAgo} minutes ago, expiry: ${expiryTime?.toISOString()})`
        );

        return reply.code(400).send({
          error: "TOKEN_EXPIRED",
          message: "This verification link has expired. Please request a new verification email from your account settings."
        });
      }

      // Token is valid! Mark email as verified and clear token
      await authPrisma.user.update({
        where: { id: userWithToken.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null
        }
      });

      // Send welcome email (non-blocking)
      EmailService.sendWelcomeEmail(userWithToken.email, userWithToken.handle || userWithToken.email).catch(error => {
        console.error('Failed to send welcome email:', error);
      });

      console.log(`✅ Email verified for user: ${userWithToken.email} (${userWithToken.id})`);

      return {
        success: true,
        message: "Email verified successfully!",
        user: {
          id: userWithToken.id,
          email: userWithToken.email,
          emailVerified: true
        }
      };

    } catch (error: any) {
      console.error('Email verification error:', error);
      return reply.code(500).send({
        error: "VERIFICATION_FAILED",
        message: "Failed to verify email"
      });
    }
  });

  // Resend verification email
  app.post("/resend-verification", {
    preHandler: [authenticateToken, authRateLimit, validateBody(authSchemas.resendVerification)]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      const userId = req.user?.id;

      console.log(`📧 Resend verification requested for userId: ${userId}`);

      if (!userId) {
        console.warn('❌ Resend verification failed: No userId in token');
        return reply.code(401).send({
          error: "UNAUTHORIZED",
          message: "Authentication required"
        });
      }

      const user = await authPrisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          handle: true,
          emailVerified: true,
          emailVerificationToken: true,
          emailVerificationExpiry: true
        }
      });

      if (!user) {
        console.warn(`❌ Resend verification failed: User not found (userId: ${userId})`);
        return reply.code(404).send({
          error: "USER_NOT_FOUND",
          message: "User not found"
        });
      }

      if (user.emailVerified) {
        console.log(`⚠️  Resend verification skipped: Email already verified (${user.email})`);
        return reply.code(400).send({
          error: "ALREADY_VERIFIED",
          message: "Email is already verified"
        });
      }

      if (!user.email || user.email.includes('@wallet.virtualsol.fun')) {
        console.warn(`❌ Resend verification failed: Invalid email for wallet user (${user.email})`);
        return reply.code(400).send({
          error: "INVALID_EMAIL",
          message: "This account does not have a valid email address"
        });
      }

      // Generate new verification token
      const verificationToken = EmailService.generateToken();
      const verificationExpiry = EmailService.generateTokenExpiry(24);

      console.log(`🔄 Generating new verification token for: ${user.email}`);

      // Update user with new token
      await authPrisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry
        }
      });

      // Send verification email
      console.log(`📤 Attempting to send verification email to: ${user.email}`);

      const emailSent = await EmailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.handle || user.email
      );

      if (!emailSent) {
        console.error(`❌ Failed to send verification email to: ${user.email}`);
        return reply.code(500).send({
          error: "EMAIL_SEND_FAILED",
          message: "Failed to send verification email. Please try again later or contact support if the problem persists."
        });
      }

      console.log(`✅ Verification email resent successfully to: ${user.email} (${user.id})`);

      return {
        success: true,
        message: "Verification email sent successfully"
      };

    } catch (error: any) {
      console.error('❌ Resend verification error:', error);
      console.error('Error stack:', error.stack);
      return reply.code(500).send({
        error: "RESEND_FAILED",
        message: "Failed to resend verification email. Please try again later."
      });
    }
  });
}
