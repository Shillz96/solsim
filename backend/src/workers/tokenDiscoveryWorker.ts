/**
 * Token Discovery Worker
 *
 * Orchestrates real-time token discovery for Warp Pipes Hub.
 * Listens to PumpPortal and Raydium streams, enriches health data,
 * manages state transitions (bonded → graduating → new), and
 * triggers watch notifications.
 *
 * Data Flow:
 * 1. PumpPortal newToken → BONDED tokens
 * 2. PumpPortal migration → GRADUATING → NEW transitions
 * 3. Raydium newPool → NEW tokens (direct listings)
 * 4. Health enrichment → Freeze/Mint/Liquidity/Impact data
 * 5. Watch notifications → User alerts on state changes
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import Redis from 'ioredis';
import { PumpPortalStreamService, NewTokenEvent, MigrationEvent, SwapEvent } from '../services/pumpPortalStreamService.js';
import { raydiumStreamService, NewPoolEvent } from '../services/raydiumStreamService.js';
import { healthCapsuleService } from '../services/healthCapsuleService.js';
import { tokenMetadataService, TokenMetadata } from '../services/tokenMetadataService.js';
import { holderCountService } from '../services/holderCountService.js';
import priceServiceClient from '../plugins/priceServiceClient.js';
import { loggers, truncateWallet, logTokenEvent, logBatchOperation } from '../utils/logger.js';

const logger = loggers.server;

// ============================================================================
// CONFIGURATION
// ============================================================================

class TokenDiscoveryConfig {
  // Update intervals - CRITICAL FIX (2025-10-31): Eliminate database checkpoint storm
  // Root cause: ~147,600 UPDATE queries/hour overwhelmed database with WAL traffic
  // Solution: Redis-first architecture with batch database writes
  static readonly HOT_SCORE_UPDATE_INTERVAL = 900_000; // 15 minutes (was 5min - 67% reduction)
  static readonly WATCHER_SYNC_INTERVAL = 300_000; // 5 minutes (was 1min - 80% reduction)
  static readonly CLEANUP_INTERVAL = 1800_000; // 30 minutes (unchanged)
  static readonly HOLDER_COUNT_UPDATE_INTERVAL = 600_000; // 10 minutes (unchanged)
  static readonly HOLDER_COUNT_CACHE_MIN = 5; // 5 minutes (unchanged)
  static readonly TOKEN_TTL = 7200; // 2 hours cache (was 1h - longer Redis retention)
  static readonly NEW_TOKEN_RETENTION_HOURS = 48; // Keep NEW tokens for 48h (unchanged)
  static readonly BONDED_TOKEN_RETENTION_HOURS = 24; // Keep BONDED for 24h (unchanged)
  static readonly REDIS_TO_DB_SYNC_INTERVAL = 3600_000; // 60 minutes - batch sync Redis data to DB (was 5min - 12x reduction)
  
  static readonly KNOWN_MINTS = {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  };
  
  static readonly MARKET_DATA_UPDATE_INTERVAL = 300_000; // 5 minutes (was 90s - 70% reduction)
  static readonly RATE_LIMIT_DELAY_MS = 300; // 300ms (unchanged)
  static readonly MIN_ACTIVE_VOLUME_SOL = 0.5; // 0.5 SOL minimum (unchanged)
  static readonly MIN_HOLDERS_COUNT = 10; // 10 holders minimum (unchanged)
  static readonly MAX_TRADES_PER_TOKEN = 100; // 100 trades (unchanged)
  static readonly MAX_ACTIVE_TOKENS_SUBSCRIPTION = 500; // 500 tokens (unchanged)
  
  // State classification thresholds - GMGN/Photon style (show tokens EARLY)
  static readonly DEAD_TOKEN_HOURS = 4; // 4 hours (was 2h - less aggressive death classification)
  static readonly MIN_DEAD_VOLUME_SOL = 0.1; // 0.1 SOL (was 0.5 - give tokens more chance)
  static readonly ACTIVE_TOKEN_HOURS = 2; // 2 hours (was 1h - longer active window)
  static readonly ABOUT_TO_BOND_PROGRESS = 70; // 70% (was 75 - earlier notification)
  static readonly ABOUT_TO_BOND_MINUTES = 30; // 30 minutes (was 60 - tighter window)
  static readonly GRADUATING_MIN_PROGRESS = 40; // 40% - most tokens launch at 35%, this catches actively trading tokens
  static readonly GRADUATING_MAX_PROGRESS = 100; // 100%
  static readonly NEW_TOKEN_MAX_PROGRESS = 40; // 40% - show tokens with < 40% progress as "new"
}

// ============================================================================
// INITIALIZATION
// ============================================================================

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || '');

// Create dedicated PumpPortal instance for this worker (prevents EventEmitter leaks)
const pumpPortalStreamService = new PumpPortalStreamService();

// Track intervals for cleanup during shutdown
const intervals: NodeJS.Timeout[] = [];
let isShuttingDown = false;

// Transaction counting - track swap events per token
const txCountMap = new Map<string, Set<string>>(); // mint -> Set of transaction signatures

// ============================================================================
// USER ACTIVITY TRACKING (CRITICAL FIX: Disable jobs when idle)
// ============================================================================

/**
 * Tracks active WebSocket connections to determine if system should run background jobs
 * When activeUserCount = 0, all scheduled jobs are disabled to eliminate unnecessary DB writes
 */
let activeUserCount = 0;

/**
 * Track last activity timestamp to detect idle periods
 */
let lastActivityTimestamp = Date.now();

/**
 * Check if system should run background jobs based on user activity
 * Returns false when system is idle (no users, no recent activity)
 */
function shouldRunBackgroundJobs(): boolean {
  // Always run if there are active users
  if (activeUserCount > 0) {
    return true;
  }

  // If no active users, check if there was recent activity (within last 10 minutes)
  const timeSinceLastActivity = Date.now() - lastActivityTimestamp;
  const IDLE_THRESHOLD = 10 * 60 * 1000; // 10 minutes

  return timeSinceLastActivity < IDLE_THRESHOLD;
}

/**
 * Update active user count (called by WebSocket connection handlers)
 */
export function updateActiveUserCount(count: number): void {
  const previousCount = activeUserCount;
  activeUserCount = count;
  lastActivityTimestamp = Date.now();

  if (previousCount === 0 && count > 0) {
    logger.info({ activeUsers: count }, '🟢 System activated: Users connected, enabling background jobs');
  } else if (previousCount > 0 && count === 0) {
    logger.info({ activeUsers: count }, '🔴 System going idle: No users connected, background jobs will disable after 10min');
  }
}

/**
 * Mark activity (called on any user interaction)
 */
