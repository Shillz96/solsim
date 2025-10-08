import { Router, Request, Response } from 'express';
import { authMiddleware, optionalAuthenticate, getUserId } from '../../lib/unifiedAuth.js';
import { apiLimiter, authLimiter, readLimiter, writeLimiter } from '../../middleware/rateLimiter.js';
import { validateURL } from '../../middleware/validation.js';
import { handleRouteError, ValidationError, NotFoundError, AuthorizationError, validateQueryParams } from '../../utils/errorHandler.js';
import { LIMITS, ERROR_MESSAGES, VALIDATION_PATTERNS } from '../../config/constants.js';
import { serializeDecimals } from '../../utils/decimal.js';
import { logger } from '../../utils/logger.js';
import prisma from '../../lib/prisma.js';
import { AuthenticatedRequest } from '../../shared/types/types.js';
import { avatarUpload, processAvatar, validateAvatarFile, deleteAvatarFile } from '../../middleware/upload.js';

const router = Router();

/**
 * Profile validation helper with comprehensive checks
 */
const validateProfileData = (data: any) => {
  const errors: string[] = [];

  if (data.displayName !== undefined) {
    if (typeof data.displayName !== 'string') {
      errors.push('Display name must be a string');
    } else if (data.displayName.length > LIMITS.PROFILE_DISPLAY_NAME_MAX) {
      errors.push(`Display name must be no more than ${LIMITS.PROFILE_DISPLAY_NAME_MAX} characters`);
    }
  }

  if (data.bio !== undefined) {
    if (typeof data.bio !== 'string') {
      errors.push('Bio must be a string');
    } else if (data.bio.length > LIMITS.PROFILE_BIO_MAX) {
      errors.push(`Bio must be no more than ${LIMITS.PROFILE_BIO_MAX} characters`);
    }
  }

  if (data.website !== undefined && data.website !== null && data.website !== '') {
    if (typeof data.website !== 'string') {
      errors.push('Website must be a string');
    } else if (!validateURL(data.website)) {
      errors.push('Website must be a valid HTTP/HTTPS URL');
    }
  }

  // Validate social handles
  const socialFields = ['twitter', 'discord', 'telegram'];
  for (const field of socialFields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      if (typeof data[field] !== 'string') {
        errors.push(`${field} handle must be a string`);
      } else if (!VALIDATION_PATTERNS.SOCIAL_HANDLE.test(data[field])) {
        errors.push(`${field} handle contains invalid characters`);
      } else if (data[field].length > LIMITS.PROFILE_HANDLE_MAX) {
        errors.push(`${field} handle must be no more than ${LIMITS.PROFILE_HANDLE_MAX} characters`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Clean and validate social media handles
 */
const validateAndCleanHandle = (handle: string): string | null => {
  if (!handle || typeof handle !== 'string') {
    return null;
  }

  // Remove @ prefix if present and trim
  const cleaned = handle.startsWith('@') ? handle.slice(1).trim() : handle.trim();
  
  if (!cleaned) return null;
  
  // Validate format
  if (!VALIDATION_PATTERNS.SOCIAL_HANDLE.test(cleaned)) {
    throw new ValidationError('Social handle contains invalid characters (only letters, numbers, underscores, and dashes allowed)');
  }

  return cleaned;
};

/**
 * GET /api/v1/user/profile/:userId?
 * Get user profile (own profile or specific user if public)
 * 
 * Params:
 * - userId: Optional user ID (if not provided, returns authenticated user's profile)
 * 
 * Rate Limit: 200 requests per minute (authenticated)
 * Auth: Required for own profile, optional for public profiles
 */
router.get('/profile/:userId?', optionalAuthenticate, readLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const targetUserId = req.params.userId;
    const requestingUserId = authReq.user?.id;

    // If no userId provided, require authentication and return own profile
    if (!targetUserId) {
      if (!requestingUserId) {
        throw new ValidationError(ERROR_MESSAGES.AUTH_REQUIRED);
      }
      
      const user = await prisma.user.findUnique({
        where: { id: requestingUserId },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          bio: true,
          twitter: true,
          discord: true,
          telegram: true,
          website: true,
          avatar: true,
          avatarUrl: true,
          isProfilePublic: true,
          virtualSolBalance: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      if (!user) {
        throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
      }

      res.json({ 
        success: true, 
        data: serializeDecimals(user),
        meta: { isOwnProfile: true }
      });
      return;
    }

    // Fetching someone else's profile
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        twitter: true,
        discord: true,
        telegram: true,
        website: true,
        avatar: true,
        avatarUrl: true,
        isProfilePublic: true,
        virtualSolBalance: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const isOwnProfile = requestingUserId === targetUserId;
    
    // Check if profile is accessible
    if (!isOwnProfile && !user.isProfilePublic) {
      throw new AuthorizationError('Profile is private');
    }

    // Remove sensitive data for non-own profiles
    const responseData = isOwnProfile ? user : {
      ...user,
      email: undefined, // Hide email from other users
      virtualSolBalance: user.isProfilePublic ? user.virtualSolBalance : undefined
    };

    res.json({ 
      success: true, 
      data: serializeDecimals(responseData),
      meta: { 
        isOwnProfile,
        isPublic: user.isProfilePublic
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting user profile');
  }
});

/**
 * PUT /api/v1/user/profile
 * Update user profile information
 * 
 * Body:
 * - displayName: Display name (optional, max 50 chars)
 * - bio: User bio (optional, max 500 chars)
 * - website: Website URL (optional, valid HTTP/HTTPS)
 * - twitter: Twitter handle (optional, alphanumeric + underscore/dash)
 * - discord: Discord handle (optional, alphanumeric + underscore/dash)
 * - telegram: Telegram handle (optional, alphanumeric + underscore/dash)
 * - avatarUrl: Avatar image URL (optional, valid HTTP/HTTPS image)
 * - isProfilePublic: Profile visibility (optional, boolean)
 * 
 * Rate Limit: 30 requests per minute (write operations)
 * Auth: Required
 */
router.put('/profile', authMiddleware, writeLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { displayName, bio, twitter, discord, telegram, website, isProfilePublic, avatarUrl } = req.body;

    // Validate input data
    const validation = validateProfileData(req.body);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    // Validate avatar URL if provided
    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim()) {
      if (!validateURL(avatarUrl)) {
        throw new ValidationError('Avatar URL must be a valid HTTP/HTTPS URL');
      }
      
      // Check if URL points to an image
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasImageExtension = imageExtensions.some(ext => 
        avatarUrl.toLowerCase().includes(ext)
      );
      
      if (!hasImageExtension) {
        throw new ValidationError('Avatar URL must point to an image (jpg, jpeg, png, gif, webp)');
      }
    }

    // Build update data object
    const updateData: any = {};
    
    if (displayName !== undefined) updateData.displayName = displayName || null;
    if (bio !== undefined) updateData.bio = bio || null;
    if (website !== undefined) updateData.website = website ? website.trim() : null;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl ? avatarUrl.trim() : null;
    if (isProfilePublic !== undefined) updateData.isProfilePublic = Boolean(isProfilePublic);
    
    // Handle social media handles
    if (twitter !== undefined) updateData.twitter = validateAndCleanHandle(twitter);
    if (discord !== undefined) updateData.discord = validateAndCleanHandle(discord);
    if (telegram !== undefined) updateData.telegram = validateAndCleanHandle(telegram);
    
    updateData.updatedAt = new Date();

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        twitter: true,
        discord: true,
        telegram: true,
        website: true,
        avatar: true,
        avatarUrl: true,
        isProfilePublic: true,
        virtualSolBalance: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    logger.info(`User ${userId} updated profile`);

    res.json({ 
      success: true, 
      data: serializeDecimals(updatedUser),
      message: 'Profile updated successfully'
    });
  } catch (error) {
    handleRouteError(error, res, 'Updating user profile');
  }
});

/**
 * GET /api/v1/user/balance
 * Get user's SOL balance
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required
 */
router.get('/balance', authMiddleware, apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        virtualSolBalance: true,
      }
    });

    if (!user) {
      // Critical error - authenticated user should exist
      logger.error(`Authenticated user not found in database: ${userId}`);
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    res.json({ 
      success: true, 
      data: {
        balance: parseFloat(user.virtualSolBalance.toString()),
        currency: 'SOL',
        timestamp: Date.now()
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting user balance');
  }
});

/**
 * GET /api/v1/user/public/:userId
 * Get public user profile (anyone can access if profile is public)
 * 
 * Params:
 * - userId: User ID (required)
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Not required
 */
router.get('/public/:userId', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = validateQueryParams(req.params, {
      userId: { type: 'string', required: true }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        twitter: true,
        discord: true,
        telegram: true,
        website: true,
        avatar: true,
        avatarUrl: true,
        isProfilePublic: true,
        createdAt: true,
      }
    });

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    if (!user.isProfilePublic) {
      throw new AuthorizationError('Profile is private');
    }

    res.json({ 
      success: true, 
      data: serializeDecimals(user),
      meta: { isPublic: true }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting public user profile');
  }
});

/**
 * GET /api/v1/user/settings
 * Get user settings (authenticated user only)
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required
 */
router.get('/settings', authMiddleware, apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        twitter: true,
        discord: true,
        telegram: true,
        website: true,
        avatar: true,
        avatarUrl: true,
        isProfilePublic: true,
        virtualSolBalance: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    res.json({ 
      success: true, 
      data: serializeDecimals(user)
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting user settings');
  }
});

/**
 * DELETE /api/v1/user/account
 * Delete user account with confirmation
 * 
 * Body:
 * - password: Current password for confirmation (required)
 * - confirmDelete: Must be exactly "DELETE MY ACCOUNT" (required)
 * 
 * Rate Limit: 5 requests per hour (strict limit for security)
 * Auth: Required
 */
router.delete('/account', authMiddleware, authLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const { password, confirmDelete } = req.body;

    // Validate confirmation
    if (!password || typeof password !== 'string') {
      throw new ValidationError('Current password is required for account deletion');
    }

    if (confirmDelete !== 'DELETE MY ACCOUNT') {
      throw new ValidationError('Must confirm deletion by typing "DELETE MY ACCOUNT"');
    }

    // Verify password before deletion
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, email: true }
    });

    if (!user) {
      throw new NotFoundError(ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const bcrypt = await import('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      throw new ValidationError('Invalid password');
    }

    // Delete all user data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete holdings first (foreign key constraint)
      await tx.holding.deleteMany({ where: { userId } });
      
      // Delete trades
      await tx.trade.deleteMany({ where: { userId } });
      
      // Delete user
      await tx.user.delete({ where: { id: userId } });
    });

    logger.warn(`User account deleted: ${user.email} (${userId})`);

    res.json({ 
      success: true, 
      message: 'Account deleted successfully' 
    });
  } catch (error) {
    handleRouteError(error, res, 'Deleting user account');
  }
});

