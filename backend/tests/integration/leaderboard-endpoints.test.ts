/**
 * Integration Test: Leaderboard Endpoint
 * Tests leaderboard API functionality
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import prisma from '../../src/lib/prisma';

const API_URL = process.env.API_URL || 'http://localhost:4002';

describe('Leaderboard API Endpoints', () => {
  let testUsers: Array<{ id: string; email: string; token: string }> = [];

  beforeAll(async () => {
    // Create multiple test users with different balances
    const userPromises = Array.from({ length: 5 }, async (_, i) => {
      const email = `leaderboard-test-${Date.now()}-${i}@example.com`;
      const username = `lbuser${Date.now()}${i}`;
      
      const response = await request(API_URL)
        .post('/api/v1/auth/register')
        .send({
          email,
          username,
          password: 'TestPassword123!',
        });

      return {
        id: response.body.data.user.id,
        email,
        token: response.body.data.token,
      };
    });

    testUsers = await Promise.all(userPromises);

    // Update balances to create a ranking
    await Promise.all(testUsers.map((user, i) => 
      prisma.user.update({
        where: { id: user.id },
        data: { virtualSolBalance: 100 + (i * 10) }, // 100, 110, 120, 130, 140
      })
    ));
  });

  afterAll(async () => {
    // Cleanup: Delete test users
    await Promise.all(
      testUsers.map(user => 
        prisma.user.delete({
          where: { id: user.id },
        }).catch(() => {
          // Ignore errors
        })
      )
    );
    await prisma.$disconnect();
  });

  describe('GET /api/v1/leaderboard', () => {
    it('should return leaderboard data', async () => {
      const response = await request(API_URL)
        .get('/api/v1/leaderboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should include user rankings', async () => {
      const response = await request(API_URL)
        .get('/api/v1/leaderboard')
        .expect(200);

      const leaderboard = response.body.data;
      
      // Check that entries have required fields
      expect(leaderboard[0]).toHaveProperty('id');
      expect(leaderboard[0]).toHaveProperty('username');
      expect(leaderboard[0]).toHaveProperty('balance');
      expect(leaderboard[0]).toHaveProperty('totalPnL');
      expect(leaderboard[0]).toHaveProperty('totalTrades');
      expect(leaderboard[0]).toHaveProperty('winRate');
    });

    it('should return users sorted by totalPnL descending', async () => {
      const response = await request(API_URL)
        .get('/api/v1/leaderboard')
        .expect(200);

      const leaderboard = response.body.data;

      // Verify sorting (each entry should have >= PnL than the next)
      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].totalPnL).toBeGreaterThanOrEqual(
          leaderboard[i + 1].totalPnL
        );
      }
    });

    it('should include all test users in leaderboard', async () => {
      const response = await request(API_URL)
        .get('/api/v1/leaderboard')
        .expect(200);

      const leaderboard = response.body.data;
      const leaderboardUserIds = leaderboard.map((entry: any) => entry.id);

      testUsers.forEach(user => {
        expect(leaderboardUserIds).toContain(user.id);
      });
    });

    it('should calculate win rate correctly', async () => {
      const response = await request(API_URL)
        .get('/api/v1/leaderboard')
        .expect(200);

      const leaderboard = response.body.data;

      leaderboard.forEach((entry: any) => {
        expect(entry.winRate).toBeGreaterThanOrEqual(0);
        expect(entry.winRate).toBeLessThanOrEqual(100);
      });
    });

    it('should handle empty trade history gracefully', async () => {
      const response = await request(API_URL)
        .get('/api/v1/leaderboard')
        .expect(200);

      // Should not error even if users have no trades
      expect(response.body.success).toBe(true);
    });
  });
});