export function markActivity(): void {
  lastActivityTimestamp = Date.now();
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to build optional fields object from source data
 */
function buildOptionalFields<T extends Record<string, any>>(
  source: Record<string, any>,
  fields: (keyof T)[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const field of fields) {
    const value = source[field as string];
    if (value !== undefined && value !== null) {
      result[field] = value;
    }
  }
  return result;
}

/**
 * Manages token state transitions and notifications
 */
class TokenStateManager {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {}

  /**
   * Update token state with transition tracking
   */
  async updateState(mint: string, newState: string, oldState?: string): Promise<void> {
    await this.prisma.tokenDiscovery.update({
      where: { mint },
      data: {
        state: newState,
        previousState: oldState || null,
        stateChangedAt: new Date(),
        lastUpdatedAt: new Date(),
      },
    });

    // Invalidate Redis cache
    await this.redis.del(`token:${mint}`);

    logger.debug({ 
      mint: truncateWallet(mint), 
      oldState, 
      newState 
    }, 'Token state transition');
  }

  /**
   * Classify token into lifecycle state based on trading activity and bonding progress
   */
  classifyTokenState(token: {
    bondingCurveProgress?: Decimal | null;
    isGraduated?: boolean;
    lastTradeTs?: Date | null;
    volume24hSol?: Decimal | null;
    holderCount?: number | null;
    hasFirstTrade?: boolean;
  }): string {
    const now = Date.now();
    const progress = token.bondingCurveProgress ? parseFloat(token.bondingCurveProgress.toString()) : 0;
    
    // Early return: Graduated tokens
    if (progress >= TokenDiscoveryConfig.GRADUATING_MAX_PROGRESS || token.isGraduated) {
      return 'BONDED';
    }
    
    // Early return: No trades yet
    if (!token.hasFirstTrade || !token.lastTradeTs) {
      return 'LAUNCHING';
    }
    
    // Calculate metrics once
    const timeSinceLastTrade = now - token.lastTradeTs.getTime();
    const volume24h = token.volume24hSol ? parseFloat(token.volume24hSol.toString()) : 0;
    const holders = token.holderCount || 0;
    
    // Early return: About to bond (high progress + recent activity)
    const aboutToBondWindow = TokenDiscoveryConfig.ABOUT_TO_BOND_MINUTES * 60 * 1000;
    if (progress >= TokenDiscoveryConfig.ABOUT_TO_BOND_PROGRESS && timeSinceLastTrade < aboutToBondWindow) {
      return 'ABOUT_TO_BOND';
    }
    
    // Early return: Dead tokens (old OR low volume)
    const deadTokenWindow = TokenDiscoveryConfig.DEAD_TOKEN_HOURS * 60 * 60 * 1000;
    if (timeSinceLastTrade > deadTokenWindow || volume24h < TokenDiscoveryConfig.MIN_DEAD_VOLUME_SOL) {
      return 'DEAD';
    }
    
    // Check if active: recent trades + sufficient volume + holders
    const activeTokenWindow = TokenDiscoveryConfig.ACTIVE_TOKEN_HOURS * 60 * 60 * 1000;
    const hasRecentActivity = timeSinceLastTrade < activeTokenWindow;
    const hasMinVolume = volume24h >= TokenDiscoveryConfig.MIN_ACTIVE_VOLUME_SOL;
    const hasMinHolders = holders >= TokenDiscoveryConfig.MIN_HOLDERS_COUNT;
    
    // Return ACTIVE if all conditions met, otherwise LAUNCHING
    return (hasRecentActivity && hasMinVolume && hasMinHolders) ? 'ACTIVE' : 'LAUNCHING';
  }

  /**
   * Notify watchers on state change
   */
  async notifyWatchers(mint: string, oldState: string, newState: string): Promise<void> {
    try {
      // Query watchers based on preferences
      const watchers = await this.prisma.tokenWatch.findMany({
        where: {
          mint,
          OR: [
            // Notify on graduation (bonded → graduating)
            {
              notifyOnGraduation: true,
              currentState: 'bonded',
            },
            // Notify on migration (graduating → new OR bonded → new)
            {
              notifyOnMigration: true,
            },
          ],
        },
        include: {
          user: true,
        },
      });

      if (watchers.length === 0) {
        return;
      }

      logger.debug({
        watcherCount: watchers.length,
        mint: truncateWallet(mint),
        oldState,
        newState
      }, 'Notifying watchers of token state change');

      // TODO: Integrate with NotificationService
      // For now, just log
      for (const watch of watchers) {
        logger.debug({
          userId: watch.userId,
          mint: truncateWallet(mint),
          transition: `${oldState} → ${newState}`
        }, 'User notified of token transition');

        // Example notification payload:
        // await notificationService.create({
        //   userId: watch.userId,
        //   type: 'WALLET_TRACKER_TRADE', // or create new type
        //   category: 'GENERAL',
        //   title: `${oldState} → ${newState}`,
        //   message: `Your watched token ${mint} has transitioned to ${newState}`,
        //   actionUrl: `/room/${mint}`,
        // });
      }
    } catch (error) {
      logger.error({ mint: truncateWallet(mint), error }, 'Error notifying watchers');
    }
  }
}

/**
 * Manages token caching operations
 */
class TokenCacheManager {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis
  ) {}

  /**
   * Cache token row in Redis with TTL
   */
  async cacheTokenRow(mint: string): Promise<void> {
    try {
      const token = await this.prisma.tokenDiscovery.findUnique({ where: { mint } });
      if (!token) return;

      const tokenRow = {
        mint: token.mint,
        symbol: token.symbol,
        name: token.name,
        logoURI: token.logoURI,
        state: token.state,
        liqUsd: token.liquidityUsd ? parseFloat(token.liquidityUsd.toString()) : undefined,
        priceImpactPctAt1pct: token.priceImpact1Pct
          ? parseFloat(token.priceImpact1Pct.toString())
          : undefined,
        freezeRevoked: token.freezeRevoked,
        mintRenounced: token.mintRenounced,
        hotScore: parseFloat(token.hotScore.toString()),
        watcherCount: token.watcherCount,
        firstSeenAt: token.firstSeenAt.toISOString(),
        poolAgeMin: token.poolCreatedAt
          ? Math.floor((Date.now() - token.poolCreatedAt.getTime()) / 60000)
          : undefined,
      };

      // Cache individual token with TTL
      await this.redis.setex(`token:${mint}`, TokenDiscoveryConfig.TOKEN_TTL, JSON.stringify(tokenRow));

      // Add to sorted set by hotScore for fast feed queries
      await this.redis.zadd(
        `tokens:${token.state}`,
        parseFloat(token.hotScore.toString()),
        mint
      );
    } catch (error) {
      logger.error({ mint: truncateWallet(mint), error }, 'Error caching token');
    }
  }

  /**
   * Invalidate token cache
   */
  async invalidateCache(mint: string): Promise<void> {
    await this.redis.del(`token:${mint}`);
  }
}

/**
 * Handles token health enrichment and scoring
 */
class TokenHealthEnricher {
  constructor(
    private prisma: PrismaClient,
    private cacheManager: TokenCacheManager
  ) {}

  /**
   * Enrich token with health capsule data + metadata + market data (async, batched)
   */
  async enrichHealthData(mint: string): Promise<void> {
    try {
      // Get current token to fetch metadata URI
      const currentToken = await this.prisma.tokenDiscovery.findUnique({
        where: { mint },
        select: { logoURI: true },
      });

      // Fetch all data in parallel
      const [healthData, enrichedData] = await Promise.allSettled([
        healthCapsuleService.getHealthData(mint),
        tokenMetadataService.getEnrichedMetadata(mint, currentToken?.logoURI || undefined),
      ]);

      const updateData: any = {
        lastUpdatedAt: new Date(),
      };

      // Add health data if successful
      if (healthData.status === 'fulfilled') {
        updateData.freezeRevoked = healthData.value.freezeRevoked;
        updateData.mintRenounced = healthData.value.mintRenounced;
        if (healthData.value.priceImpact1Pct) {
          updateData.priceImpact1Pct = new Decimal(healthData.value.priceImpact1Pct);
        }
        if (healthData.value.liquidityUsd) {
          updateData.liquidityUsd = new Decimal(healthData.value.liquidityUsd);
        }
      }

      // Add metadata and market data if successful
      if (enrichedData.status === 'fulfilled') {
        const data = enrichedData.value;

        // Metadata fields
        if (data.description) updateData.description = data.description;
        if (data.imageUrl) updateData.imageUrl = data.imageUrl;
        // Ensure logoURI is populated when we have an imageUrl but no existing logoURI
        if (data.imageUrl && !currentToken?.logoURI) {
          updateData.logoURI = data.imageUrl;
        }
        if (data.twitter) updateData.twitter = data.twitter;
        if (data.telegram) updateData.telegram = data.telegram;
        if (data.website) updateData.website = data.website;

        // Market data fields
        if (data.marketCapUsd) updateData.marketCapUsd = new Decimal(data.marketCapUsd);
        if (data.volume24h) updateData.volume24h = new Decimal(data.volume24h);
        if (data.volumeChange24h) updateData.volumeChange24h = new Decimal(data.volumeChange24h);
        if (data.priceUsd) updateData.priceUsd = new Decimal(data.priceUsd);
        if (data.priceChange24h) updateData.priceChange24h = new Decimal(data.priceChange24h);
        if (data.txCount24h) updateData.txCount24h = data.txCount24h;
      }

      // Fetch token supply and decimals from Helius
      try {
        const supplyData = await holderCountService.getTokenSupply(mint);
        if (supplyData) {
          updateData.decimals = supplyData.decimals;
          updateData.totalSupply = supplyData.totalSupply;
        }
      } catch (error) {
        logger.error({ mint: truncateWallet(mint), error }, 'Error fetching token supply');
      }

      await this.prisma.tokenDiscovery.update({
        where: { mint },
        data: updateData,
      });

      // Update cache
      await this.cacheManager.cacheTokenRow(mint);

      logger.debug({ mint: truncateWallet(mint) }, 'Health data enriched for token');
    } catch (error) {
      logger.error({ mint: truncateWallet(mint), error }, 'Error enriching health data');
    }
  }