/**
 * POST /api/v1/user/avatar
 * Upload and set user avatar image
 * 
 * Accepts multipart/form-data with 'avatar' file field
 * - Max file size: 5MB
 * - Supported formats: JPEG, PNG, GIF, WebP
 * - Auto-resizes to 300x300px
 * - Optimizes file size
 * - Replaces existing avatar
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required
 */
router.post('/avatar', authMiddleware, apiLimiter, avatarUpload.single('avatar'), async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const file = req.file;

    // Validate uploaded file
    validateAvatarFile(file!);

    // Get current user to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true }
    });

    if (!currentUser) {
      throw new NotFoundError('User not found');
    }

    // Process and save the new avatar
    const avatarPath = await processAvatar(file!.buffer, userId, file!.originalname);

    // Update user with new avatar path
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { 
        avatar: avatarPath,
        avatarUrl: null // Clear external avatar URL when uploading file
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        twitter: true,
        discord: true,
        telegram: true,
        website: true,
        avatar: true,
        avatarUrl: true,
        isProfilePublic: true,
        virtualSolBalance: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Delete old avatar file if it exists
    if (currentUser.avatar && currentUser.avatar !== avatarPath) {
      await deleteAvatarFile(currentUser.avatar);
    }

    // Serialize decimal fields
    const serializedUser = {
      ...updatedUser,
      virtualSolBalance: serializeDecimals(updatedUser.virtualSolBalance)
    };

    res.json({
      success: true,
      data: serializedUser,
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {
    handleRouteError(error, res, 'Avatar upload');
  }
});

/**
 * DELETE /api/v1/user/avatar
 * Remove user avatar
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required
 */
router.delete('/avatar', authMiddleware, apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);

    // Get current user to check for existing avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true }
    });

    if (!currentUser) {
      throw new NotFoundError('User not found');
    }

    // Update user to remove avatar
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        avatar: null,
        avatarUrl: null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        twitter: true,
        discord: true,
        telegram: true,
        website: true,
        avatar: true,
        avatarUrl: true,
        isProfilePublic: true,
        virtualSolBalance: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Delete the old avatar file if it exists
    if (currentUser.avatar) {
      await deleteAvatarFile(currentUser.avatar);
    }

    logger.info(`User ${userId} removed avatar`);

    // Serialize decimal fields
    const serializedUser = {
      ...updatedUser,
      virtualSolBalance: serializeDecimals(updatedUser.virtualSolBalance)
    };

    res.json({ 
      success: true, 
      data: serializedUser,
      message: 'Avatar removed successfully'
    });
  } catch (error) {
    handleRouteError(error, res, 'Removing user avatar');
  }
});

