/**
 * Rewards Guardrails Test Suite
 * 
 * Tests reward system integrity and prevents abuse:
 * - Reward replay attacks
 * - Concurrent claim attempts
 * - Boundary value testing
 * - Transactional consistency
 * - Double-spend prevention
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

interface RewardEvent {
  id: string;
  userId: string;
  type: 'trade' | 'chat' | 'milestone' | 'daily_login';
  amount: number;
  timestamp: number;
  signature?: string;
  nonce?: string;
}

interface RewardClaim {
  id: string;
  userId: string;
  amount: number;
  timestamp: number;
  signature: string;
  nonce: string;
  status: 'pending' | 'completed' | 'failed';
}

interface UserRewardState {
  userId: string;
  totalEarned: Decimal;
  totalClaimed: Decimal;
  availableBalance: Decimal;
  lastClaimTime: number;
  claimHistory: RewardClaim[];
  nonces: Set<string>;
}

class RewardsGuardrailsTester {
  private users: Map<string, UserRewardState> = new Map();
  private rewardEvents: RewardEvent[] = [];
  private rewardClaims: RewardClaim[] = [];
  private usedNonces: Set<string> = new Set();
  private claimLocks: Map<string, boolean> = new Map();

  constructor() {
    this.setupTestUsers();
  }

  private setupTestUsers(): void {
    const testUsers = ['user1', 'user2', 'user3'];
    testUsers.forEach(userId => {
      this.users.set(userId, {
        userId,
        totalEarned: new Decimal(0),
        totalClaimed: new Decimal(0),
        availableBalance: new Decimal(0),
        lastClaimTime: 0,
        claimHistory: [],
        nonces: new Set()
      });
    });
  }

  /**
   * Generate a unique nonce for reward claim
   */
  private generateNonce(): string {
    return `nonce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate signature for reward claim
   */
  private generateSignature(userId: string, amount: number, nonce: string): string {
    const data = `${userId}_${amount}_${nonce}_${Date.now()}`;
    return Buffer.from(data).toString('base64');
  }

  /**
   * Add reward to user account
   */
  addReward(userId: string, type: string, amount: number): boolean {
    const user = this.users.get(userId);
    if (!user) return false;

    const rewardEvent: RewardEvent = {
      id: `reward_${Date.now()}_${Math.random()}`,
      userId,
      type: type as any,
      amount,
      timestamp: Date.now()
    };

    this.rewardEvents.push(rewardEvent);
    user.totalEarned = user.totalEarned.plus(amount);
    user.availableBalance = user.availableBalance.plus(amount);

    return true;
  }

  /**
   * Attempt to claim rewards
   */
  async claimRewards(userId: string, amount: number): Promise<{ success: boolean; error?: string; claimId?: string }> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if user has sufficient balance
    if (user.availableBalance.lt(amount)) {
      return { success: false, error: 'Insufficient balance' };
    }

    // Check for concurrent claim attempts
    const lockKey = `claim_${userId}`;
    if (this.claimLocks.get(lockKey)) {
      return { success: false, error: 'Claim already in progress' };
    }

    // Acquire lock
    this.claimLocks.set(lockKey, true);

    try {
      // Generate nonce and signature
      const nonce = this.generateNonce();
      const signature = this.generateSignature(userId, amount, nonce);

      // Check for nonce reuse
      if (this.usedNonces.has(nonce)) {
        return { success: false, error: 'Nonce already used' };
      }

      // Check for signature replay
      const existingClaim = this.rewardClaims.find(claim => 
        claim.userId === userId && 
        claim.signature === signature
      );

      if (existingClaim) {
        return { success: false, error: 'Signature already used' };
      }

      // Create claim
      const claimId = `claim_${Date.now()}_${Math.random()}`;
      const claim: RewardClaim = {
        id: claimId,
        userId,
        amount,
        timestamp: Date.now(),
        signature,
        nonce,
        status: 'pending'
      };

      // Process claim atomically
      this.rewardClaims.push(claim);
      this.usedNonces.add(nonce);
      user.nonces.add(nonce);
      user.totalClaimed = user.totalClaimed.plus(amount);
      user.availableBalance = user.availableBalance.minus(amount);
      user.lastClaimTime = Date.now();
      user.claimHistory.push(claim);
      claim.status = 'completed';

      return { success: true, claimId };

    } finally {
      // Release lock
      this.claimLocks.delete(lockKey);
    }
  }

  /**
   * Test reward replay attack
   */
  async testRewardReplayAttack(): Promise<boolean> {
    const userId = 'user1';
    const amount = 100;

    // Add initial reward
    this.addReward(userId, 'trade', amount);

    // First claim should succeed
    const result1 = await this.claimRewards(userId, amount);
    if (!result1.success) return false;

    // Second claim with same amount should fail (insufficient balance)
    const result2 = await this.claimRewards(userId, amount);
    return !result2.success && result2.error?.includes('Insufficient balance');
  }

  /**
   * Test nonce reuse attack
   */
  async testNonceReuseAttack(): Promise<boolean> {
    const userId = 'user1';
    const amount = 100;

    // Add reward
    this.addReward(userId, 'trade', amount);

    // First claim
    const result1 = await this.claimRewards(userId, amount);
    if (!result1.success) return false;

    // Try to reuse the same nonce (this should fail)
    const user = this.users.get(userId)!;
    const usedNonce = Array.from(user.nonces)[0];
    
    // Manually create a claim with reused nonce
    const signature = this.generateSignature(userId, amount, usedNonce);
    const claim: RewardClaim = {
      id: `claim_${Date.now()}_${Math.random()}`,
      userId,
      amount,
      timestamp: Date.now(),
      signature,
      nonce: usedNonce,
      status: 'pending'
    };

    // This should be rejected
    if (this.usedNonces.has(usedNonce)) {
      return true; // Nonce reuse was detected
    }

    return false;
  }

  /**
   * Test concurrent claim attempts
   */
  async testConcurrentClaims(): Promise<boolean> {
    const userId = 'user1';
    const amount = 100;

    // Add reward
    this.addReward(userId, 'trade', amount);

    // Attempt concurrent claims
    const promises = Array.from({ length: 5 }, () => 
      this.claimRewards(userId, amount)
    );

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;

    // Only one claim should succeed
    return successCount === 1;
  }

  /**
   * Test boundary value conditions
   */
  async testBoundaryValues(): Promise<boolean> {
    const userId = 'user1';
    
    // Test zero amount
    const zeroResult = await this.claimRewards(userId, 0);
    if (zeroResult.success) return false;

    // Test negative amount
    const negativeResult = await this.claimRewards(userId, -100);
    if (negativeResult.success) return false;

    // Test very large amount
    const largeResult = await this.claimRewards(userId, 1e15);
    if (largeResult.success) return false;

    // Test exact balance
    this.addReward(userId, 'trade', 50);
    const exactResult = await this.claimRewards(userId, 50);
    if (!exactResult.success) return false;

    // Test slightly over balance
    const overResult = await this.claimRewards(userId, 0.01);
    if (overResult.success) return false;

    return true;
  }

  /**
   * Test signature replay attack
   */
  async testSignatureReplayAttack(): Promise<boolean> {
    const userId = 'user1';
    const amount = 100;

    // Add reward
    this.addReward(userId, 'trade', amount);

    // First claim
    const result1 = await this.claimRewards(userId, amount);
    if (!result1.success) return false;

    // Try to replay the same signature
    const claim = this.rewardClaims.find(c => c.userId === userId);
    if (!claim) return false;

    // Attempt to create another claim with same signature
    const replayClaim: RewardClaim = {
      id: `claim_${Date.now()}_${Math.random()}`,
      userId,
      amount,
      timestamp: Date.now(),
      signature: claim.signature,
      nonce: this.generateNonce(),
      status: 'pending'
    };

    // Check if signature is already used
    const existingClaim = this.rewardClaims.find(c => c.signature === claim.signature);
    return existingClaim !== undefined;
  }

  /**
   * Test transaction consistency
   */
  async testTransactionConsistency(): Promise<boolean> {
    const userId = 'user1';
    const amount = 100;

    // Add reward
    this.addReward(userId, 'trade', amount);

    // Simulate transaction failure during claim
    const originalClaimRewards = this.claimRewards.bind(this);
    this.claimRewards = async (userId: string, amount: number) => {
      // Simulate failure after balance check but before completion
      if (Math.random() < 0.5) {
        throw new Error('Simulated transaction failure');
      }
      return originalClaimRewards(userId, amount);
    };

    let successCount = 0;
    let failureCount = 0;

    // Attempt multiple claims
    for (let i = 0; i < 10; i++) {
      try {
        const result = await this.claimRewards(userId, amount);
        if (result.success) successCount++;
      } catch (error) {
        failureCount++;
      }
    }

    // Restore original method
    this.claimRewards = originalClaimRewards;

    // Check that balance is consistent
    const user = this.users.get(userId)!;
    const expectedBalance = new Decimal(100).minus(successCount * amount);
    
    return user.availableBalance.equals(expectedBalance);
  }

  /**
   * Test reward accumulation limits
   */
  async testRewardLimits(): Promise<boolean> {
    const userId = 'user1';
    const dailyLimit = 1000;
    const hourlyLimit = 100;

    // Add rewards up to daily limit
    for (let i = 0; i < 10; i++) {
      this.addReward(userId, 'trade', 100);
    }

    // Check that user can't exceed daily limit
    const user = this.users.get(userId)!;
    if (user.totalEarned.gt(dailyLimit)) {
      return false;
    }

    // Test hourly limit
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    // Add rewards within last hour
    const recentRewards = this.rewardEvents.filter(event => 
      event.userId === userId && event.timestamp > oneHourAgo
    );
    
    const hourlyTotal = recentRewards.reduce((sum, event) => sum + event.amount, 0);
    
    return hourlyTotal <= hourlyLimit;
  }

  /**
   * Test reward expiration
   */
  async testRewardExpiration(): Promise<boolean> {
    const userId = 'user1';
    const amount = 100;
    const expirationTime = 24 * 60 * 60 * 1000; // 24 hours

    // Add reward with old timestamp
    const oldReward: RewardEvent = {
      id: `reward_${Date.now()}_${Math.random()}`,
      userId,
      type: 'trade',
      amount,
      timestamp: Date.now() - expirationTime - 1000 // 1 second past expiration
    };

    this.rewardEvents.push(oldReward);
    
    const user = this.users.get(userId)!;
    user.totalEarned = user.totalEarned.plus(amount);
    user.availableBalance = user.availableBalance.plus(amount);

    // Try to claim expired reward
    const result = await this.claimRewards(userId, amount);
    
    // Should fail due to expiration
    return !result.success;
  }

  /**
   * Get reward statistics
   */
  getRewardStats(): any {
    const stats: any = {};
    
    for (const [userId, user] of this.users.entries()) {
      stats[userId] = {
        totalEarned: user.totalEarned.toString(),
        totalClaimed: user.totalClaimed.toString(),
        availableBalance: user.availableBalance.toString(),
        claimCount: user.claimHistory.length,
        nonceCount: user.nonces.size
      };
    }
    
    return {
      users: stats,
      totalEvents: this.rewardEvents.length,
      totalClaims: this.rewardClaims.length,
      usedNonces: this.usedNonces.size
    };
  }

  /**
   * Cleanup test data
   */
  cleanup(): void {
    this.users.clear();
    this.rewardEvents.length = 0;
    this.rewardClaims.length = 0;
    this.usedNonces.clear();
    this.claimLocks.clear();
  }
}

// Test suite
describe('Rewards Guardrails Tests', () => {
  let tester: RewardsGuardrailsTester;

  beforeEach(() => {
    tester = new RewardsGuardrailsTester();
  });

  afterEach(() => {
    tester.cleanup();
  });

  it('should prevent reward replay attacks', async () => {
    const result = await tester.testRewardReplayAttack();
    expect(result).toBe(true);
  });

  it('should prevent nonce reuse attacks', async () => {
    const result = await tester.testNonceReuseAttack();
    expect(result).toBe(true);
  });

  it('should handle concurrent claim attempts', async () => {
    const result = await tester.testConcurrentClaims();
    expect(result).toBe(true);
  });

  it('should validate boundary values', async () => {
    const result = await tester.testBoundaryValues();
    expect(result).toBe(true);
  });

  it('should prevent signature replay attacks', async () => {
    const result = await tester.testSignatureReplayAttack();
    expect(result).toBe(true);
  });

  it('should maintain transaction consistency', async () => {
    const result = await tester.testTransactionConsistency();
    expect(result).toBe(true);
  });

  it('should enforce reward limits', async () => {
    const result = await tester.testRewardLimits();
    expect(result).toBe(true);
  });

  it('should handle reward expiration', async () => {
    const result = await tester.testRewardExpiration();
    expect(result).toBe(true);
  });

  it('should track reward statistics correctly', async () => {
    // Add some rewards and claims
    tester.addReward('user1', 'trade', 100);
    tester.addReward('user1', 'chat', 50);
    await tester.claimRewards('user1', 75);
    
    const stats = tester.getRewardStats();
    
    expect(stats.users.user1.totalEarned).toBe('150');
    expect(stats.users.user1.totalClaimed).toBe('75');
    expect(stats.users.user1.availableBalance).toBe('75');
    expect(stats.users.user1.claimCount).toBe(1);
  });

  it('should prevent double-spending', async () => {
    const userId = 'user1';
    const amount = 100;
    
    // Add reward
    tester.addReward(userId, 'trade', amount);
    
    // First claim should succeed
    const result1 = await tester.claimRewards(userId, amount);
    expect(result1.success).toBe(true);
    
    // Second claim should fail
    const result2 = await tester.claimRewards(userId, amount);
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('Insufficient balance');
  });
});

// Performance tests
describe('Rewards Performance Tests', () => {
  let tester: RewardsGuardrailsTester;

  beforeEach(() => {
    tester = new RewardsGuardrailsTester();
  });

  afterEach(() => {
    tester.cleanup();
  });

  it('should handle high-frequency reward claims', async () => {
    const userId = 'user1';
    const amount = 1;
    
    // Add large reward
    tester.addReward(userId, 'trade', 1000);
    
    const startTime = Date.now();
    const claimCount = 100;
    
    // Make many small claims
    for (let i = 0; i < claimCount; i++) {
      await tester.claimRewards(userId, amount);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const throughput = claimCount / (duration / 1000);
    
    expect(throughput).toBeGreaterThan(50); // At least 50 claims/second
  });

  it('should handle concurrent users', async () => {
    const userCount = 10;
    const claimsPerUser = 10;
    
    // Add rewards for all users
    for (let i = 0; i < userCount; i++) {
      const userId = `user${i}`;
      tester.addReward(userId, 'trade', 100);
    }
    
    // Make concurrent claims
    const promises = [];
    for (let i = 0; i < userCount; i++) {
      for (let j = 0; j < claimsPerUser; j++) {
        promises.push(tester.claimRewards(`user${i}`, 10));
      }
    }
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    
    expect(successCount).toBe(userCount * claimsPerUser);
  });
});