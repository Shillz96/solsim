// Secure nonce handling with Redis TTL
import crypto from 'crypto';
import redis from './redis.js';

const NONCE_TTL = 300; // 5 minutes in seconds
const MAX_NONCE_ATTEMPTS = 3; // Maximum nonce generation attempts per wallet per hour
const NONCE_ATTEMPT_WINDOW = 3600; // 1 hour in seconds

export class NonceService {
  // Generate a secure nonce for wallet authentication
  static async generateNonce(walletAddress: string): Promise<string> {
    try {
      // Check rate limiting for nonce generation
      const attempts = await this.getNonceAttempts(walletAddress);
      if (attempts >= MAX_NONCE_ATTEMPTS) {
        throw new Error('Too many nonce requests. Please try again in an hour.');
      }

      // Generate cryptographically secure nonce
      const nonce = crypto.randomBytes(32).toString('hex');
      
      // Store nonce in Redis with TTL
      const nonceKey = `nonce:${walletAddress}`;
      await redis.setex(nonceKey, NONCE_TTL, nonce);
      
      // Track nonce generation attempts
      await this.incrementNonceAttempts(walletAddress);
      
      console.log(`🔐 Generated nonce for wallet ${walletAddress.slice(0, 8)}... (expires in ${NONCE_TTL}s)`);
      
      return nonce;
    } catch (error: any) {
      console.error('Failed to generate nonce:', error);
      throw new Error(error.message || 'Failed to generate authentication nonce');
    }
  }

  // Verify and consume nonce
  static async verifyAndConsumeNonce(walletAddress: string, providedNonce: string): Promise<boolean> {
    try {
      const nonceKey = `nonce:${walletAddress}`;
      const storedNonce = await redis.get(nonceKey);
      
      if (!storedNonce) {
        console.warn(`⚠️ Nonce verification failed: No nonce found for wallet ${walletAddress.slice(0, 8)}...`);
        return false;
      }

      if (storedNonce !== providedNonce) {
        console.warn(`⚠️ Nonce verification failed: Invalid nonce for wallet ${walletAddress.slice(0, 8)}...`);
        return false;
      }

      // Nonce is valid - consume it (delete from Redis)
      await redis.del(nonceKey);
      
      console.log(`✅ Nonce verified and consumed for wallet ${walletAddress.slice(0, 8)}...`);
      return true;
    } catch (error: any) {
      console.error('Failed to verify nonce:', error);
      return false;
    }
  }

  // Check if nonce exists for wallet
  static async hasValidNonce(walletAddress: string): Promise<boolean> {
    try {
      const nonceKey = `nonce:${walletAddress}`;
      const nonce = await redis.get(nonceKey);
      return nonce !== null;
    } catch (error) {
      console.error('Failed to check nonce existence:', error);
      return false;
    }
  }

  // Get remaining TTL for nonce
  static async getNonceTTL(walletAddress: string): Promise<number> {
    try {
      const nonceKey = `nonce:${walletAddress}`;
      return await redis.ttl(nonceKey);
    } catch (error) {
      console.error('Failed to get nonce TTL:', error);
      return -1;
    }
  }

  // Track nonce generation attempts
  private static async incrementNonceAttempts(walletAddress: string): Promise<void> {
    try {
      const attemptsKey = `nonce_attempts:${walletAddress}`;
      const current = await redis.incr(attemptsKey);
      
      // Set expiry on first attempt
      if (current === 1) {
        await redis.expire(attemptsKey, NONCE_ATTEMPT_WINDOW);
      }
    } catch (error) {
      console.error('Failed to increment nonce attempts:', error);
    }
  }

  // Get current nonce generation attempts
  private static async getNonceAttempts(walletAddress: string): Promise<number> {
    try {
      const attemptsKey = `nonce_attempts:${walletAddress}`;
      const attempts = await redis.get(attemptsKey);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      console.error('Failed to get nonce attempts:', error);
      return 0;
    }
  }

  // Clean up expired nonces (maintenance function)
  static async cleanupExpiredNonces(): Promise<number> {
    try {
      const pattern = 'nonce:*';
      const keys = await redis.keys(pattern);
      let cleaned = 0;

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl <= 0) {
          await redis.del(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`🧹 Cleaned up ${cleaned} expired nonces`);
      }

      return cleaned;
    } catch (error) {
      console.error('Failed to cleanup expired nonces:', error);
      return 0;
    }
  }

  // Get nonce statistics (for monitoring)
  static async getStatistics(): Promise<{
    activeNonces: number;
    expiringSoon: number; // Expiring in next 60 seconds
  }> {
    try {
      const pattern = 'nonce:*';
      const keys = await redis.keys(pattern);
      let expiringSoon = 0;

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl > 0 && ttl <= 60) {
          expiringSoon++;
        }
      }

      return {
        activeNonces: keys.length,
        expiringSoon
      };
    } catch (error) {
      console.error('Failed to get nonce statistics:', error);
      return { activeNonces: 0, expiringSoon: 0 };
    }
  }

  // Create Sign-In With Solana message
  static createSIWSMessage(walletAddress: string, nonce: string, domain?: string): string {
    const timestamp = new Date().toISOString();
    const domainName = domain || 'solsim.fun';
    
    return [
      `${domainName} wants you to sign in with your Solana account:`,
      walletAddress,
      '',
      'Welcome to SolSim - the ultimate Solana paper trading simulator!',
      '',
      `URI: https://${domainName}`,
      `Version: 1`,
      `Chain ID: solana:mainnet`,
      `Nonce: ${nonce}`,
      `Issued At: ${timestamp}`,
      `Expiration Time: ${new Date(Date.now() + NONCE_TTL * 1000).toISOString()}`
    ].join('\n');
  }
}

// Background cleanup service
export class NonceCleanupService {
  private static interval: NodeJS.Timeout | null = null;
  private static readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  static start(): void {
    if (this.interval) {
      return; // Already running
    }

    console.log('🧹 Starting nonce cleanup service...');
    
    this.interval = setInterval(async () => {
      try {
        await NonceService.cleanupExpiredNonces();
      } catch (error) {
        console.error('Nonce cleanup service error:', error);
      }
    }, this.CLEANUP_INTERVAL);
  }

  static stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('🛑 Stopped nonce cleanup service');
    }
  }
}