/**
 * PUT /api/v1/user/settings
 * Update user settings/preferences
 * 
 * Body:
 * - displayName: Display name (optional)
 * - bio: User bio (optional)
 * - website: Website URL (optional)
 * - twitter: Twitter handle (optional)
 * - discord: Discord handle (optional)
 * - telegram: Telegram handle (optional)
 * - isProfilePublic: Profile visibility (optional)
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required
 */
router.put('/settings', authMiddleware, apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const updates = req.body;

    // Validate the settings update
    const validation = validateProfileData(updates);
    if (!validation.isValid) {
      throw new ValidationError(validation.errors[0]);
    }

    // Clean and prepare data
    const updateData: any = {};
    
    if (updates.displayName !== undefined) {
      updateData.displayName = updates.displayName || null;
    }
    
    if (updates.bio !== undefined) {
      updateData.bio = updates.bio || null;
    }
    
    if (updates.website !== undefined) {
      updateData.website = updates.website || null;
    }
    
    if (updates.twitter !== undefined) {
      updateData.twitter = validateAndCleanHandle(updates.twitter);
    }
    
    if (updates.discord !== undefined) {
      updateData.discord = validateAndCleanHandle(updates.discord);
    }
    
    if (updates.telegram !== undefined) {
      updateData.telegram = validateAndCleanHandle(updates.telegram);
    }
    
    if (updates.isProfilePublic !== undefined) {
      if (typeof updates.isProfilePublic !== 'boolean') {
        throw new ValidationError('isProfilePublic must be a boolean');
      }
      updateData.isProfilePublic = updates.isProfilePublic;
    }

    updateData.updatedAt = new Date();

    // Update user settings
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        twitter: true,
        discord: true,
        telegram: true,
        website: true,
        avatar: true,
        avatarUrl: true,
        isProfilePublic: true,
        virtualSolBalance: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    logger.info(`User ${userId} updated settings`);

    res.json({ 
      success: true, 
      data: serializeDecimals(updatedUser)
    });
  } catch (error) {
    handleRouteError(error, res, 'Updating user settings');
  }
});

