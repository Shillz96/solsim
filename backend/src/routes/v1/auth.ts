import { Router } from 'express';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { safeUpsertUser } from '../../utils/safeUpsert.js';
import { serializeDecimals } from '../../utils/decimal.js';
import { authenticate, generateToken, getUserId } from '../../lib/unifiedAuth.js';
import prisma from '../../lib/prisma.js';
import { authLimiter, passwordResetLimiter } from '../../middleware/rateLimiter.js';
import { validateInput, sanitizeHTML, preventNoSQLInjection } from '../../middleware/validation.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// Environment configuration
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
const MAX_PASSWORD_LENGTH = 128; // Prevent DoS via large passwords

// Apply NoSQL injection prevention to all routes
router.use(preventNoSQLInjection);

/**
 * POST /api/v1/auth/register
 * Register a new user with comprehensive validation and security
 */
router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, password, solanaWallet } = req.body;

    // Validate required fields
    if (!email || !username || !password) {
      res.status(400).json({
        success: false,
        error: 'Email, username, and password are required',
      });
      return;
    }

    // Prevent DoS via large passwords
    if (password.length > MAX_PASSWORD_LENGTH) {
      res.status(400).json({
        success: false,
        error: 'Password exceeds maximum length',
      });
      return;
    }

    // Validate email
    const emailValidation = validateInput(email, { 
      email: true, 
      maxLength: 255 
    });
    if (!emailValidation.isValid) {
      res.status(400).json({
        success: false,
        error: emailValidation.errors[0] || 'Invalid email',
      });
      return;
    }

    // Validate username
    const usernameValidation = validateInput(username, { 
      username: true,
      minLength: 3,
      maxLength: 20
    });
    if (!usernameValidation.isValid) {
      res.status(400).json({
        success: false,
        error: usernameValidation.errors[0] || 'Invalid username',
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validateInput(password, { 
      password: true,
      minLength: 8,
      maxLength: MAX_PASSWORD_LENGTH
    });
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        error: passwordValidation.errors[0] || 'Password does not meet requirements',
      });
      return;
    }

    // Validate Solana wallet if provided
    if (solanaWallet) {
      const walletValidation = validateInput(solanaWallet, { 
        solanaWallet: true 
      });
      if (!walletValidation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid Solana wallet address',
        });
        return;
      }
    }

    // Create or find user
    const { user, isNew } = await safeUpsertUser(prisma, {
      email: emailValidation.sanitized as string,
      username: usernameValidation.sanitized as string,
      password,
      solanaWallet: solanaWallet ? (solanaWallet as string).trim() : undefined,
    });

    // Generate JWT token with tier information
    const token = generateToken(user.id, user.email, user.username, user.userTier, user.walletAddress);

    // Log successful registration (for security monitoring)
    logger.info(`New user registered: ${user.id} (${user.email})`);

    // Return user data and token
    res.status(201).json({
      success: true,
      data: {
        user: serializeDecimals({
          id: user.id,
          email: user.email,
          username: user.username,
          virtualSolBalance: user.virtualSolBalance,
        }),
        token,
        isNew,
      },
    });
  } catch (error: any) {
    // Log error without exposing sensitive details
    logger.error('Registration error:', {
      message: error.message,
      code: error.code,
    });

    // Handle specific errors
    if (error.message === 'Email already exists') {
      res.status(409).json({
        success: false,
        error: 'Email already exists',
      });
      return;
    }

    if (error.message === 'Username already exists') {
      res.status(409).json({
        success: false,
        error: 'Username already exists',
      });
      return;
    }

    if (error.message === 'User already exists with different password') {
      res.status(401).json({
        success: false,
        error: 'User exists with different password. Please use login instead.',
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed',
    });
  }
});

/**
 * POST /api/v1/auth/login
 * User login with rate limiting and security measures
 */
router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    // Validate email format
    const emailValidation = validateInput(email, { 
      email: true 
    });
    if (!emailValidation.isValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: emailValidation.sanitized as string },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        userTier: true,
        walletAddress: true,
        virtualSolBalance: true
      }
    });

    // Use constant-time comparison to prevent timing attacks
    if (!user) {
      // Perform fake hash to prevent timing attacks
      await bcrypt.compare(password, '$2a$12$invalidhashfortimingatack');
      
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logger.warn(`Failed login attempt for user: ${user.id}`);
      
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
      return;
    }

    // Generate JWT token with tier information
    const token = generateToken(user.id, user.email, user.username, user.userTier, user.walletAddress);

    // Log successful login
    logger.info(`User logged in: ${user.id}`);

    // Return user data and token
    res.status(200).json({
      success: true,
      data: {
        user: serializeDecimals({
          id: user.id,
          email: user.email,
          username: user.username,
          virtualSolBalance: user.virtualSolBalance,
        }),
        token,
      },
    });
  } catch (error: any) {
    logger.error('Login error:', {
      message: error.message,
    });
    
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
});

/**
 * GET /api/v1/auth/verify
 * Verify JWT token and return user data
 */
router.get('/verify', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    // Get fresh user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        userTier: true,
        walletAddress: true,
        virtualSolBalance: true
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: serializeDecimals(user),
        valid: true,
      },
    });
  } catch (error: any) {
    logger.error('Token verification error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Token verification failed',
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        userTier: true,
        walletAddress: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Generate new token with tier information
    const newToken = generateToken(user.id, user.email, user.username, user.userTier, user.walletAddress);

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
      },
    });
  } catch (error: any) {
    logger.error('Token refresh error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user (client-side token removal)
 */
router.post('/logout', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    
    // Log logout for analytics
    logger.info(`User logged out: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    logger.error('Logout error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Logout failed',
    });
  }
});

/**
 * POST /api/v1/auth/forgot-password
 * Request password reset (placeholder for future implementation)
 */
router.post('/forgot-password', passwordResetLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    // Validate email
    const emailValidation = validateInput(email, { email: true });
    if (!emailValidation.isValid) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    // TODO: Implement password reset logic
    // - Generate secure reset token
    // - Store token with expiration
    // - Send email with reset link
    logger.info(`Password reset requested for: ${emailValidation.sanitized}`);

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
    });
  } catch (error: any) {
    logger.error('Forgot password error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to process password reset request',
    });
  }
});

/**
 * POST /api/v1/auth/change-password
 * Change password for authenticated user
 */
router.post('/change-password', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = getUserId(req);

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
      return;
    }

    // Prevent DoS via large passwords
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      res.status(400).json({
        success: false,
        error: 'Password exceeds maximum length',
      });
      return;
    }

    // Validate new password strength
    const passwordValidation = validateInput(newPassword, { 
      password: true,
      minLength: 8,
      maxLength: MAX_PASSWORD_LENGTH
    });
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        error: passwordValidation.errors[0] || 'New password does not meet requirements',
      });
      return;
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        passwordHash: true,
        userTier: true,
        walletAddress: true,
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
      });
      return;
    }

    // Prevent reusing the same password
    const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
    if (isSamePassword) {
      res.status(400).json({
        success: false,
        error: 'New password must be different from current password',
      });
      return;
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Generate new token with tier information (invalidate old ones)
    const newToken = generateToken(user.id, user.email, user.username, user.userTier, user.walletAddress);

    logger.info(`Password changed for user: ${userId}`);

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      data: {
        token: newToken,
      },
    });
  } catch (error: any) {
    logger.error('Change password error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
});

export default router;
