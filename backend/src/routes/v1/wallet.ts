/**
 * WALLET CONNECTION ROUTES
 * 
 * Handles Solana wallet connection, verification, and tier management
 */

import { Router, Request, Response } from 'express';
import { 
  authMiddleware, 
  getUserId, 
  requireWallet,
  requireSimHolder,
  validateRequired 
} from '../../lib/unifiedAuth.js';
import { apiLimiter } from '../../middleware/rateLimiter.js';
import { handleRouteError } from '../../utils/errorHandler.js';
import { serializeDecimals } from '../../utils/decimal.js';
import { solanaService } from '../../services/solanaService.js';
import { tierService } from '../../services/tierService.js';
import { logger } from '../../utils/logger.js';
import { ValidationError } from '../../lib/errors.js';

const router = Router();

/**
 * POST /api/v1/wallet/connect
 * Connect and verify Solana wallet ownership
 */
router.post('/connect', 
  authMiddleware,
  apiLimiter,
  validateRequired(['walletAddress', 'signature', 'message']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);
      const { walletAddress, signature, message } = req.body;

      logger.info('Wallet connection attempt', { userId, walletAddress });

      // Verify wallet ownership through signature
      const verification = await solanaService.verifyWalletOwnership(
        walletAddress,
        signature,
        message
      );

      if (!verification.isValid) {
        throw new ValidationError(verification.error || 'Wallet verification failed');
      }

      // Update user tier based on wallet and $SIM balance
      const tierResult = await tierService.updateUserTier(userId, walletAddress);

      if (!tierResult.success) {
        throw new ValidationError(tierResult.error || 'Failed to update user tier');
      }

      // Get updated user info with tier details
      const userInfo = await tierService.getUserTierInfo(userId);

      logger.info('Wallet connected successfully', {
        userId,
        walletAddress,
        newTier: tierResult.newTier,
        balanceUpdated: tierResult.balanceUpdated
      });

      res.json({
        success: true,
        data: serializeDecimals({
          walletAddress,
          verified: true,
          tier: tierResult.newTier,
          benefits: tierResult.benefits,
          balanceUpdated: tierResult.balanceUpdated,
          user: {
            virtualSolBalance: userInfo.user.virtualSolBalance,
            simTokenBalance: userInfo.user.simTokenBalance,
            userTier: userInfo.user.userTier
          }
        })
      });

    } catch (error) {
      handleRouteError(error, res, 'Wallet connection failed');
    }
  }
);

/**
 * POST /api/v1/wallet/verify
 * Re-verify wallet and refresh $SIM balance
 */
router.post('/verify',
  authMiddleware,
  requireWallet(),
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);

      logger.info('Wallet verification refresh', { userId });

      // Refresh user balance and tier
      const tierResult = await tierService.refreshUserBalance(userId);

      if (!tierResult.success) {
        throw new ValidationError(tierResult.error || 'Failed to refresh wallet verification');
      }

      // Get conversion limits
      const conversionLimits = await tierService.getConversionLimits(userId);

      res.json({
        success: true,
        data: serializeDecimals({
          tier: tierResult.newTier,
          benefits: tierResult.benefits,
          balanceUpdated: tierResult.balanceUpdated,
          conversionLimits
        })
      });

    } catch (error) {
      handleRouteError(error, res, 'Wallet verification failed');
    }
  }
);

/**
 * DELETE /api/v1/wallet/disconnect
 * Disconnect wallet and revert to email tier
 */
router.delete('/disconnect',
  authMiddleware,
  requireWallet(),
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);

      logger.info('Wallet disconnection', { userId });

      // Update user to remove wallet and revert to email tier
      const tierResult = await tierService.updateUserTier(userId); // No wallet address = disconnect

      res.json({
        success: true,
        data: {
          disconnected: true,
          newTier: tierResult.newTier,
          benefits: tierResult.benefits
        }
      });

    } catch (error) {
      handleRouteError(error, res, 'Wallet disconnection failed');
    }
  }
);

/**
 * GET /api/v1/wallet/balance
 * Get current $SIM token balance
 */
router.get('/balance',
  authMiddleware,
  requireWallet(),
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);
      const userInfo = await tierService.getUserTierInfo(userId);

      if (!userInfo.user.walletAddress) {
        throw new ValidationError('No wallet connected');
      }

      // Get fresh balance from blockchain
      const balanceInfo = await solanaService.getSimTokenBalance(userInfo.user.walletAddress);

      res.json({
        success: true,
        data: serializeDecimals({
          walletAddress: userInfo.user.walletAddress,
          simTokenBalance: balanceInfo.balance,
          lastUpdated: balanceInfo.lastUpdated,
          minimumRequired: parseFloat(process.env.MINIMUM_SIM_TOKENS || '1000'),
          meetsRequirement: balanceInfo.balance >= parseFloat(process.env.MINIMUM_SIM_TOKENS || '1000')
        })
      });

    } catch (error) {
      handleRouteError(error, res, 'Failed to get wallet balance');
    }
  }
);

/**
 * GET /api/v1/wallet/status
 * Get wallet connection and tier status
 */
router.get('/status',
  authMiddleware,
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);
      const userInfo = await tierService.getUserTierInfo(userId);
      const conversionLimits = await tierService.getConversionLimits(userId);

      res.json({
        success: true,
        data: serializeDecimals({
          isConnected: !!userInfo.user.walletAddress,
          walletAddress: userInfo.user.walletAddress,
          walletVerified: userInfo.user.walletVerified,
          currentTier: userInfo.tier,
          benefits: userInfo.benefits,
          conversionLimits,
          simTokenBalance: userInfo.user.simTokenBalance,
          lastBalanceCheck: userInfo.user.simBalanceUpdated
        })
      });

    } catch (error) {
      handleRouteError(error, res, 'Failed to get wallet status');
    }
  }
);

/**
 * GET /api/v1/wallet/tier-info
 * Get tier upgrade information and requirements
 */
router.get('/tier-info',
  authMiddleware,
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);
      const upgradeInfo = await tierService.getTierUpgradeInfo(userId);

      res.json({
        success: true,
        data: serializeDecimals(upgradeInfo)
      });

    } catch (error) {
      handleRouteError(error, res, 'Failed to get tier information');
    }
  }
);

/**
 * POST /api/v1/wallet/generate-message
 * Generate verification message for wallet signing
 */
router.post('/generate-message',
  authMiddleware,
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req);
      const timestamp = Date.now();
      
      const message = solanaService.generateVerificationMessage(userId, timestamp);

      res.json({
        success: true,
        data: {
          message,
          timestamp,
          expiresIn: 10 * 60 * 1000 // 10 minutes
        }
      });

    } catch (error) {
      handleRouteError(error, res, 'Failed to generate verification message');
    }
  }
);

/**
 * GET /api/v1/wallet/network-info
 * Get Solana network configuration info
 */
router.get('/network-info',
  authMiddleware,
  apiLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const networkInfo = await solanaService.getNetworkInfo();

      res.json({
        success: true,
        data: networkInfo
      });

    } catch (error) {
      handleRouteError(error, res, 'Failed to get network information');
    }
  }
);

export default router;