/**
 * TIER MANAGEMENT SERVICE
 * 
 * Handles user tier calculations, benefit management, and conversion limits
 * Integrates with Solana service for wallet verification
 */

import { UserTier, User } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { solanaService, TierBenefits } from './solanaService.js';
import { logger } from '../utils/logger.js';
import { ValidationError, AuthorizationError } from '../lib/errors.js';

export interface ConversionLimits {
  monthlyLimit: number;
  currentUsage: number;
  remainingLimit: number;
  resetDate: Date;
}

export interface TierUpgradeResult {
  success: boolean;
  newTier: UserTier;
  benefits: TierBenefits;
  balanceUpdated: boolean;
  error?: string;
}

export class TierService {
  /**
   * Get tier benefits for a specific tier
   */
  getTierBenefits(tier: UserTier): TierBenefits {
    return solanaService.getTierBenefits(tier);
  }

  /**
   * Check if user can perform action based on tier
   */
  canPerformAction(userTier: UserTier, action: string): boolean {
    return solanaService.canPerformAction(userTier, action);
  }

  /**
   * Update user tier based on wallet verification and $SIM balance
   */
  async updateUserTier(userId: string, walletAddress?: string): Promise<TierUpgradeResult> {
    try {
      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          userTier: true,
          walletAddress: true,
          walletVerified: true,
          virtualSolBalance: true,
          simTokenBalance: true,
          simBalanceUpdated: true
        }
      });

      if (!user) {
        throw new ValidationError('User not found');
      }

      let newTier: UserTier = user.userTier;
      let balanceUpdated = false;
      let simBalance: number | null = null;

      // If wallet address provided, verify and check $SIM balance
      if (walletAddress) {
        if (!solanaService.isValidWalletAddress(walletAddress)) {
          throw new ValidationError('Invalid wallet address format');
        }

        try {
          // Check $SIM token balance
          const balanceResult = await solanaService.getSimTokenBalance(walletAddress);
          simBalance = balanceResult.balance;

          // Calculate new tier based on token holdings
          newTier = await solanaService.calculateUserTier(walletAddress);

          logger.info('Wallet verified and tier calculated', {
            userId,
            walletAddress,
            simBalance,
            newTier,
            previousTier: user.userTier
          });

        } catch (error) {
          logger.error('Failed to verify wallet or check balance', { error, userId, walletAddress });
          // If wallet verification fails, default to WALLET_USER if they had no wallet before
          newTier = user.walletAddress ? user.userTier : UserTier.WALLET_USER;
        }
      }

      // Get benefits for new tier
      const benefits = this.getTierBenefits(newTier);

      // Update user with new tier information
      const updateData: any = {
        userTier: newTier,
        walletVerified: !!walletAddress,
        simBalanceUpdated: walletAddress ? new Date() : user.simBalanceUpdated,
      };

      if (walletAddress) {
        updateData.walletAddress = walletAddress;
        updateData.simTokenBalance = simBalance;
      }

      // Update virtual SOL balance if tier changed and it's an upgrade
      if (newTier !== user.userTier) {
        const currentBalance = parseFloat(user.virtualSolBalance.toString());
        const tierBalance = benefits.virtualSolBalance;

        // Only upgrade balance, never downgrade automatically
        if (tierBalance > currentBalance) {
          updateData.virtualSolBalance = tierBalance;
          balanceUpdated = true;
        }
      }

      // Update user in database
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      return {
        success: true,
        newTier,
        benefits,
        balanceUpdated
      };

    } catch (error) {
      logger.error('Failed to update user tier', { error, userId, walletAddress });
      
      if (error instanceof ValidationError || error instanceof AuthorizationError) {
        throw error;
      }

      return {
        success: false,
        newTier: UserTier.EMAIL_USER,
        benefits: this.getTierBenefits(UserTier.EMAIL_USER),
        balanceUpdated: false,
        error: error instanceof Error ? error.message : 'Failed to update tier'
      };
    }
  }

  /**
   * Get user's current tier and benefits
   */
  async getUserTierInfo(userId: string): Promise<{ tier: UserTier; benefits: TierBenefits; user: any }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userTier: true,
        walletAddress: true,
        walletVerified: true,
        simTokenBalance: true,
        simBalanceUpdated: true,
        virtualSolBalance: true,
        monthlyConversions: true,
        conversionResetAt: true
      }
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    const benefits = this.getTierBenefits(user.userTier);

    return {
      tier: user.userTier,
      benefits,
      user
    };
  }

  /**
   * Check user's monthly conversion limits
   */
  async getConversionLimits(userId: string): Promise<ConversionLimits> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        userTier: true,
        monthlyConversions: true,
        conversionResetAt: true
      }
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    const benefits = this.getTierBenefits(user.userTier);
    const now = new Date();
    
    // Check if we need to reset monthly limits
    let currentUsage = parseFloat(user.monthlyConversions.toString());
    let resetDate = user.conversionResetAt;

    if (!resetDate || resetDate <= now) {
      // Reset monthly limits
      const nextResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          monthlyConversions: 0,
          conversionResetAt: nextResetDate
        }
      });

      currentUsage = 0;
      resetDate = nextResetDate;
    }

    return {
      monthlyLimit: benefits.monthlyConversionLimit,
      currentUsage,
      remainingLimit: Math.max(0, benefits.monthlyConversionLimit - currentUsage),
      resetDate
    };
  }

  /**
   * Check if user can convert specified amount
   */
  async canConvert(userId: string, amount: number): Promise<{ canConvert: boolean; reason?: string; limits: ConversionLimits }> {
    const limits = await this.getConversionLimits(userId);

    if (amount <= 0) {
      return {
        canConvert: false,
        reason: 'Invalid conversion amount',
        limits
      };
    }

    if (amount > limits.remainingLimit) {
      return {
        canConvert: false,
        reason: `Monthly limit exceeded. You can convert ${limits.remainingLimit} more SOL this month.`,
        limits
      };
    }

    return {
      canConvert: true,
      limits
    };
  }

  /**
   * Record a conversion and update monthly usage
   */
  async recordConversion(userId: string, amount: number): Promise<void> {
    const { canConvert, reason } = await this.canConvert(userId, amount);

    if (!canConvert) {
      throw new ValidationError(reason || 'Conversion not allowed');
    }

    // Update monthly conversion usage
    await prisma.user.update({
      where: { id: userId },
      data: {
        monthlyConversions: {
          increment: amount
        }
      }
    });
  }

  /**
   * Refresh user's $SIM token balance and update tier if needed
   */
  async refreshUserBalance(userId: string): Promise<TierUpgradeResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userTier: true,
        walletAddress: true,
        walletVerified: true
      }
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    if (!user.walletAddress || !user.walletVerified) {
      throw new ValidationError('No verified wallet connected');
    }

    return this.updateUserTier(userId, user.walletAddress);
  }

  /**
   * Get tier upgrade requirements for current user
   */
  async getTierUpgradeInfo(userId: string): Promise<{
    currentTier: UserTier;
    nextTier?: UserTier;
    requirements?: string;
    benefits?: TierBenefits;
  }> {
    const { tier: currentTier } = await this.getUserTierInfo(userId);

    switch (currentTier) {
      case UserTier.EMAIL_USER:
        return {
          currentTier,
          nextTier: UserTier.WALLET_USER,
          requirements: 'Connect a Solana wallet',
          benefits: this.getTierBenefits(UserTier.WALLET_USER)
        };

      case UserTier.WALLET_USER:
        return {
          currentTier,
          nextTier: UserTier.SIM_HOLDER,
          requirements: `Hold ${process.env.MINIMUM_SIM_TOKENS || '1000'} $SIM tokens in connected wallet`,
          benefits: this.getTierBenefits(UserTier.SIM_HOLDER)
        };

      case UserTier.SIM_HOLDER:
        return {
          currentTier,
          // Already at highest regular tier
          requirements: 'You have the highest available tier!',
        };

      case UserTier.ADMINISTRATOR:
        return {
          currentTier,
          requirements: 'Administrator tier - highest privilege level',
        };

      default:
        return {
          currentTier,
          requirements: 'Unknown tier status',
        };
    }
  }

  /**
   * Batch update tiers for multiple users (admin function)
   */
  async batchUpdateTiers(userIds: string[]): Promise<{ success: number; failed: number; results: any[] }> {
    const results = [];
    let success = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const result = await this.refreshUserBalance(userId);
        results.push({ userId, ...result });
        success++;
      } catch (error) {
        results.push({ 
          userId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        failed++;
      }
    }

    return { success, failed, results };
  }

  /**
   * Get tier statistics for admin dashboard
   */
  async getTierStatistics(): Promise<{
    totalUsers: number;
    tierDistribution: Record<UserTier, number>;
    walletConnections: number;
    averageSimBalance: number;
  }> {
    const users = await prisma.user.findMany({
      select: {
        userTier: true,
        walletAddress: true,
        simTokenBalance: true
      }
    });

    const totalUsers = users.length;
    const walletConnections = users.filter(u => u.walletAddress).length;
    
    const tierDistribution = users.reduce((acc, user) => {
      acc[user.userTier] = (acc[user.userTier] || 0) + 1;
      return acc;
    }, {} as Record<UserTier, number>);

    const simBalances = users
      .filter(u => u.simTokenBalance)
      .map(u => parseFloat(u.simTokenBalance!.toString()));
    
    const averageSimBalance = simBalances.length > 0 
      ? simBalances.reduce((sum, balance) => sum + balance, 0) / simBalances.length
      : 0;

    return {
      totalUsers,
      tierDistribution,
      walletConnections,
      averageSimBalance
    };
  }
}

// Export singleton instance
export const tierService = new TierService();
export default tierService;