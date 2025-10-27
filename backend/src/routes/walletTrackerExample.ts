/**
 * Example: How to use the PumpPortal Wallet Tracker
 * 
 * This example shows how to integrate the new real-time wallet tracker
 * into your routes and WebSocket endpoints.
 */

import { FastifyInstance } from 'fastify';
import { walletTrackerService } from '../services/walletTrackerService-pumpportal.js';
import { pumpPortalStreamService } from '../services/pumpPortalStreamService.js';
import prisma from '../plugins/prisma.js';

// Helper function for time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

export default async function walletTrackerRoutes(app: FastifyInstance) {
  /**
   * POST /api/wallet-tracker/track
   * Start tracking a wallet (compatible with existing frontend)
   */
  app.post('/wallet-tracker/track', async (req, reply) => {
    const { userId, walletAddress, label } = req.body as any;

    if (!userId || !walletAddress) {
      return reply.code(400).send({ error: 'userId and walletAddress required' });
    }

    try {
      const result = await walletTrackerService.followWallet(userId, walletAddress, label);
      
      return reply.send({
        success: true,
        message: `Now tracking ${walletAddress}`,
        data: result
      });
    } catch (error) {
      console.error('Error following wallet:', error);
      return reply.code(500).send({ error: 'Failed to follow wallet' });
    }
  });

  /**
   * POST /api/wallet-tracker/follow
   * Alias for track (new API)
   */
  app.post('/wallet-tracker/follow', async (req, reply) => {
    const { userId, walletAddress, alias } = req.body as any;

    if (!userId || !walletAddress) {
      return reply.code(400).send({ error: 'userId and walletAddress required' });
    }

    try {
      const result = await walletTrackerService.followWallet(userId, walletAddress, alias);
      
      return reply.send({
        success: true,
        message: `Now tracking ${walletAddress}`,
        data: result
      });
    } catch (error) {
      console.error('Error following wallet:', error);
      return reply.code(500).send({ error: 'Failed to follow wallet' });
    }
  });

  /**
   * DELETE /api/wallet-tracker/:id
   * Stop tracking a wallet by tracking ID (compatible with existing frontend)
   */
  app.delete('/wallet-tracker/:id', async (req, reply) => {
    const { id } = req.params as any;

    try {
      // Get the tracking record to find wallet address
      const tracking = await prisma.walletTrack.findUnique({
        where: { id }
      });

      if (!tracking) {
        return reply.code(404).send({ error: 'Tracking not found' });
      }

      await walletTrackerService.unfollowWallet(tracking.userId, tracking.address);
      
      return reply.send({
        success: true,
        message: `Stopped tracking ${tracking.address}`
      });
    } catch (error) {
      console.error('Error unfollowing wallet:', error);
      return reply.code(500).send({ error: 'Failed to unfollow wallet' });
    }
  });

  /**
   * DELETE /api/wallet-tracker/unfollow
   * Stop tracking a wallet (new API)
   */
  app.delete('/wallet-tracker/unfollow', async (req, reply) => {
    const { userId, walletAddress } = req.body as any;

    if (!userId || !walletAddress) {
      return reply.code(400).send({ error: 'userId and walletAddress required' });
    }

    try {
      await walletTrackerService.unfollowWallet(userId, walletAddress);
      
      return reply.send({
        success: true,
        message: `Stopped tracking ${walletAddress}`
      });
    } catch (error) {
      console.error('Error unfollowing wallet:', error);
      return reply.code(500).send({ error: 'Failed to unfollow wallet' });
    }
  });

  /**
   * GET /api/wallet-tracker/user/:userId
   * Get all tracked wallets for a user (compatible with existing frontend)
   */
  app.get('/wallet-tracker/user/:userId', async (req, reply) => {
    const { userId } = req.params as any;

    if (!userId) {
      return reply.code(400).send({ error: 'userId required' });
    }

    try {
      const wallets = await walletTrackerService.listTrackedWallets(userId);
      
      // Format to match frontend expectations
      const trackedWallets = wallets.map((w: any) => ({
        id: w.id,
        userId: w.userId,
        walletAddress: w.address,
        label: w.alias,
        isActive: true,
        createdAt: w.createdAt
      }));

      return reply.send({
        success: true,
        trackedWallets
      });
    } catch (error) {
      console.error('Error listing wallets:', error);
      return reply.code(500).send({ error: 'Failed to list wallets' });
    }
  });

  /**
   * GET /api/wallet-tracker/list
   * Get tracked wallets (new API)
   */
  app.get('/wallet-tracker/list', async (req, reply) => {
    const { userId } = req.query as any;

    if (!userId) {
      return reply.code(400).send({ error: 'userId required' });
    }

    try {
      const wallets = await walletTrackerService.listTrackedWallets(userId);
      
      return reply.send({
        success: true,
        wallets
      });
    } catch (error) {
      console.error('Error listing wallets:', error);
      return reply.code(500).send({ error: 'Failed to list wallets' });
    }
  });

  /**
   * GET /api/wallet-tracker/trades/:address
   * Get recent trades for a specific wallet
   */
  app.get('/wallet-tracker/trades/:address', async (req, reply) => {
    const { address } = req.params as any;
    const { limit } = req.query as any;
    const limitNum = parseInt(limit) || 25;

    try {
      const trades = await walletTrackerService.getWalletTrades(address, limitNum);
      
      return reply.send({
        success: true,
        trades
      });
    } catch (error) {
      console.error('Error fetching trades:', error);
      return reply.code(500).send({ error: 'Failed to fetch trades' });
    }
  });

  /**
   * GET /api/wallet-tracker/v2/feed/:userId
   * Get all tracked wallet activities for a user (compatible with existing frontend)
   */
  app.get('/wallet-tracker/v2/feed/:userId', async (req, reply) => {
    const { userId } = req.params as any;
    const { limit, offset, type } = req.query as any;
    const limitNum = parseInt(limit) || 50;
    const offsetNum = parseInt(offset) || 0;

    if (!userId) {
      return reply.code(400).send({ error: 'userId required' });
    }

    try {
      const trades = await walletTrackerService.getUserWalletTrades(userId, limitNum + offsetNum + 1);
      
      // Apply pagination
      const paginatedTrades = trades.slice(offsetNum, offsetNum + limitNum + 1);
      const hasMore = paginatedTrades.length > limitNum;
      if (hasMore) {
        paginatedTrades.pop();
      }

      // Filter by type if specified
      let filteredTrades = paginatedTrades;
      if (type && type.toUpperCase() !== 'ALL') {
        filteredTrades = paginatedTrades.filter(t => t.type === type.toUpperCase());
      }

      // Format for frontend
      const activities = filteredTrades.map(trade => ({
        id: trade.signature || `${trade.wallet}-${trade.timestamp}`,
        walletAddress: trade.wallet,
        signature: trade.signature,
        type: trade.type,
        tokenIn: trade.type === 'BUY' ? {
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          amount: trade.solAmount?.toString(),
        } : {
          mint: trade.tokenMint,
          symbol: trade.tokenSymbol,
          amount: trade.tokenAmount,
          logoURI: trade.tokenLogoURI
        },
        tokenOut: trade.type === 'BUY' ? {
          mint: trade.tokenMint,
          symbol: trade.tokenSymbol,
          amount: trade.tokenAmount,
          logoURI: trade.tokenLogoURI
        } : {
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          amount: trade.solAmount?.toString(),
        },
        priceUsd: trade.priceUsd?.toString(),
        solAmount: trade.solAmount?.toString(),
        program: 'PumpPortal',
        marketCap: trade.marketCapUsd?.toString(),
        timestamp: new Date(trade.timestamp).toISOString(),
        timeAgo: getTimeAgo(new Date(trade.timestamp))
      }));

      return reply.send({
        activities,
        hasMore
      });
    } catch (error) {
      console.error('Error fetching user trades:', error);
      return reply.code(500).send({ error: 'Failed to fetch user trades' });
    }
  });

  /**
   * GET /api/wallet-tracker/user-trades
   * Get recent trades for all of a user's tracked wallets (new API)
   */
  app.get('/wallet-tracker/user-trades', async (req, reply) => {
    const { userId, limit } = req.query as any;
    const limitNum = parseInt(limit) || 25;

    if (!userId) {
      return reply.code(400).send({ error: 'userId required' });
    }

    try {
      const trades = await walletTrackerService.getUserWalletTrades(userId, limitNum);
      
      return reply.send({
        success: true,
        trades
      });
    } catch (error) {
      console.error('Error fetching user trades:', error);
      return reply.code(500).send({ error: 'Failed to fetch user trades' });
    }
  });

  /**
   * POST /api/wallet-tracker/v2/sync/:walletAddress
   * Sync wallet activities (for now, just returns cached trades)
   */
  app.post('/wallet-tracker/v2/sync/:walletAddress', async (req, reply) => {
    const { walletAddress } = req.params as any;
    const { limit } = req.body as any;
    const limitNum = parseInt(limit) || 100;

    try {
      const trades = await walletTrackerService.getWalletTrades(walletAddress, limitNum);

      return reply.send({
        success: true,
        activitiesCount: trades.length,
        message: `Synced ${trades.length} activities`
      });
    } catch (error) {
      console.error('Error syncing wallet:', error);
      return reply.code(500).send({ error: 'Failed to sync wallet' });
    }
  });

  /**
   * GET /api/wallet-tracker/stats
   * Get tracker statistics
   */
  app.get('/wallet-tracker/stats', async (req, reply) => {
    try {
      const stats = walletTrackerService.getStats();
      return reply.send({ success: true, stats });
    } catch (error) {
      console.error('Error fetching stats:', error);
      return reply.code(500).send({ error: 'Failed to fetch stats' });
    }
  });
}

// ============================================================================
// INITIALIZATION HELPER
// ============================================================================

/**
 * Initialize the wallet tracker service
 * Call this when your backend starts up (in index.ts)
 */
export async function initializeWalletTracker() {
  console.log('[WalletTracker] Initializing...');
  
  // Make sure PumpPortal is started
  if (!pumpPortalStreamService.isConnected) {
    await pumpPortalStreamService.start();
  }
  
  // Load and subscribe to all tracked wallets from database
  await walletTrackerService.initialize();
  
  console.log('[WalletTracker] ✅ Ready');
}

// ============================================================================
// USAGE IN YOUR MAIN APP
// ============================================================================

/*

// In your main index.ts:

import walletTrackerRoutes, { initializeWalletTracker } from './routes/walletTrackerExample.js';

// Register routes
await app.register(walletTrackerRoutes);

// Initialize on startup (after PumpPortal starts)
await initializeWalletTracker();

// To get real-time events in other parts of your code:
import { walletTrackerService } from './services/walletTrackerService-pumpportal.js';

walletTrackerService.on('walletTrade', (trade) => {
  console.log('New trade:', trade);
  // Send to WebSocket clients, store in Redis, etc.
});

*/