/**
 * GET /api/v1/user/search
 * Search for users by username or display name
 * 
 * Query Params:
 * - q: Search query (required, min 2 characters)
 * - limit: Maximum results to return (1-50, default 10)
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Optional (public endpoint)
 */
router.get('/search', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, limit: limitQuery } = validateQueryParams(req.query, {
      q: { type: 'string', required: true, min: 2, max: 50 },
      limit: { type: 'number', default: 10, min: 1, max: 50 }
    });

    const searchTerm = q.toLowerCase();

    // Search users by username or display name
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: searchTerm, mode: 'insensitive' } },
          { displayName: { contains: searchTerm, mode: 'insensitive' } }
        ],
        isProfilePublic: true // Only return public profiles
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        virtualSolBalance: true,
        createdAt: true
      },
      take: limitQuery,
      orderBy: [
        { virtualSolBalance: 'desc' }, // Higher balance users first
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: users.map(user => serializeDecimals(user)),
      meta: {
        count: users.length,
        query: q,
        limit: limitQuery
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Searching users');
  }
});

/**
 * GET /api/v1/user/stats/:userId?
 * Get trading statistics for a user
 * 
 * Params:
 * - userId: User ID (optional, defaults to authenticated user)
 * 
 * Returns:
 * - totalTrades: Total number of trades
 * - winRate: Percentage of profitable trades
 * - totalPnL: Total profit/loss in SOL
 * - avgTradeSize: Average trade size in SOL
 * - rank: User's rank on leaderboard
 * - bestTrade: Highest single trade profit
 * - worstTrade: Lowest single trade profit
 * 
 * Rate Limit: 100 requests per minute
 * Auth: Required for own stats, optional for public stats
 */
