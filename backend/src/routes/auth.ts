import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import prisma from "../plugins/prisma.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nacl from "tweetnacl";
import bs58 from "bs58";
import redis from "../plugins/redis.js";
import { getWalletBalances } from "../services/walletService.js";
import { AuthService, authenticateToken, type AuthenticatedRequest } from "../plugins/auth.js";
import { validateBody, authSchemas, sanitizeInput } from "../plugins/validation.js";
import { authRateLimit, walletRateLimit, sensitiveRateLimit } from "../plugins/rateLimiting.js";
import { NonceService } from "../plugins/nonce.js";
import { EmailService } from "../services/emailService.js";
import * as notificationService from "../services/notificationService.js";

// Check if wallet holds SIM tokens and upgrade balance
async function checkAndUpgradeSIMHolder(userId: string, walletAddress: string) {
  try {
    const balances = await getWalletBalances(walletAddress);
    const simBalance = balances.find((token: any) => 
      token.mint === process.env.SIM_TOKEN_MINT && token.uiAmount > 0
    );
    
    if (simBalance) {
      // Upgrade to 100 vSOL for SIM holders
      await prisma.user.update({
        where: { id: userId },
        data: { virtualSolBalance: 100 }
      });
      console.log(`🎯 Upgraded SIM holder ${walletAddress} to 100 vSOL`);
    }
  } catch (error) {
    console.warn("Failed to check SIM holdings:", error);
  }
}