  /**
   * Calculate hot score based on recency, liquidity, and watchers
   */
  async calculateHotScore(mint: string): Promise<number> {
    try {
      const token = await this.prisma.tokenDiscovery.findUnique({ where: { mint } });
      if (!token) return 0;

      const ageMinutes = (Date.now() - token.firstSeenAt.getTime()) / 60000;

      // Recency score: 100 at creation, decay to 0 over 24 hours
      const recencyScore = Math.max(0, 100 - (ageMinutes / 1440) * 100);

      // Liquidity score: $50k = 100 points
      const liqUsd = token.liquidityUsd ? parseFloat(token.liquidityUsd.toString()) : 0;
      const liquidityScore = Math.min((liqUsd / 50000) * 100, 100);

      // Watcher score: each watcher = 10 points, cap at 100
      const watcherScore = Math.min(token.watcherCount * 10, 100);

      // Combined formula: 50% recency, 30% liquidity, 20% watchers
      const hotScore = recencyScore * 0.5 + liquidityScore * 0.3 + watcherScore * 0.2;

      return Math.round(hotScore);
    } catch (error) {
      logger.error({ mint: truncateWallet(mint), error }, 'Error calculating hot score');
      return 0;
    }
  }
}

// ============================================================================
// SERVICE INSTANCES
// ============================================================================

const stateManager = new TokenStateManager(prisma, redis);
const cacheManager = new TokenCacheManager(prisma, redis);
const healthEnricher = new TokenHealthEnricher(prisma, cacheManager);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Handle swap event → Update transaction count and last trade timestamp
 */
async function handleSwap(event: SwapEvent): Promise<void> {
  try {
    const { mint, timestamp, txType, solAmount, tokenAmount, user } = event;

    // Validate and convert timestamp (handle both seconds and milliseconds)
    let tradeDate: Date;
    try {
      // If timestamp is already in milliseconds (> year 2100 in seconds = 4102444800)
      const timestampMs = timestamp > 4102444800 ? timestamp : timestamp * 1000;
      tradeDate = new Date(timestampMs);

      // Validate date is reasonable (between 2020 and 2050)
      if (tradeDate.getFullYear() < 2020 || tradeDate.getFullYear() > 2050) {
        logger.warn({ mint: truncateWallet(mint), timestamp, parsed: tradeDate.toISOString() }, 'Invalid timestamp');
        tradeDate = new Date(); // Fallback to current time
      }
    } catch (error) {
      logger.error({ timestamp, error }, 'Error parsing timestamp');
      tradeDate = new Date();
    }

    // Store trade in Redis for market data panel (keep last 50 trades per token)
    // NOTE: Database sync happens in batch via syncRedisToDatabase() every 5 minutes
    const tradeData = {
      type: txType,
      solAmount,
      tokenAmount,
      user,
      timestamp,
    };

    // Add to sorted set (score = timestamp)
    await redis.zadd(
      `market:trades:${mint}`,
      timestamp,
      JSON.stringify(tradeData)
    );

    // Keep only last 50 trades
    await redis.zremrangebyrank(`market:trades:${mint}`, 0, -51);

    // Expire after 1 hour
    await redis.expire(`market:trades:${mint}`, 3600);

    // Calculate price from swap event and save DIRECTLY to database (no API polling needed!)
    if (solAmount && tokenAmount && solAmount > 0 && tokenAmount > 0) {
      const priceSol = solAmount / tokenAmount; // SOL per token
      const solPriceUsd = priceServiceClient.getSolPrice(); // Get SOL/USD price
      const priceUsd = priceSol * solPriceUsd; // USD per token

      if (priceUsd > 0 && solPriceUsd > 0) {
        // Cache in Redis for main API
        const priceTick = {
          mint,
          priceUsd,
          priceSol,
          solUsd: solPriceUsd,
          timestamp: Date.now(),
          source: 'pumpportal-swap'
        };
        await redis.setex(`prices:${mint}`, 300, JSON.stringify(priceTick));

        // NOTE: Database price sync happens in batch via syncRedisToDatabase() every 5 minutes

        logger.debug({
          mint: mint.slice(0, 8),
          priceUsd: priceUsd.toFixed(8),
          txType
        }, 'Updated price from swap event');
      }
    }

    // Update trader stats for top traders leaderboard
    if (user) {
      const traderKey = `market:traders:${mint}`;
      const existingData = await redis.hget(traderKey, user);
      const traderStats = existingData ? JSON.parse(existingData) : {
        buyVolume: 0,
        sellVolume: 0,
        trades: 0,
      };

      if (txType === 'buy') {
        traderStats.buyVolume += solAmount || 0;
      } else {
        traderStats.sellVolume += solAmount || 0;
      }
      traderStats.trades += 1;
      traderStats.pnl = traderStats.sellVolume - traderStats.buyVolume; // Simple PnL estimate

      await redis.hset(traderKey, user, JSON.stringify(traderStats));
      await redis.expire(traderKey, 86400); // 24 hours
    }

    // Use timestamp as unique identifier (in real scenario, use signature)
    const txId = `${mint}-${timestamp}`;

    if (!txCountMap.has(mint)) {
      txCountMap.set(mint, new Set());
    }

      txCountMap.get(mint)!.add(txId);
  } catch (error) {
    logger.error({ error }, 'Error handling swap event');
  }
}// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle PumpPortal newToken event → Create BONDED token
 */
