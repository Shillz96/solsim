/**
 * SOLANA INTEGRATION SERVICE
 * 
 * Handles Solana wallet verification and $SIM token balance checking
 * Integrates with the tier system to determine user privileges
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
// @ts-ignore - tweetnacl types not available
import { sign } from 'tweetnacl';
import { logger } from '../utils/logger.js';
import { config } from '../config/environment.js';
import { UserTier } from '@prisma/client';

// Types
export interface WalletVerificationResult {
  isValid: boolean;
  walletAddress: string;
  signature?: string;
  error?: string;
}

export interface SimTokenBalance {
  balance: number;
  walletAddress: string;
  lastUpdated: Date;
}

export interface TierBenefits {
  virtualSolBalance: number;
  monthlyConversionLimit: number;
  conversionRate: number;
  features: string[];
  displayName: string;
  description: string;
}

// Configuration constants
const SOLANA_NETWORK = process.env.SOLANA_NETWORK || 'devnet';
const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || 
  (SOLANA_NETWORK === 'mainnet-beta' 
    ? 'https://api.mainnet-beta.solana.com' 
    : 'https://api.devnet.solana.com');

// $SIM Token configuration (update these with actual values)
const SIM_TOKEN_MINT = process.env.SIM_TOKEN_MINT_ADDRESS || 'So11111111111111111111111111111111111111112'; // Placeholder
const MINIMUM_SIM_TOKENS = parseFloat(process.env.MINIMUM_SIM_TOKENS || '1000'); // Minimum tokens for premium tier

export class SolanaService {
  private connection: Connection;
  private simTokenMint: PublicKey;

  constructor() {
    this.connection = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
    this.simTokenMint = new PublicKey(SIM_TOKEN_MINT);
    
    logger.info('SolanaService initialized', {
      network: SOLANA_NETWORK,
      endpoint: SOLANA_RPC_ENDPOINT,
      simTokenMint: SIM_TOKEN_MINT,
      minimumTokens: MINIMUM_SIM_TOKENS
    });
  }

  /**
   * Verify wallet ownership through message signing
   */
  async verifyWalletOwnership(
    walletAddress: string, 
    signature: string, 
    message: string
  ): Promise<WalletVerificationResult> {
    try {
      // Validate wallet address format
      let publicKey: PublicKey;
      try {
        publicKey = new PublicKey(walletAddress);
      } catch (error) {
        return {
          isValid: false,
          walletAddress,
          error: 'Invalid wallet address format'
        };
      }

      // Convert message and signature from base64/hex
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = Buffer.from(signature, 'base64');

      // Verify signature
      const isValid = sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKey.toBytes()
      );

      return {
        isValid,
        walletAddress,
        signature: isValid ? signature : undefined,
        error: isValid ? undefined : 'Invalid signature'
      };

    } catch (error) {
      logger.error('Wallet verification failed', { error, walletAddress });
      return {
        isValid: false,
        walletAddress,
        error: error instanceof Error ? error.message : 'Verification failed'
      };
    }
  }

  /**
   * Check $SIM token balance for a wallet
   */
  async getSimTokenBalance(walletAddress: string): Promise<SimTokenBalance> {
    try {
      const walletPublicKey = new PublicKey(walletAddress);
      
      // Get associated token account for $SIM tokens
      const associatedTokenAccount = await getAssociatedTokenAddress(
        this.simTokenMint,
        walletPublicKey
      );

      try {
        // Get token account info
        const tokenAccount = await getAccount(
          this.connection,
          associatedTokenAccount
        );

        // Convert balance from smallest unit (considering decimals)
        // Assuming 9 decimals for $SIM token (standard for SPL tokens)
        const balance = Number(tokenAccount.amount) / Math.pow(10, 9);

        return {
          balance,
          walletAddress,
          lastUpdated: new Date()
        };

      } catch (accountError) {
        // Token account doesn't exist or has no balance
        logger.debug('No $SIM token account found', { walletAddress, accountError });
        return {
          balance: 0,
          walletAddress,
          lastUpdated: new Date()
        };
      }

    } catch (error) {
      logger.error('Failed to check $SIM token balance', { error, walletAddress });
      throw new Error(`Failed to check token balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Determine user tier based on $SIM token holdings
   */
  async calculateUserTier(walletAddress: string): Promise<UserTier> {
    try {
      const { balance } = await this.getSimTokenBalance(walletAddress);
      
      if (balance >= MINIMUM_SIM_TOKENS) {
        return UserTier.SIM_HOLDER;
      } else {
        return UserTier.WALLET_USER;
      }
    } catch (error) {
      logger.error('Failed to calculate user tier', { error, walletAddress });
      // Default to wallet user if we can't check balance
      return UserTier.WALLET_USER;
    }
  }

  /**
   * Get tier benefits configuration
   */
  getTierBenefits(tier: UserTier): TierBenefits {
    switch (tier) {
      case UserTier.EMAIL_USER:
        return {
          virtualSolBalance: 10,
          monthlyConversionLimit: 5,
          conversionRate: 1.0, // Base rate
          features: ['basic_trading', 'portfolio_tracking', 'leaderboard_view'],
          displayName: 'Email User',
          description: 'Basic trading with 10 virtual SOL'
        };

      case UserTier.WALLET_USER:
        return {
          virtualSolBalance: 10, // Same as email user if no $SIM tokens
          monthlyConversionLimit: 5,
          conversionRate: 1.0,
          features: ['basic_trading', 'portfolio_tracking', 'leaderboard_view', 'wallet_connected'],
          displayName: 'Wallet User',
          description: 'Wallet connected but no $SIM tokens held'
        };

      case UserTier.SIM_HOLDER:
        return {
          virtualSolBalance: 100,
          monthlyConversionLimit: 50,
          conversionRate: 1.1, // 10% better conversion rate
          features: [
            'basic_trading', 
            'portfolio_tracking', 
            'leaderboard_view', 
            'wallet_connected',
            'advanced_analytics',
            'staking_rewards',
            'priority_support',
            'exclusive_features',
            'vip_status'
          ],
          displayName: '$SIM Holder',
          description: 'Premium tier with 100 virtual SOL and exclusive features'
        };

      case UserTier.ADMINISTRATOR:
        return {
          virtualSolBalance: 1000, // Admin gets more for testing
          monthlyConversionLimit: 1000,
          conversionRate: 1.0,
          features: [
            'basic_trading', 
            'portfolio_tracking', 
            'leaderboard_view', 
            'wallet_connected',
            'advanced_analytics',
            'staking_rewards',
            'priority_support',
            'exclusive_features',
            'vip_status',
            'admin_dashboard',
            'user_management',
            'system_monitoring'
          ],
          displayName: 'Administrator',
          description: 'Platform administration access'
        };

      default:
        return this.getTierBenefits(UserTier.EMAIL_USER);
    }
  }

  /**
   * Check if user can perform action based on tier
   */
  canPerformAction(userTier: UserTier, action: string): boolean {
    const benefits = this.getTierBenefits(userTier);
    return benefits.features.includes(action);
  }

  /**
   * Generate verification message for wallet signing
   */
  generateVerificationMessage(userId: string, timestamp: number = Date.now()): string {
    return `SolSim Wallet Verification\n\nUser ID: ${userId}\nTimestamp: ${timestamp}\nNetwork: ${SOLANA_NETWORK}\n\nSign this message to verify wallet ownership.`;
  }

  /**
   * Validate verification message timestamp (prevent replay attacks)
   */
  isValidTimestamp(timestamp: number, maxAgeMinutes: number = 10): boolean {
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
    return (now - timestamp) <= maxAge && timestamp <= now;
  }

  /**
   * Get current Solana network info
   */
  async getNetworkInfo() {
    try {
      const version = await this.connection.getVersion();
      const slot = await this.connection.getSlot();
      
      return {
        network: SOLANA_NETWORK,
        endpoint: SOLANA_RPC_ENDPOINT,
        version: version['solana-core'],
        currentSlot: slot,
        simTokenMint: SIM_TOKEN_MINT,
        minimumTokens: MINIMUM_SIM_TOKENS
      };
    } catch (error) {
      logger.error('Failed to get network info', { error });
      throw error;
    }
  }

  /**
   * Check if a wallet address is valid
   */
  isValidWalletAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Format token balance for display
   */
  formatTokenBalance(balance: number, decimals: number = 2): string {
    return balance.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }
}

// Export singleton instance
export const solanaService = new SolanaService();
export default solanaService;