router.get('/stats/:userId?', apiLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as unknown as AuthenticatedRequest;
    const targetUserId = req.params.userId;
    const requestingUserId = authReq.user?.id;

    // Determine which user's stats to fetch
    let userId: string;
    if (targetUserId) {
      // Check if profile is public
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { isProfilePublic: true }
      });

      if (!targetUser) {
        throw new NotFoundError('User not found');
      }

      if (!targetUser.isProfilePublic && targetUserId !== requestingUserId) {
        throw new AuthorizationError('This profile is private');
      }

      userId = targetUserId;
    } else {
      // Fetch own stats - requires authentication
      if (!requestingUserId) {
        throw new ValidationError(ERROR_MESSAGES.AUTH_REQUIRED);
      }
      userId = requestingUserId;
    }

    // Fetch user's trades
    const trades = await prisma.trade.findMany({
      where: { userId },
      select: {
        action: true,
        totalCost: true,
        realizedPnL: true,
        timestamp: true
      },
      orderBy: { timestamp: 'desc' }
    });

    // Calculate statistics
    const totalTrades = trades.length;
    const profitableTrades = trades.filter(t => 
      t.realizedPnL && parseFloat(t.realizedPnL.toString()) > 0
    );
    const winRate = totalTrades > 0 ? (profitableTrades.length / totalTrades) * 100 : 0;

    const totalPnL = trades.reduce((sum, trade) => {
      return sum + (trade.realizedPnL ? parseFloat(trade.realizedPnL.toString()) : 0);
    }, 0);

    const totalTradeVolume = trades.reduce((sum, trade) => {
      return sum + parseFloat(trade.totalCost.toString());
    }, 0);
    const avgTradeSize = totalTrades > 0 ? totalTradeVolume / totalTrades : 0;

    // Find best and worst trades
    const tradesWithPnL = trades
      .filter(t => t.realizedPnL)
      .map(t => ({ ...t, pnl: parseFloat(t.realizedPnL!.toString()) }))
      .sort((a, b) => b.pnl - a.pnl);

    const bestTrade = tradesWithPnL.length > 0 ? tradesWithPnL[0].pnl : 0;
    const worstTrade = tradesWithPnL.length > 0 ? tradesWithPnL[tradesWithPnL.length - 1].pnl : 0;

    // Calculate rank on leaderboard
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { virtualSolBalance: true }
    });

    const usersAbove = await prisma.user.count({
      where: {
        virtualSolBalance: {
          gt: user?.virtualSolBalance || 0
        }
      }
    });

    const rank = usersAbove + 1;

    res.json({
      success: true,
      data: {
        totalTrades,
        winRate: Math.round(winRate * 100) / 100,
        totalPnL: Math.round(totalPnL * 100) / 100,
        avgTradeSize: Math.round(avgTradeSize * 100) / 100,
        rank,
        bestTrade: Math.round(bestTrade * 100) / 100,
        worstTrade: Math.round(worstTrade * 100) / 100
      },
      meta: {
        userId,
        isOwnProfile: userId === requestingUserId
      }
    });
  } catch (error) {
    handleRouteError(error, res, 'Getting user statistics');
  }
});

export default router;