async function handleNewToken(event: NewTokenEvent): Promise<void> {
  const mint = event.token?.mint;
  
  // DEBUG: Log EVERY newToken event received
  console.log('[TokenDiscovery] 🎯 handleNewToken called for:', mint, event.token?.name || event.token?.symbol);
  
  try {
    const {
      name,
      symbol,
      uri,
      creator,
      bondingCurve,
      marketCapSol,
      vTokensInBondingCurve,
      vSolInBondingCurve,
      holderCount,
      twitter,
      telegram,
      website,
      description
    } = event.token;

    if (!mint) {
      logger.error({ event }, 'newToken event missing mint address');
      return;
    }

    // CRITICAL: Reject tokens with NO metadata (likely fake/spam)
    // These tokens don't exist on-chain and pollute ALL state columns (new, graduating, bonded)
    // Must check BEFORE state classification to prevent tokens from appearing in any column
    if (!symbol && !name && !uri) {
      logger.warn({ 
        mint: truncateWallet(mint),
        hasBondingCurve: !!bondingCurve,
        hasMarketCap: !!marketCapSol,
        vSolInBondingCurve,
        wouldBeState: vSolInBondingCurve && vTokensInBondingCurve 
          ? (vSolInBondingCurve / 85 * 100 >= 100 ? 'bonded' : vSolInBondingCurve / 85 * 100 >= 15 ? 'graduating' : 'new')
          : 'unknown'
      }, 'Rejecting token with NO metadata (likely fake/spam) - prevents pollution of ALL state columns');
      return;
    }

    logTokenEvent(logger, 'bonded', truncateWallet(mint), symbol || truncateWallet(mint));

    // Calculate bonding curve progress if we have the data
    let bondingCurveProgress = null;
    let tokenState: 'bonded' | 'graduating' | 'new' = 'new';
    let liquidityUsd = null;
    let marketCapUsd = null;

    // Convert marketCapSol to USD
    if (marketCapSol) {
      try {
        const solPrice = priceServiceClient.getSolPrice();
        if (solPrice > 0) {
          marketCapUsd = new Decimal(marketCapSol).mul(solPrice);
          logger.debug({ marketCapSol, marketCapUsd: marketCapUsd.toFixed(2) }, 'Market cap calculated');
        } else {
          logger.warn({ mint: truncateWallet(mint), solPrice }, 'Invalid SOL price, skipping market cap calculation');
        }
      } catch (err) {
        logger.error({ mint: truncateWallet(mint), error: err }, 'Error getting SOL price for market cap');
      }
    }

    if (vTokensInBondingCurve && vSolInBondingCurve) {
      // Progress = (SOL in curve / 85 SOL target) * 100
      bondingCurveProgress = new Decimal(vSolInBondingCurve).div(85).mul(100);
      const progress = parseFloat(bondingCurveProgress.toString());

      // NEW: Brand new launches (< 40% progress)
      if (progress < TokenDiscoveryConfig.NEW_TOKEN_MAX_PROGRESS) {
        tokenState = 'new';
      }
      // GRADUATING: Actively progressing towards completion (40-100%)
      else if (progress >= TokenDiscoveryConfig.GRADUATING_MIN_PROGRESS &&
               progress < TokenDiscoveryConfig.GRADUATING_MAX_PROGRESS) {
        tokenState = 'graduating';
      }
      // BONDED: Completed bonding curve (100%+)
      else {
        tokenState = 'bonded';
      }

      // Calculate initial liquidity from bonding curve SOL
      try {
        const liquidityCalc = await healthCapsuleService.calculateBondingCurveLiquidity(vSolInBondingCurve);
        liquidityUsd = new Decimal(liquidityCalc);
      } catch (error) {
        logger.error({ mint: truncateWallet(mint), error }, 'Error calculating bonding curve liquidity');
      }
    }

    // Helpers to correctly detect and normalize image URLs
    const isLikelyImageUrl = (u?: string | null): boolean => !!u && /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(u);
    const convertIPFStoHTTP = (u?: string | null): string | undefined => {
      if (!u) return undefined;
      if (u.startsWith('http://') || u.startsWith('https://')) return u;
      if (u.startsWith('//')) return `https:${u}`;
      if (u.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${u.replace('ipfs://', '').replace(/^ipfs\//, '')}`;
      if (/^[a-zA-Z0-9]{46,100}$/.test(u)) return `https://ipfs.io/ipfs/${u}`;
      if (u.startsWith('ar://')) return `https://arweave.net/${u.replace('ar://', '')}`;
      if (u.startsWith('dd.dexscreener.com')) return `https://${u}`;
      return u;
    };

    // IMPORTANT: Only treat uri as an image if it looks like an image, otherwise it may be a metadata JSON
    const httpLogoURI = isLikelyImageUrl(uri) ? convertIPFStoHTTP(uri) : undefined;

    // Fetch additional metadata from URI if not provided directly
    let metadata: TokenMetadata = {};
    // Fetch metadata when we either miss core fields OR we don't yet have a logo image
    if (uri && (!name || !symbol || !description || !twitter || !telegram || !website || !httpLogoURI)) {
      try {
        metadata = await tokenMetadataService.fetchMetadataFromIPFS(uri);
        
        // CRITICAL FIX: Override empty name/symbol with metadata
        if (!name && metadata.name) {
          console.log(`✅ [TokenDiscovery] Got name from IPFS for ${truncateWallet(mint)}: ${metadata.name}`);
        }
        if (!symbol && metadata.symbol) {
          console.log(`✅ [TokenDiscovery] Got symbol from IPFS for ${truncateWallet(mint)}: ${metadata.symbol}`);
        }
      } catch (err) {
        logger.warn({ mint: truncateWallet(mint), uri, error: err }, 'Failed to fetch metadata from IPFS');
      }
    }

    // Get current transaction count for this token
    const txCount = txCountMap.get(mint)?.size || 0;

    // Fetch token supply and decimals from Helius (async - don't block token creation)
    let tokenSupply: string | undefined;
    let tokenDecimals: number | undefined;
    try {
      const supplyData = await holderCountService.getTokenSupply(mint);
      if (supplyData) {
        tokenSupply = supplyData.totalSupply;
        tokenDecimals = supplyData.decimals;
      }
    } catch (err) {
      logger.warn({ mint: truncateWallet(mint), error: err }, 'Failed to fetch token supply on new token');
    }

    // Upsert to database
    try {
      await prisma.tokenDiscovery.upsert({
        where: { mint },
        create: {
          mint,
          symbol: symbol || metadata.symbol || null,  // ✅ Use metadata fallback
          name: name || metadata.name || null,        // ✅ Use metadata fallback
          // Prefer image from metadata; fall back to uri only if it's an image
          logoURI: (metadata.imageUrl ? convertIPFStoHTTP(metadata.imageUrl) : (httpLogoURI || null)) || null,
          imageUrl: metadata.imageUrl ? convertIPFStoHTTP(metadata.imageUrl) : null,
          description: description || metadata.description || null,
          twitter: twitter || metadata.twitter || null,
          telegram: telegram || metadata.telegram || null,
          website: website || metadata.website || null,
          creatorWallet: creator || null,
          holderCount: holderCount || null,
          decimals: tokenDecimals || null,
          totalSupply: tokenSupply || null,
          txCount24h: txCount > 0 ? txCount : null,
          state: tokenState,
          bondingCurveKey: bondingCurve || null,
          bondingCurveProgress: bondingCurveProgress,
          liquidityUsd: liquidityUsd,
          marketCapUsd: marketCapUsd, // ✅ Save market cap from PumpPortal
          hotScore: new Decimal(100), // New tokens start hot
          watcherCount: 0,
          freezeRevoked: false,
          mintRenounced: false,
          creatorVerified: false,
          firstSeenAt: new Date(),
          lastUpdatedAt: new Date(),
          stateChangedAt: new Date(),
        },
        update: {
          lastUpdatedAt: new Date(),
          // Update metadata if available (prefer previously fetched IPFS metadata fields)
          ...(description && { description }),
          ...(twitter && { twitter }),
          ...(telegram && { telegram }),
          ...(website && { website }),
          ...(metadata.imageUrl && { imageUrl: convertIPFStoHTTP(metadata.imageUrl) }),
          // Ensure logoURI is set when metadata has an image (regardless of httpLogoURI)
          ...(metadata.imageUrl ? { logoURI: convertIPFStoHTTP(metadata.imageUrl) } : {}),
          ...(holderCount && { holderCount }),
          ...(tokenDecimals && { decimals: tokenDecimals }),
          ...(tokenSupply && { totalSupply: tokenSupply }),
          ...(txCount > 0 && { txCount24h: txCount }),
          // Update progress and potentially state if available
          ...(bondingCurveProgress && {
            bondingCurveProgress,
            // Update state if crossing the 95% threshold
            ...(bondingCurveProgress.gte(95) && { state: 'graduating' }),
          }),
          // Update liquidity if available
          ...(liquidityUsd && { liquidityUsd }),
          // Update market cap if available
          ...(marketCapUsd && { marketCapUsd }),
        },
      });
    } catch (err) {
      logger.error({ mint: truncateWallet(mint), error: err }, 'Database upsert failed for newToken event');
      return; // Don't continue if DB operation failed
    }

    // Cache in Redis
    try {
      await cacheManager.cacheTokenRow(mint);
    } catch (err) {
      logger.error({ mint: truncateWallet(mint), error: err }, 'Redis cache failed for newToken event');
    }

    // Async health enrichment (non-blocking)
    healthEnricher.enrichHealthData(mint).catch((err) =>
      logger.error({ mint: truncateWallet(mint), error: err }, 'Health enrichment error')
    );
  } catch (error) {
    logger.error({ mint: mint ? truncateWallet(mint) : 'unknown', error, event }, 'Error handling newToken event');
  }
}

/**
 * Handle PumpPortal migration event → BONDED → GRADUATING → NEW
 */
async function handleMigration(event: MigrationEvent): Promise<void> {
  try {
    const { mint, data } = event;
    const { status, poolAddress, poolType } = data;

    logger.info({ 
      mint: truncateWallet(mint), 
      status,
      poolType 
    }, 'Token migration event');

    // Fetch current token state
    const currentToken = await prisma.tokenDiscovery.findUnique({
      where: { mint },
    });

    if (!currentToken) {
      logger.warn({ mint: truncateWallet(mint) }, 'Migration event for unknown token');
      return;
    }

    let newState: string;

    if (status === 'initiated') {
      // bonded → graduating
      newState = 'graduating';
    } else if (status === 'completed') {
      // graduating → bonded (has LP now)
      newState = 'bonded';

      // Update pool data
      await prisma.tokenDiscovery.update({
        where: { mint },
        data: {
          poolAddress: poolAddress || null,
          poolType: poolType || 'pumpswap',
          poolCreatedAt: new Date(),
        },
      });
    } else {
      logger.warn({ status }, 'Unknown migration status');
      return;
    }

    // Update state
    await stateManager.updateState(mint, newState, currentToken.state);

    // Notify watchers
    await stateManager.notifyWatchers(mint, currentToken.state, newState);
  } catch (error) {
    logger.error({ error }, 'Error handling migration event');
  }
}

/**
 * Handle Raydium newPool event → Create/update NEW token
 */
async function handleNewPool(event: NewPoolEvent): Promise<void> {
  try {
    const { poolAddress, mint1, mint2, signature, blockTime } = event.pool;

    // Determine which mint is the token (not SOL/USDC/USDT)
    const knownMints = Object.values(TokenDiscoveryConfig.KNOWN_MINTS);
    const tokenMint = knownMints.includes(mint1) ? mint2 : mint1;

    logger.info({ tokenMint: truncateWallet(tokenMint), poolType: 'raydium' }, 'New Raydium pool discovered');

    // Check if token already exists (migration path)
    const existing = await prisma.tokenDiscovery.findUnique({
      where: { mint: tokenMint },
    });

    if (existing) {
      // Update existing token to BONDED state (has LP now)
      logger.info({ 
        tokenMint: truncateWallet(tokenMint), 
        previousStatus: 'GRADUATING',
        newStatus: 'BONDED' 
      }, 'Token graduated to bonded state');

      await stateManager.updateState(tokenMint, 'bonded', existing.state);
      await prisma.tokenDiscovery.update({
        where: { mint: tokenMint },
        data: {
          poolAddress,
          poolType: 'raydium',
          poolCreatedAt: new Date(blockTime * 1000),
        },
      });

      // Notify watchers
      await stateManager.notifyWatchers(tokenMint, existing.state, 'bonded');
    } else {
      // Direct Raydium listing (not from Pump.fun) - has LP, so BONDED
      logger.info({ tokenMint: truncateWallet(tokenMint), listingType: 'direct_raydium' }, 'Creating direct Raydium listing');

      await prisma.tokenDiscovery.create({
        data: {
          mint: tokenMint,
          state: 'bonded',
          poolAddress,
          poolType: 'raydium',
          poolCreatedAt: new Date(blockTime * 1000),
          hotScore: new Decimal(80), // Direct listings slightly less hot than new bonded
          watcherCount: 0,
          freezeRevoked: false,
          mintRenounced: false,
          firstSeenAt: new Date(),
          lastUpdatedAt: new Date(),
          stateChangedAt: new Date(),
        },
      });
    }

    // Cache in Redis
    await cacheManager.cacheTokenRow(tokenMint);

    // Async health enrichment
    healthEnricher.enrichHealthData(tokenMint).catch((err) =>
      logger.error({ mint: truncateWallet(tokenMint), error: err }, 'Health enrichment error')
    );
  } catch (error) {
    logger.error({ error }, 'Error handling newPool event');
  }
}

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

/**
 * Batch sync Redis data to database (replaces real-time writes from handleSwap)
 * Runs every 60 minutes to persist accumulated price/trade data
 * CRITICAL FIX (2025-11-03): Reduced frequency from 5min to 60min (12x reduction)
 */
async function syncRedisToDatabase(): Promise<void> {
  try {
    // CRITICAL: Skip if no users active (eliminates ~1,200 writes/hour when idle)
    if (!shouldRunBackgroundJobs()) {
      logger.debug({ operation: 'redis_to_db_sync', reason: 'no_active_users' }, 'Skipping Redis-to-DB sync - system idle');
      return;
    }

    logger.debug({ operation: 'redis_to_db_sync' }, 'Starting batch sync from Redis to database');

    // Get all price keys from Redis
    const priceKeys = await redis.keys('prices:*');
    
    if (priceKeys.length === 0) {
      logger.debug({ operation: 'redis_to_db_sync' }, 'No prices to sync');
      return;
    }

    // Batch fetch all prices
    const pipeline = redis.pipeline();
    for (const key of priceKeys) {
      pipeline.get(key);
    }
    const priceResults = await pipeline.exec();

    // Prepare batch updates
    const updates: Array<{ mint: string; priceUsd: Decimal; lastTradeTs: Date }> = [];
    
    for (let i = 0; i < priceKeys.length; i++) {
      const key = priceKeys[i];
      const result = priceResults?.[i];
      
      if (!result || result[0] || !result[1]) continue; // Skip errors or null values
      
      try {
        const mint = key.replace('prices:', '');
        const priceData = JSON.parse(result[1] as string);
        
        if (priceData.priceUsd && priceData.timestamp) {
          updates.push({
            mint,
            priceUsd: new Decimal(priceData.priceUsd),
            lastTradeTs: new Date(priceData.timestamp)
          });
        }
      } catch (err) {
        logger.warn({ key, error: err }, 'Failed to parse price data from Redis');
      }
    }

    if (updates.length === 0) {
      logger.debug({ operation: 'redis_to_db_sync' }, 'No valid prices to sync');
      return;
    }

    // Execute batch update in a transaction
    let successCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        try {
          await tx.tokenDiscovery.updateMany({
            where: { mint: update.mint },
            data: {
              priceUsd: update.priceUsd,
              lastTradeTs: update.lastTradeTs,
              lastUpdatedAt: new Date()
            }
          });
          successCount++;
        } catch (err) {
          // Token might not exist in DB yet - skip silently
          logger.debug({ mint: truncateWallet(update.mint) }, 'Token not in database, skipping price update');
        }
      }
    });

    logger.info({ 
      total: priceKeys.length,
      updated: successCount,
      operation: 'redis_to_db_sync'
    }, 'Completed batch sync from Redis to database');

  } catch (error) {
    logger.error({ error }, 'Error in syncRedisToDatabase');
  }
}

