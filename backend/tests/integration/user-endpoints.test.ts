/**
 * Integration Test: User Endpoints
 * Tests all user-related API endpoints
 */

import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import prisma from '../../src/lib/prisma';

const API_URL = process.env.API_URL || 'http://localhost:4002';

describe('User API Endpoints', () => {
  let authToken: string;
  let testUserId: string;
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    username: `testuser${Date.now()}`,
    password: 'TestPassword123!',
  };

  beforeAll(async () => {
    // Register a test user
    const registerResponse = await request(API_URL)
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201);

    authToken = registerResponse.body.data.token;
    testUserId = registerResponse.body.data.user.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test user
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      }).catch(() => {
        // Ignore errors if user already deleted
      });
    }
    await prisma.$disconnect();
  });

  describe('GET /api/v1/user/profile', () => {
    it('should get authenticated user profile', async () => {
      const response = await request(API_URL)
        .get('/api/v1/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('email', testUser.email);
      expect(response.body.data).toHaveProperty('username', testUser.username);
    });

    it('should return 401 without authentication', async () => {
      await request(API_URL)
        .get('/api/v1/user/profile')
        .expect(401);
    });
  });

  describe('PUT /api/v1/user/profile', () => {
    it('should update user profile', async () => {
      const updates = {
        displayName: 'Test User Display',
        bio: 'This is a test bio',
      };

      const response = await request(API_URL)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.displayName).toBe(updates.displayName);
      expect(response.body.data.bio).toBe(updates.bio);
    });

    it('should validate profile data', async () => {
      const invalidUpdates = {
        displayName: 'x'.repeat(300), // Too long
      };

      await request(API_URL)
        .put('/api/v1/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdates)
        .expect(400);
    });
  });

  describe('PUT /api/v1/user/settings', () => {
    it('should update user settings', async () => {
      const settings = {
        isProfilePublic: false,
        displayName: 'Updated Display Name',
      };

      const response = await request(API_URL)
        .put('/api/v1/user/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(settings)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isProfilePublic).toBe(false);
    });
  });

  describe('GET /api/v1/user/search', () => {
    it('should search users by username', async () => {
      const response = await request(API_URL)
        .get('/api/v1/user/search')
        .query({ q: testUser.username.substring(0, 8), limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should require search query', async () => {
      await request(API_URL)
        .get('/api/v1/user/search')
        .expect(400);
    });

    it('should validate search query length', async () => {
      await request(API_URL)
        .get('/api/v1/user/search')
        .query({ q: 'x' }) // Too short (min 2 characters)
        .expect(400);
    });
  });

  describe('GET /api/v1/user/stats/:userId?', () => {
    it('should get user statistics', async () => {
      const response = await request(API_URL)
        .get('/api/v1/user/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalTrades');
      expect(response.body.data).toHaveProperty('winRate');
      expect(response.body.data).toHaveProperty('totalPnL');
      expect(response.body.data).toHaveProperty('rank');
    });

    it('should require authentication for own stats', async () => {
      await request(API_URL)
        .get('/api/v1/user/stats')
        .expect(401);
    });
  });

  describe('GET /api/v1/user/balance', () => {
    it('should get user balance', async () => {
      const response = await request(API_URL)
        .get('/api/v1/user/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('currency');
    });
  });
});