export default async function (app: FastifyInstance) {
  // Email signup with validation and rate limiting
  app.post("/signup-email", {
    preHandler: [authRateLimit, validateBody(authSchemas.emailSignup)]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        email: string;
        password: string;
        handle?: string;
        profileImage?: string;
      };

      const { email, password, handle, profileImage } = sanitizedBody;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } });
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

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username: email.split('@')[0],
          passwordHash: hash,
          handle: handle || null,
          profileImage: profileImage || null,
          virtualSolBalance: 10,
          userTier: 'EMAIL_USER',
          emailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry
        }
      });

      // Send verification email (non-blocking)
      EmailService.sendVerificationEmail(email, verificationToken, user.username).catch(error => {
        console.error('Failed to send verification email:', error);
      });

      // Send welcome notification (non-blocking)
      notificationService.notifyWelcome(user.id, user.username).catch(error => {
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
      console.error('Signup error:', error);
      return reply.code(500).send({ 
        error: "SIGNUP_FAILED", 
        message: "Failed to create account" 
      });
    }
  });

  // Email login with validation and rate limiting
  app.post("/login-email", {
    preHandler: [authRateLimit, validateBody(authSchemas.emailLogin)]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        email: string;
        password: string;
      };

      const { email, password } = sanitizedBody;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        return reply.code(401).send({ 
          error: "INVALID_CREDENTIALS", 
          message: "Invalid email or password" 
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return reply.code(401).send({ 
          error: "INVALID_CREDENTIALS", 
          message: "Invalid email or password" 
        });
      }

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

  // Wallet nonce generation with secure TTL
  app.post("/wallet/nonce", {
    preHandler: [walletRateLimit, validateBody(authSchemas.walletNonce)]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        walletAddress: string;
      };

      const { walletAddress } = sanitizedBody;

      // Generate secure nonce with Redis TTL
      const nonce = await NonceService.generateNonce(walletAddress);

      // Create or update user record
      const walletUser = await prisma.user.upsert({
        where: { walletAddress },
        update: {
          walletNonce: null // Don't store nonce in DB anymore, only in Redis
        },
        create: {
          email: `${walletAddress.slice(0, 8)}@wallet.solsim.fun`,
          username: walletAddress.slice(0, 16),
          passwordHash: '',
          walletAddress,
          walletNonce: null,
          virtualSolBalance: 10,
          userTier: 'WALLET_USER'
        }
      });

      // Send welcome notification for new wallet users (non-blocking)
      // Check if this is a new user by checking if they just got created
      const isNewUser = await prisma.user.count({ where: { walletAddress } }) === 1;
      if (isNewUser) {
        notificationService.notifyWelcome(walletUser.id, walletUser.username).catch(error => {
          console.error('Failed to send welcome notification:', error);
        });
      }

      // Create Sign-In With Solana message
      const message = NonceService.createSIWSMessage(walletAddress, nonce);

      return { 
        nonce,
        message,
        expiresIn: 300 // 5 minutes
      };

    } catch (error: any) {
      console.error('Nonce generation error:', error);
      
      if (error.message.includes('Too many nonce requests')) {
        return reply.code(429).send({ 
          error: "RATE_LIMIT_EXCEEDED", 
          message: error.message 
        });
      }

      return reply.code(500).send({ 
        error: "NONCE_GENERATION_FAILED", 
        message: "Failed to generate authentication nonce" 
      });
    }
  });

  // Wallet signature verification with secure nonce validation
  app.post("/wallet/verify", {
    preHandler: [walletRateLimit, validateBody(authSchemas.walletVerify)]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        walletAddress: string;
        signature: string;
      };

      const { walletAddress, signature } = sanitizedBody;

      const user = await prisma.user.findUnique({ where: { walletAddress } });
      if (!user) {
        return reply.code(400).send({ 
          error: "USER_NOT_FOUND", 
          message: "Wallet not found. Please request a new nonce." 
        });
      }

      // Verify nonce exists and is valid
      const hasValidNonce = await NonceService.hasValidNonce(walletAddress);
      if (!hasValidNonce) {
        return reply.code(400).send({ 
          error: "NONCE_EXPIRED", 
          message: "Authentication nonce has expired. Please request a new one." 
        });
      }

      // Get nonce from Redis for signature verification
      const storedNonce = await redis.get(`nonce:${walletAddress}`);
      if (!storedNonce) {
        return reply.code(400).send({ 
          error: "NONCE_MISSING", 
          message: "Authentication nonce not found" 
        });
      }

      // Create the message that was signed
      const message = NonceService.createSIWSMessage(walletAddress, storedNonce);
      const messageBytes = new TextEncoder().encode(message);
      
      try {
        const sig = bs58.decode(signature);
        const pub = bs58.decode(walletAddress);

        const isValidSignature = nacl.sign.detached.verify(messageBytes, sig, pub);
        if (!isValidSignature) {
          return reply.code(401).send({ 
            error: "INVALID_SIGNATURE", 
            message: "Invalid wallet signature" 
          });
        }
      } catch (sigError) {
        return reply.code(401).send({ 
          error: "SIGNATURE_DECODE_ERROR", 
          message: "Failed to decode signature" 
        });
      }

      // Verify and consume nonce
      const isNonceValid = await NonceService.verifyAndConsumeNonce(walletAddress, storedNonce);
      if (!isNonceValid) {
        return reply.code(401).send({ 
          error: "NONCE_VERIFICATION_FAILED", 
          message: "Nonce verification failed" 
        });
      }

      // Check SIM token holding and upgrade balance if eligible
      await checkAndUpgradeSIMHolder(user.id, walletAddress);

      // Fetch updated user data
      const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
      if (!updatedUser) {
        return reply.code(500).send({ 
          error: "USER_UPDATE_FAILED", 
          message: "Failed to update user data" 
        });
      }

      // Create session and generate tokens
      const sessionId = await AuthService.createSession(updatedUser.id, updatedUser.userTier, {
        loginMethod: 'wallet',
        walletAddress,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });

      const { accessToken, refreshToken } = AuthService.generateTokens(
        updatedUser.id, 
        updatedUser.userTier, 
        sessionId
      );

      console.log(`✅ Wallet authenticated: ${walletAddress.slice(0, 8)}... (${updatedUser.id})`);

      return { 
        userId: updatedUser.id,
        accessToken,
        refreshToken,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          userTier: updatedUser.userTier,
          virtualSolBalance: updatedUser.virtualSolBalance.toString(),
          walletAddress: updatedUser.walletAddress
        }
      };

    } catch (error: any) {
      console.error('Wallet verification error:', error);
      return reply.code(500).send({ 
        error: "WALLET_VERIFICATION_FAILED", 
        message: "Failed to verify wallet signature" 
      });
    }
  });

  // Refresh token endpoint
  app.post("/refresh-token", {
    preHandler: [validateBody(authSchemas.refreshToken)]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { refreshToken } = req.body as { refreshToken: string };

      // Verify refresh token
      const payload = AuthService.verifyToken(refreshToken) as any;
      
      if (!payload.type || payload.type !== 'refresh') {
        return reply.code(401).send({
          error: "INVALID_REFRESH_TOKEN",
          message: "Invalid refresh token"
        });
      }

      // Validate session exists
      const isValidSession = await AuthService.validateSession(payload.sessionId);
      if (!isValidSession) {
        return reply.code(401).send({
          error: "SESSION_EXPIRED",
          message: "Session has expired"
        });
      }

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, userTier: true }
      });

      if (!user) {
        await AuthService.invalidateSession(payload.sessionId);
        return reply.code(401).send({
          error: "USER_NOT_FOUND",
          message: "User not found"
        });
      }

      // Generate new access token
      const { accessToken } = AuthService.generateTokens(user.id, user.userTier, payload.sessionId);

      return { accessToken };

    } catch (error: any) {
      return reply.code(401).send({
        error: "REFRESH_FAILED",
        message: "Failed to refresh token"
      });
    }
  });

  // Logout endpoint
  app.post("/logout", {
    preHandler: [authenticateToken]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      if (req.user?.sessionId) {
        await AuthService.invalidateSession(req.user.sessionId);
      }

      return { success: true, message: "Logged out successfully" };
    } catch (error: any) {
      return reply.code(500).send({
        error: "LOGOUT_FAILED",
        message: "Failed to log out"
      });
    }
  });

  // Logout from all devices
  app.post("/logout-all", {
    preHandler: [authenticateToken]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      if (req.user?.id) {
        await AuthService.invalidateAllUserSessions(req.user.id);
      }

      return { success: true, message: "Logged out from all devices" };
    } catch (error: any) {
      return reply.code(500).send({
        error: "LOGOUT_ALL_FAILED",
        message: "Failed to log out from all devices"
      });
    }
  });

  // Profile update with authentication and validation
  app.post("/profile", {
    preHandler: [authenticateToken, validateBody(authSchemas.profileUpdate)]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        userId: string;
        handle?: string;
        profileImage?: string;
        bio?: string;
        displayName?: string;
      };

      const { userId, handle, profileImage, bio, displayName } = sanitizedBody;

      // Verify user can only update their own profile
      if (req.user?.id !== userId) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "You can only update your own profile"
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { handle, profileImage, bio, displayName }
      });

      return { 
        success: true, 
        user: { 
          id: updatedUser.id, 
          handle: updatedUser.handle, 
          profileImage: updatedUser.profileImage, 
          bio: updatedUser.bio,
          displayName: updatedUser.displayName
        } 
      };
    } catch (error: any) {
      return reply.code(500).send({
        error: "PROFILE_UPDATE_FAILED",
        message: "Failed to update profile"
      });
    }
  });

  // Get user profile with optional authentication
  app.get("/user/:userId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { userId } = req.params as { userId: string };
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    if (!uuidRegex.test(userId)) {
      return reply.code(400).send({ 
        error: "INVALID_USER_ID", 
        message: "Invalid user ID format" 
      });
    }
    
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          bio: true,
          avatar: true,
          avatarUrl: true,
          twitter: true,
          discord: true,
          telegram: true,
          website: true,
          virtualSolBalance: true,
          userTier: true,
          walletAddress: true,
          handle: true,
          profileImage: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return reply.code(404).send({ 
          error: "USER_NOT_FOUND", 
          message: "User not found" 
        });
      }

      // Convert Decimal to string for JSON serialization
      const userResponse = {
        ...user,
        virtualSolBalance: user.virtualSolBalance.toString()
      };

      return userResponse;
    } catch (error: any) {
      console.error('Get user profile error:', error);
      return reply.code(500).send({ 
        error: "FETCH_USER_FAILED", 
        message: "Failed to fetch user profile" 
      });
    }
  });

  // Change password with authentication and validation
  app.post("/change-password", {
    preHandler: [authenticateToken, sensitiveRateLimit, validateBody(authSchemas.changePassword)]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      const sanitizedBody = sanitizeInput(req.body) as {
        userId: string;
        currentPassword: string;
        newPassword: string;
      };

      const { userId, currentPassword, newPassword } = sanitizedBody;

      // Verify user can only change their own password
      if (req.user?.id !== userId) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "You can only change your own password"
        });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      
      if (!user || !user.passwordHash) {
        return reply.code(404).send({ 
          error: "USER_NOT_FOUND", 
          message: "User not found or no password set" 
        });
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValid) {
        return reply.code(401).send({ 
          error: "INVALID_CURRENT_PASSWORD", 
          message: "Current password is incorrect" 
        });
      }

      // Hash new password with secure salt rounds
      const newHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash }
      });

      // Invalidate all existing sessions for security
      await AuthService.invalidateAllUserSessions(userId);

      console.log(`🔒 Password changed for user ${userId}`);

      return { 
        success: true, 
        message: "Password updated successfully. Please log in again." 
      };

    } catch (error: any) {
      console.error('Change password error:', error);
      return reply.code(500).send({ 
        error: "PASSWORD_CHANGE_FAILED", 
        message: "Failed to change password" 
      });
    }
  });

  // Update avatar with authentication
  app.post("/update-avatar", {
    preHandler: [authenticateToken]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      const { userId, avatarUrl } = req.body as {
        userId: string;
        avatarUrl: string;
      };

      if (!userId || !avatarUrl) {
        return reply.code(400).send({ 
          error: "MISSING_FIELDS", 
          message: "userId and avatarUrl required" 
        });
      }

      // Verify user can only update their own avatar
      if (req.user?.id !== userId) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "You can only update your own avatar"
        });
      }

      // Validate URL format (accept both http/https URLs and base64 data URLs)
      const isDataUrl = avatarUrl.startsWith('data:image/');
      const isHttpUrl = avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://');
      
      if (!isDataUrl && !isHttpUrl) {
        return reply.code(400).send({
          error: "INVALID_URL",
          message: "Avatar must be a valid URL or base64 data URL"
        });
      }
      
      // Validate http/https URLs
      if (isHttpUrl) {
        try {
          new URL(avatarUrl);
        } catch {
          return reply.code(400).send({
            error: "INVALID_URL",
            message: "Invalid avatar URL format"
          });
        }
      }
      
      // Validate base64 data URLs
      if (isDataUrl) {
        const validImageTypes = ['data:image/jpeg', 'data:image/jpg', 'data:image/png', 'data:image/webp', 'data:image/gif'];
        const isValidType = validImageTypes.some(type => avatarUrl.startsWith(type));
        
        if (!isValidType) {
          return reply.code(400).send({
            error: "INVALID_IMAGE_TYPE",
            message: "Only JPEG, PNG, WebP, and GIF images are allowed"
          });
        }
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data: { 
          avatarUrl: avatarUrl.slice(0, 2048), // Limit URL length
          avatar: avatarUrl.slice(0, 2048)
        }
      });

      return { 
        success: true, 
        avatarUrl: user.avatarUrl,
        message: "Avatar updated successfully" 
      };

    } catch (error: any) {
      console.error('Update avatar error:', error);
      return reply.code(500).send({ 
        error: "AVATAR_UPDATE_FAILED", 
        message: "Failed to update avatar" 
      });
    }
  });

  // Remove avatar with authentication
  app.post("/remove-avatar", {
    preHandler: [authenticateToken]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      const { userId } = req.body as { userId: string };

      if (!userId) {
        return reply.code(400).send({ 
          error: "MISSING_USER_ID", 
          message: "userId required" 
        });
      }

      // Verify user can only remove their own avatar
      if (req.user?.id !== userId) {
        return reply.code(403).send({
          error: "FORBIDDEN",
          message: "You can only remove your own avatar"
        });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { 
          avatarUrl: null,
          avatar: null
        }
      });

      return {
        success: true,
        message: "Avatar removed successfully"
      };

    } catch (error: any) {
      console.error('Remove avatar error:', error);
      return reply.code(500).send({
        error: "AVATAR_REMOVAL_FAILED",
        message: "Failed to remove avatar"
      });
    }
  });

  // Verify email with token
  app.get("/verify-email/:token", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = req.params as { token: string };

      if (!token || token.length < 32) {
        return reply.code(400).send({
          error: "INVALID_TOKEN",
          message: "Invalid verification token"
        });
      }

      // Find user by verification token
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpiry: {
            gte: new Date() // Token must not be expired
          }
        }
      });

      if (!user) {
        return reply.code(400).send({
          error: "INVALID_OR_EXPIRED_TOKEN",
          message: "Verification link is invalid or has expired"
        });
      }

      // Mark email as verified and clear token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null
        }
      });

      // Send welcome email (non-blocking)
      EmailService.sendWelcomeEmail(user.email, user.username).catch(error => {
        console.error('Failed to send welcome email:', error);
      });

      console.log(`✅ Email verified for user: ${user.email} (${user.id})`);

      return {
        success: true,
        message: "Email verified successfully!",
        user: {
          id: user.id,
          email: user.email,
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
    preHandler: [authenticateToken, authRateLimit]
  }, async (req: AuthenticatedRequest, reply) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return reply.code(401).send({
          error: "UNAUTHORIZED",
          message: "Authentication required"
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return reply.code(404).send({
          error: "USER_NOT_FOUND",
          message: "User not found"
        });
      }

      if (user.emailVerified) {
        return reply.code(400).send({
          error: "ALREADY_VERIFIED",
          message: "Email is already verified"
        });
      }

      // Generate new verification token
      const verificationToken = EmailService.generateToken();
      const verificationExpiry = EmailService.generateTokenExpiry(24);

      // Update user with new token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry
        }
      });

      // Send verification email
      const emailSent = await EmailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.username
      );

      if (!emailSent) {
        return reply.code(500).send({
          error: "EMAIL_SEND_FAILED",
          message: "Failed to send verification email"
        });
      }

      console.log(`✅ Verification email resent to: ${user.email} (${user.id})`);

      return {
        success: true,
        message: "Verification email sent successfully"
      };

    } catch (error: any) {
      console.error('Resend verification error:', error);
      return reply.code(500).send({
        error: "RESEND_FAILED",
        message: "Failed to resend verification email"
      });
    }
  });

  // Request password reset
  app.post("/forgot-password", {
    preHandler: [authRateLimit]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email } = req.body as { email: string };

      if (!email) {
        return reply.code(400).send({
          error: "MISSING_EMAIL",
          message: "Email is required"
        });
      }

      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email }
      });

      // Always return success to prevent email enumeration
      if (!user || !user.passwordHash) {
        console.log(`Password reset requested for non-existent/wallet user: ${email}`);
        return {
          success: true,
          message: "If an account exists with this email, you will receive password reset instructions"
        };
      }

      // Generate password reset token
      const resetToken = EmailService.generateToken();
      const resetExpiry = EmailService.generateTokenExpiry(1); // 1 hour expiry

      // Update user with reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetExpiry: resetExpiry
        }
      });

      // Send password reset email
      await EmailService.sendPasswordResetEmail(user.email, resetToken, user.username);

      console.log(`✅ Password reset email sent to: ${email} (${user.id})`);

      return {
        success: true,
        message: "If an account exists with this email, you will receive password reset instructions"
      };

    } catch (error: any) {
      console.error('Forgot password error:', error);
      // Don't reveal error details to prevent email enumeration
      return {
        success: true,
        message: "If an account exists with this email, you will receive password reset instructions"
      };
    }
  });

  // Reset password with token
  app.post("/reset-password", {
    preHandler: [authRateLimit]
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token, newPassword } = req.body as { token: string; newPassword: string };

      if (!token || !newPassword) {
        return reply.code(400).send({
          error: "MISSING_FIELDS",
          message: "Token and new password are required"
        });
      }

      if (newPassword.length < 8) {
        return reply.code(400).send({
          error: "WEAK_PASSWORD",
          message: "Password must be at least 8 characters long"
        });
      }

      // Find user by reset token
      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpiry: {
            gte: new Date() // Token must not be expired
          }
        }
      });

      if (!user) {
        return reply.code(400).send({
          error: "INVALID_OR_EXPIRED_TOKEN",
          message: "Password reset link is invalid or has expired"
        });
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 12);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          passwordResetToken: null,
          passwordResetExpiry: null
        }
      });

      // Invalidate all existing sessions for security
      await AuthService.invalidateAllUserSessions(user.id);

      console.log(`✅ Password reset successful for user: ${user.email} (${user.id})`);

      return {
        success: true,
        message: "Password reset successfully. Please log in with your new password."
      };

    } catch (error: any) {
      console.error('Reset password error:', error);
      return reply.code(500).send({
        error: "RESET_FAILED",
        message: "Failed to reset password"
      });
    }
  });
}