/**
 * Update market data and classify token states every 5 minutes
 * CRITICAL FIX (2025-11-03): Skip when idle to reduce database writes
 */
async function updateMarketDataAndStates() {
  try {
    // CRITICAL: Skip if no users active (eliminates ~600 writes/hour when idle)
    if (!shouldRunBackgroundJobs()) {
      logger.debug({ operation: 'market_data_update', reason: 'no_active_users' }, 'Skipping market data update - system idle');
      return;
    }

    // Align with warpPipes feed config (72 hours) to ensure all visible tokens get fresh data
    const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

    // Fetch recent tokens (exclude DEAD to save API calls)
    const activeTokens = await prisma.tokenDiscovery.findMany({
      where: {
        status: { not: 'DEAD' },
        OR: [
          { state: 'bonded', stateChangedAt: { gte: seventyTwoHoursAgo } },
          { state: 'graduating' },
          { state: 'new', firstSeenAt: { gte: seventyTwoHoursAgo } }
        ]
      },
      select: {
        mint: true,
        bondingCurveProgress: true,
        lastTradeTs: true,
        volume24hSol: true,
        holderCount: true,
        marketCapUsd: true, // CRITICAL: Need existing marketCap to calculate price when DexScreener rate limited
        priceUsd: true, // Also get current price to avoid unnecessary recalculations
      },
      take: 50, // Small limit - PumpPortal swap events provide real-time prices, DexScreener only for fallback
      orderBy: { lastUpdatedAt: 'asc' } // Update oldest first
    });

    logBatchOperation(logger, 'market_data_update', activeTokens.length);

    // Batch update with rate limiting
    let updated = 0;
    for (const token of activeTokens) {
      try {
        // Fetch fresh market data from DexScreener
        const marketData = await tokenMetadataService.fetchMarketData(token.mint);

        // Log what DexScreener returned
        logger.debug({
          mint: token.mint.slice(0, 8),
          priceUsd: marketData.priceUsd,
          priceChange24h: marketData.priceChange24h,
          marketCapUsd: marketData.marketCapUsd
        }, 'DexScreener market data');

        // Fallback chain: Redis cache → Jupiter API
        if (!marketData.priceUsd || marketData.priceUsd === 0) {
          // Try Redis cache first (written by main priceService from PumpPortal)
          try {
            const cachedPrice = await priceServiceClient.getPrice(token.mint);
            if (cachedPrice && cachedPrice > 0) {
              marketData.priceUsd = cachedPrice;
              logger.debug({ mint: token.mint.slice(0, 8), price: cachedPrice }, 'Using cached price from Redis');
            } else {
              logger.debug({ mint: token.mint.slice(0, 8), cachedPrice }, 'Redis cache returned no price or zero');
            }
          } catch (err) {
            logger.debug({ mint: token.mint.slice(0, 8), err }, 'Redis price cache lookup failed');
          }

          // If Redis cache also failed, try Jupiter as final fallback
          if (!marketData.priceUsd || marketData.priceUsd === 0) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 8000);

              const response = await fetch(
                `https://lite-api.jup.ag/price/v3?ids=${token.mint}`,
                {
                  signal: controller.signal,
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'VirtualSol/1.0'
                  }
                }
              );
              clearTimeout(timeoutId);

              if (response.ok) {
                const data = await response.json();
                if (data.data && data.data[token.mint] && data.data[token.mint].price) {
                  const jupiterPrice = parseFloat(data.data[token.mint].price);
                  if (jupiterPrice > 0) {
                    marketData.priceUsd = jupiterPrice;
                    logger.debug({ mint: token.mint.slice(0, 8), price: jupiterPrice }, 'Using Jupiter price fallback');
                  }
                }
              } else if (response.status === 204) {
                logger.debug({ mint: token.mint.slice(0, 8) }, 'Jupiter returned 204 (no price data)');
              } else {
                logger.debug({ mint: token.mint.slice(0, 8), status: response.status }, 'Jupiter API error');
              }
            } catch (err: any) {
              if (err.name !== 'AbortError') {
                logger.debug({ mint: token.mint.slice(0, 8), err: err.message }, 'Jupiter price fallback failed');
              }
            }
          }
        }

        // Final fallback: Calculate price from marketCap (new OR existing from database)
        // Pump.fun tokens have 1 billion total supply (1,000,000,000 tokens)
        // Use fresh marketCap from DexScreener, or fall back to existing database value
        const finalMarketCap = marketData.marketCapUsd || (token.marketCapUsd ? parseFloat(token.marketCapUsd.toString()) : null);

        if ((!marketData.priceUsd || marketData.priceUsd === 0) && finalMarketCap && finalMarketCap > 0) {
          const PUMP_TOTAL_SUPPLY = 1_000_000_000;
          marketData.priceUsd = finalMarketCap / PUMP_TOTAL_SUPPLY;
          logger.debug({
            mint: token.mint.slice(0, 8),
            marketCap: finalMarketCap,
            calculatedPrice: marketData.priceUsd,
            source: marketData.marketCapUsd ? 'dexscreener' : 'database-cached'
          }, 'Calculated price from marketCap');
        }

        // Calculate new state
        const newStatus = stateManager.classifyTokenState({
          bondingCurveProgress: token.bondingCurveProgress,
          lastTradeTs: token.lastTradeTs,
          volume24hSol: token.volume24hSol,
          holderCount: token.holderCount,
          hasFirstTrade: !!token.lastTradeTs,
        });
        
        // Build update object
        const updateData: any = {
          status: newStatus,
          lastUpdatedAt: new Date(),
        };
        
        // Market data fields
        if (marketData.marketCapUsd) updateData.marketCapUsd = new Decimal(marketData.marketCapUsd);
        if (marketData.volume24h) {
          updateData.volume24h = new Decimal(marketData.volume24h);
          // Convert USD volume to SOL volume
          const solPrice = priceServiceClient.getSolPrice();
          if (solPrice > 0) {
            updateData.volume24hSol = new Decimal(marketData.volume24h / solPrice);
          }
        }
        if (marketData.volumeChange24h) updateData.volumeChange24h = new Decimal(marketData.volumeChange24h);
        // CRITICAL: Use > 0 instead of truthy check to handle very small prices
        if (marketData.priceUsd && marketData.priceUsd > 0) updateData.priceUsd = new Decimal(marketData.priceUsd);
        if (marketData.priceChange24h) updateData.priceChange24h = new Decimal(marketData.priceChange24h);
        if (marketData.txCount24h) updateData.txCount24h = marketData.txCount24h;

        // Log what we're about to save (with more detail for debugging)
        logger.info({
          mint: token.mint.slice(0, 8),
          priceUsd: marketData.priceUsd,
          priceType: typeof marketData.priceUsd,
          willSave: !!(marketData.priceUsd && marketData.priceUsd > 0),
          marketCapUsd: marketData.marketCapUsd,
          priceChange24h: marketData.priceChange24h
        }, 'Market data before save');

        await prisma.tokenDiscovery.update({
          where: { mint: token.mint },
          data: updateData
        });
        
        updated++;
      } catch (error) {
        logger.error({ mint: truncateWallet(token.mint), error }, 'Error updating token');
      }
      
      // Rate limit: 300ms delay between requests to avoid DexScreener 429 errors
      await new Promise(resolve => setTimeout(resolve, TokenDiscoveryConfig.RATE_LIMIT_DELAY_MS));
    }
    
    logger.debug({ updated, total: activeTokens.length, operation: 'market_data_update' }, 'Market data batch update completed');
  } catch (error) {
    logger.error({ error }, 'Error in updateMarketDataAndStates');
  }
}

/**
 * Recalculate hot scores for all active tokens
 * CRITICAL FIX (2025-11-03): Batch UPDATE to eliminate individual queries
 */
async function recalculateHotScores(): Promise<void> {
  try {
    // CRITICAL: Skip if no users active (eliminates ~2,000 writes/hour when idle)
    if (!shouldRunBackgroundJobs()) {
      logger.debug({ operation: 'hot_scores_calculation', reason: 'no_active_users' }, 'Skipping hot scores recalculation - system idle');
      return;
    }

    if (logger.isLevelEnabled('debug')) {
      logger.debug({ operation: 'hot_scores_calculation' }, 'Starting hot scores recalculation');
    }

    const tokens = await prisma.tokenDiscovery.findMany({
      where: {
        state: { in: ['bonded', 'graduating', 'new'] },
      },
      select: {
        mint: true,
        state: true,
        bondingCurveProgress: true,
        poolAddress: true,
        firstSeenAt: true,
        liquidityUsd: true,
        watcherCount: true,
        hotScore: true, // Get current score to check if changed
      }
    });

    if (tokens.length === 0) {
      logger.debug({ operation: 'hot_scores_calculation' }, 'No tokens to update');
      return;
    }

    // Calculate all hot scores first
    const scoreUpdates: Array<{ mint: string; newScore: number; currentScore: number }> = [];

    for (const token of tokens) {
      try {
        const ageMinutes = (Date.now() - token.firstSeenAt.getTime()) / 60000;
        const recencyScore = Math.max(0, 100 - (ageMinutes / 1440) * 100);
        const liqUsd = token.liquidityUsd ? parseFloat(token.liquidityUsd.toString()) : 0;
        const liquidityScore = Math.min((liqUsd / 50000) * 100, 100);
        const watcherScore = Math.min(token.watcherCount * 10, 100);
        const newScore = Math.round(recencyScore * 0.5 + liquidityScore * 0.3 + watcherScore * 0.2);
        const currentScore = parseFloat(token.hotScore.toString());

        // Only update if score changed (skip unchanged data)
        if (newScore !== currentScore) {
          scoreUpdates.push({ mint: token.mint, newScore, currentScore });
        }

        // Handle state transitions inline (these are rare, so individual updates are OK)
        const progress = token.bondingCurveProgress ? parseFloat(token.bondingCurveProgress.toString()) : 0;
        if (token.state === 'new' && progress >= TokenDiscoveryConfig.GRADUATING_MIN_PROGRESS && progress < TokenDiscoveryConfig.GRADUATING_MAX_PROGRESS) {
          await stateManager.updateState(token.mint, 'graduating', token.state);
        } else if (token.state === 'graduating' && (progress >= TokenDiscoveryConfig.GRADUATING_MAX_PROGRESS || token.poolAddress)) {
          await stateManager.updateState(token.mint, 'bonded', token.state);
        } else if (token.state === 'new' && (progress >= TokenDiscoveryConfig.GRADUATING_MAX_PROGRESS || token.poolAddress)) {
          await stateManager.updateState(token.mint, 'bonded', token.state);
        }
      } catch (error: any) {
        logger.error({ mint: truncateWallet(token.mint), error: error.message }, 'Error calculating hot score');
      }
    }

    // CRITICAL: Batch update ALL scores in single query using CASE statement
    // This replaces 500+ individual UPDATEs with 1 query (500x reduction!)
    if (scoreUpdates.length > 0) {
      const caseStatements = scoreUpdates.map(({ mint, newScore }) =>
        `WHEN mint = '${mint}' THEN ${newScore}`
      ).join(' ');

      const mintList = scoreUpdates.map(({ mint }) => `'${mint}'`).join(', ');

      await prisma.$executeRawUnsafe(`
        UPDATE "TokenDiscovery"
        SET "hotScore" = CASE ${caseStatements} END
        WHERE mint IN (${mintList})
      `);

      logger.info({
        updated: scoreUpdates.length,
        skipped: tokens.length - scoreUpdates.length,
        operation: 'hot_scores_update'
      }, 'Hot scores batch update completed');
    } else {
      logger.debug({
        total: tokens.length,
        operation: 'hot_scores_update'
      }, 'No hot score changes needed');
    }
  } catch (error) {
    logger.error({ error }, 'Error recalculating hot scores');
  }
}

/**
 * Update holder counts for active tokens using Helius RPC
 * Runs every 10 minutes to keep holder data fresh
 * CRITICAL FIX (2025-11-03): Batch UPDATE to eliminate individual queries
 */
async function updateHolderCounts(): Promise<void> {
  try {
    // CRITICAL: Skip if no users active (eliminates ~600 writes/hour when idle)
    if (!shouldRunBackgroundJobs()) {
      logger.debug({ operation: 'holder_counts_update', reason: 'no_active_users' }, 'Skipping holder counts update - system idle');
      return;
    }

    logger.debug({ operation: 'holder_counts_update' }, 'Starting holder counts update');

    // Calculate cache cutoff (don't re-fetch if updated within last 5 minutes)
    const cacheCutoff = new Date(Date.now() - TokenDiscoveryConfig.HOLDER_COUNT_CACHE_MIN * 60 * 1000);

    // Fetch active tokens (exclude DEAD tokens and recently updated)
    // Prioritize: 1) NULL counts, 2) Stale data, 3) Active trading tokens
    const activeTokens = await prisma.tokenDiscovery.findMany({
      where: {
        status: { not: 'DEAD' },
        state: { in: ['bonded', 'graduating', 'new'] },
        // Only fetch if holderCount is null OR lastUpdatedAt is older than cache period
        OR: [
          { holderCount: null },
          { lastUpdatedAt: { lt: cacheCutoff } }
        ]
      },
      select: {
        mint: true,
        symbol: true,
        holderCount: true,
        lastUpdatedAt: true,
        volume24hSol: true, // For prioritizing active tokens
      },
      take: 100, // Increased from 50 to 100 - Helius can handle more with batching
      orderBy: [
        { holderCount: 'asc' }, // Prioritize null/0 holder counts first (new tokens)
        { volume24hSol: 'desc' }, // Then by trading volume (active tokens)
        { lastUpdatedAt: 'asc' }, // Finally oldest updates
      ],
    });

    if (activeTokens.length === 0) {
      logger.debug({ operation: 'holder_counts_update' }, 'No active tokens to update holder counts for');
      return;
    }

    logger.debug({ count: activeTokens.length, operation: 'holder_counts_fetch' }, 'Fetching holder counts for active tokens');

    // Batch fetch holder counts (holderCountService handles rate limiting internally)
    const mints = activeTokens.map(t => t.mint);
    const holderCounts = await holderCountService.getHolderCounts(mints);

    // Prepare batch updates (only update if count changed)
    const holderUpdates: Array<{ mint: string; holderCount: number; currentCount: number | null }> = [];
    let failed = 0;

    for (const token of activeTokens) {
      const holderCount = holderCounts.get(token.mint);

      if (holderCount !== null && holderCount !== undefined) {
        // Skip unchanged data
        if (holderCount !== token.holderCount) {
          holderUpdates.push({ mint: token.mint, holderCount, currentCount: token.holderCount });
        }
      } else {
        failed++;
      }
    }

    // CRITICAL: Batch update ALL holder counts in single query using CASE statement
    // This replaces 100 individual UPDATEs with 1 query (100x reduction!)
    if (holderUpdates.length > 0) {
      const caseStatements = holderUpdates.map(({ mint, holderCount }) =>
        `WHEN mint = '${mint}' THEN ${holderCount}`
      ).join(' ');

      const mintList = holderUpdates.map(({ mint }) => `'${mint}'`).join(', ');

      await prisma.$executeRawUnsafe(`
        UPDATE "TokenDiscovery"
        SET "holderCount" = CASE ${caseStatements} END
        WHERE mint IN (${mintList})
      `);

      logger.info({
        updated: holderUpdates.length,
        skipped: activeTokens.length - holderUpdates.length - failed,
        failed,
        operation: 'holder_counts_update'
      }, 'Holder counts batch update completed');
    } else {
      logger.debug({
        total: activeTokens.length,
        failed,
        operation: 'holder_counts_update'
      }, 'No holder count changes needed');
    }
  } catch (error) {
    logger.error({ error }, 'Error updating holder counts');
  }
}

/**
 * Sync watcher counts from TokenWatch table
 * CRITICAL FIX (2025-11-03): Batch UPDATE to eliminate individual queries
 */
async function syncWatcherCounts(): Promise<void> {
  try {
    // CRITICAL: Skip if no users active (eliminates ~600 writes/hour when idle)
    if (!shouldRunBackgroundJobs()) {
      logger.debug({ operation: 'watcher_counts_sync', reason: 'no_active_users' }, 'Skipping watcher counts sync - system idle');
      return;
    }

    logger.debug({ operation: 'watcher_counts_sync' }, 'Starting watcher counts sync');

    const counts = await prisma.tokenWatch.groupBy({
      by: ['mint'],
      _count: {
        mint: true,
      },
    });

    if (counts.length === 0) {
      logger.debug({ operation: 'watcher_counts_sync' }, 'No watched tokens to sync');
      return;
    }

    // CRITICAL: Batch update ALL watcher counts in single query using CASE statement
    // This replaces individual UPDATEs with 1 query (Nx reduction!)
    const caseStatements = counts.map(({ mint, _count }) =>
      `WHEN mint = '${mint}' THEN ${_count.mint}`
    ).join(' ');

    const mintList = counts.map(({ mint }) => `'${mint}'`).join(', ');

    await prisma.$executeRawUnsafe(`
      UPDATE "TokenDiscovery"
      SET "watcherCount" = CASE ${caseStatements} END
      WHERE mint IN (${mintList})
    `);

    logger.info({
      updated: counts.length,
      operation: 'watcher_counts_sync'
    }, 'Watcher counts batch update completed');
  } catch (error) {
    logger.error({ error }, 'Error syncing watcher counts');
  }
}

/**
 * Subscribe to trades for active tokens
 * Fetches top tokens by volume/activity and subscribes to their trades
 */
async function subscribeToActiveTokens(): Promise<void> {
  try {
    // Fetch top 200 most active tokens (by volume, market cap, or recent activity)
    const activeTokens = await prisma.tokenDiscovery.findMany({
      where: {
        OR: [
          { volume24h: { gt: 1000 } }, // Tokens with >$1000 volume
          { marketCapUsd: { gt: 5000 } }, // Tokens with >$5000 market cap
          { lastTradeTs: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Traded in last 24h
          { state: 'graduating' }, // All graduating tokens
        ],
      },
      select: {
        mint: true,
      },
      orderBy: [
        { volume24h: 'desc' },
        { marketCapUsd: 'desc' },
      ],
      take: TokenDiscoveryConfig.MAX_ACTIVE_TOKENS_SUBSCRIPTION, // Limit to 200 tokens to avoid overwhelming the subscription
    });

    const tokenMints = activeTokens.map(t => t.mint);

    if (tokenMints.length === 0) {
      logger.debug({ operation: 'trade_subscription' }, 'No active tokens found to subscribe to');
      return;
    }

    logger.debug({ count: tokenMints.length, operation: 'trade_subscription' }, 'Subscribing to trades for active tokens');
    pumpPortalStreamService.subscribeToTokens(tokenMints);
    logger.debug({ 
      totalSubscribed: pumpPortalStreamService.getSubscribedTokenCount(),
      operation: 'trade_subscription' 
    }, 'Trade subscription status');
  } catch (error) {
    logger.error({ error }, 'Error subscribing to active tokens');
  }
}

/**
 * Cleanup old tokens (>24h old for NEW, >12h for BONDED)
 */
async function cleanupOldTokens(): Promise<void> {
  try {
    logger.debug({ operation: 'cleanup_old_tokens' }, 'Starting old tokens cleanup');

    // Cleanup old NEW tokens (>24h old)
    const newCutoffDate = new Date(Date.now() - TokenDiscoveryConfig.NEW_TOKEN_RETENTION_HOURS * 60 * 60 * 1000);
    const newResult = await prisma.tokenDiscovery.deleteMany({
      where: {
        state: 'new',
        firstSeenAt: { lt: newCutoffDate },
      },
    });

    // Cleanup BONDED tokens older than 12 hours (based on stateChangedAt)
    const bondedCutoffDate = new Date(Date.now() - TokenDiscoveryConfig.BONDED_TOKEN_RETENTION_HOURS * 60 * 60 * 1000);
    const bondedResult = await prisma.tokenDiscovery.deleteMany({
      where: {
        state: 'bonded',
        stateChangedAt: { lt: bondedCutoffDate },
      },
    });

    logger.debug({ 
      newTokensDeleted: newResult.count, 
      bondedTokensDeleted: bondedResult.count,
      operation: 'cleanup_old_tokens' 
    }, 'Old tokens cleanup completed');
  } catch (error) {
    logger.error({ error }, 'Error cleaning up old tokens');
  }
}

// ============================================================================
// MAIN WORKER
// ============================================================================

/**
 * Start Token Discovery Worker
 */
async function startWorker(): Promise<void> {
  logger.info({ service: 'token-discovery-worker' }, '🚀 Token Discovery Worker Starting...');

  try {
    // Test database connection
    await prisma.$connect();
    logger.info({ component: 'database' }, '✅ Database connected');

    // Test Redis connection
    await redis.ping();
    logger.info({ component: 'redis' }, '✅ Redis connected');

    // Start price service client (reads SOL price from Redis)
    await priceServiceClient.start();
    logger.info({ component: 'price-service' }, '✅ Price service client started');

    // Start streaming services
    logger.info({ phase: 'startup' }, '📡 Starting streaming services...');

    await pumpPortalStreamService.start();
    logger.info({ component: 'pumpportal-stream' }, '✅ PumpPortal stream service started');

    await raydiumStreamService.start();
    logger.info({ component: 'raydium-stream' }, '✅ Raydium stream service started');

    // Register event handlers
    logger.info({ phase: 'startup' }, '🔌 Registering event handlers...');

    pumpPortalStreamService.on('newToken', handleNewToken);
    pumpPortalStreamService.on('migration', handleMigration);
    pumpPortalStreamService.on('swap', handleSwap);
    raydiumStreamService.on('newPool', handleNewPool);

    // CRITICAL FIX: Re-subscribe to active tokens on reconnection
    // Without this, after WebSocket reconnects, we lose all token subscriptions
    // This causes price updates to stop flowing and PNL calculations to freeze
    pumpPortalStreamService.on('connected', () => {
      logger.info({ event: 'pumpportal_reconnection' }, 'PumpPortal reconnected, resubscribing to active tokens');
      subscribeToActiveTokens().catch(err => {
        logger.error({ error: err }, 'Failed to resubscribe on reconnection');
      });
    });

    logger.info({ component: 'event-handlers' }, '✅ Event handlers registered');

    // Schedule background jobs
    logger.info({ phase: 'startup' }, '⏰ Scheduling background jobs...');

    intervals.push(setInterval(updateMarketDataAndStates, TokenDiscoveryConfig.MARKET_DATA_UPDATE_INTERVAL));
    intervals.push(setInterval(recalculateHotScores, TokenDiscoveryConfig.HOT_SCORE_UPDATE_INTERVAL));
    intervals.push(setInterval(syncWatcherCounts, TokenDiscoveryConfig.WATCHER_SYNC_INTERVAL));
    intervals.push(setInterval(cleanupOldTokens, TokenDiscoveryConfig.CLEANUP_INTERVAL));
    intervals.push(setInterval(updateHolderCounts, TokenDiscoveryConfig.HOLDER_COUNT_UPDATE_INTERVAL));
    intervals.push(setInterval(syncRedisToDatabase, TokenDiscoveryConfig.REDIS_TO_DB_SYNC_INTERVAL)); // Batch sync from Redis to DB

    // Subscribe to active tokens for trade data (every 5 minutes)
    intervals.push(setInterval(subscribeToActiveTokens, 5 * 60 * 1000));
    // Run immediately on startup
    setTimeout(subscribeToActiveTokens, 5000);
    // Also run holder count update shortly after startup
    setTimeout(updateHolderCounts, 10000);
    // Run initial Redis-to-DB sync after 15 seconds
    setTimeout(syncRedisToDatabase, 15000);

    logger.info({ component: 'background-jobs' }, '✅ Background jobs scheduled');
    
    // Health check reporting (for Railway monitoring)
    intervals.push(setInterval(() => {
      logger.debug({
        subscribedTokens: pumpPortalStreamService.getSubscribedTokenCount(),
        subscribedWallets: pumpPortalStreamService.getSubscribedWalletCount(),
        pumpPortalConnected: pumpPortalStreamService.isConnected,
        uptime: Math.floor(process.uptime()),
        memoryUsageMB: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
        health: 'alive'
      }, 'Token Discovery Worker health check');
    }, 60000)); // Every 60 seconds
    
    
    logger.info({
      service: 'token-discovery-worker',
      status: 'ready',
      features: [
        'PumpPortal event listening (bonded, migration)',
        'Raydium pool monitoring (new pools)',
        'Market data updates: every 30 seconds',
        'Hot score updates: every 5 minutes', 
        'Watcher sync: every 1 minute',
        'Holder count updates: every 10 minutes',
        'Token trade subscriptions: every 5 minutes',
        'Cleanup: every 5 minutes'
      ]
    }, '🎮 Token Discovery Worker is running!');
  } catch (error) {
    logger.error({ error }, 'Token Discovery Worker failed to start');
    console.error('❌ Fatal startup error:', error); // Keep console for critical failures
    throw error;
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn({ operation: 'shutdown' }, 'Shutdown already in progress');
    return;
  }
  
  isShuttingDown = true;
  logger.info({ signal, operation: 'shutdown' }, `🛑 Token Discovery Worker shutting down`);
  
  try {
    // 1. Stop accepting new work - clear all intervals
    logger.debug({ operation: 'shutdown', phase: 'cleanup_intervals' }, 'Clearing background job intervals');
    intervals.forEach(interval => clearInterval(interval));
    
    // 2. Stop accepting new events
    logger.debug({ operation: 'shutdown', phase: 'remove_listeners' }, 'Removing event listeners');
    pumpPortalStreamService.removeAllListeners();
    raydiumStreamService.removeAllListeners();
    
    // 3. Give in-flight operations time to complete (5 second grace period)
    logger.debug({ operation: 'shutdown', phase: 'await_operations' }, 'Waiting for in-flight operations');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 4. Stop streaming services
    logger.debug({ operation: 'shutdown', phase: 'stop_streams' }, 'Stopping streaming services');
    pumpPortalStreamService.stop();
    await raydiumStreamService.stop();
    
    // 5. Disconnect from databases with timeout
    logger.debug({ operation: 'shutdown', phase: 'disconnect_db' }, 'Disconnecting from databases');
    await Promise.race([
      Promise.all([
        prisma.$disconnect(),
        redis.quit()
      ]),
      new Promise((resolve) => setTimeout(resolve, 10000)) // 10s timeout
    ]);
    
    logger.info({ operation: 'shutdown', status: 'completed' }, '✅ Token Discovery Worker stopped gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('🚨 Token Discovery Worker Uncaught Exception:', error.message);
  
  // Don't crash on PumpPortal WebSocket errors - they're handled by reconnection
  if (error.message?.includes('Unexpected server response: 502') || 
      error.message?.includes('Unexpected server response: 503') ||
      error.message?.includes('Unexpected server response: 504')) {
    logger.error({ error: error.message, event: 'pumpportal_server_error' }, '🚨 PumpPortal server error - continuing operation');
    return;
  }
  
  console.error('🚨 Fatal error in Token Discovery Worker:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Token Discovery Worker Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Don't crash on PumpPortal WebSocket rejections
  const reasonMessage = reason instanceof Error ? reason.message : String(reason);
  if (reasonMessage.includes('Unexpected server response: 502') || 
      reasonMessage.includes('Unexpected server response: 503') ||
      reasonMessage.includes('Unexpected server response: 504')) {
    logger.error({ error: reasonMessage, event: 'pumpportal_rejection' }, '🚨 PumpPortal server error rejection - continuing operation');
    return;
  }
  
  console.error('🚨 Fatal rejection in Token Discovery Worker:', reason);
  shutdown('unhandledRejection');
});

// ============================================================================
// START
// ============================================================================

startWorker().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});