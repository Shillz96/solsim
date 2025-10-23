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
import { pumpPortalStreamService, NewTokenEvent, MigrationEvent, SwapEvent } from '../services/pumpPortalStreamService.js';
import { raydiumStreamService, NewPoolEvent } from '../services/raydiumStreamService.js';
import { healthCapsuleService } from '../services/healthCapsuleService.js';
import { tokenMetadataService } from '../services/tokenMetadataService.js';
import priceServiceClient from '../plugins/priceServiceClient.js';

// ============================================================================
// INITIALIZATION
// ============================================================================

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || '');

// Configuration
const HOT_SCORE_UPDATE_INTERVAL = 300_000; // 5 minutes
const WATCHER_SYNC_INTERVAL = 60_000; // 1 minute
const CLEANUP_INTERVAL = 300_000; // 5 minutes (more frequent for stale token cleanup)
const TOKEN_TTL = 7200; // 2 hours cache
const NEW_TOKEN_RETENTION_HOURS = 24; // Remove NEW tokens after 24h
const BONDED_TOKEN_RETENTION_HOURS = 12; // Remove BONDED tokens older than 12 hours

// Transaction counting - track swap events per token
const txCountMap = new Map<string, Set<string>>(); // mint -> Set of transaction signatures

// Known mints to filter
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Fetch and parse token metadata from IPFS URI
 */
async function fetchTokenMetadata(uri: string): Promise<{
  description?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  image?: string;
}> {
  try {
    if (!uri) return {};

    // Convert IPFS URI to HTTP gateway URL
    const httpUri = uri.startsWith('ipfs://')
      ? uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
      : uri;

    const response = await fetch(httpUri, { 
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    
    if (!response.ok) {
      console.warn(`[TokenDiscovery] Failed to fetch metadata: ${response.status}`);
      return {};
    }

    const metadata = await response.json();
    
    return {
      description: metadata.description || undefined,
      twitter: metadata.twitter || metadata.social?.twitter || undefined,
      telegram: metadata.telegram || metadata.social?.telegram || undefined,
      website: metadata.website || metadata.external_url || undefined,
      image: metadata.image ? convertIPFStoHTTP(metadata.image) : undefined,
    };
  } catch (error) {
    console.error('[TokenDiscovery] Error fetching metadata:', error);
    return {};
  }
}

/**
 * Handle swap event → Update transaction count
 */
async function handleSwap(event: SwapEvent): Promise<void> {
  try {
    const { mint, timestamp } = event;
    
    // Use timestamp as unique identifier (in real scenario, use signature)
    const txId = `${mint}-${timestamp}`;
    
    if (!txCountMap.has(mint)) {
      txCountMap.set(mint, new Set());
    }
    
    txCountMap.get(mint)!.add(txId);
  } catch (error) {
    console.error('[TokenDiscovery] Error handling swap event:', error);
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

/**
 * Handle PumpPortal newToken event → Create BONDED token
 */
async function handleNewToken(event: NewTokenEvent): Promise<void> {
  try {
    const { 
      mint, 
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

    console.log(`[TokenDiscovery] New bonded token: ${symbol || mint}`);

    // Calculate bonding curve progress if we have the data
    let bondingCurveProgress = null;
    let tokenState: 'bonded' | 'graduating' | 'new' = 'new';
    let liquidityUsd = null;
    let marketCapUsd = null;

    // Convert marketCapSol to USD
    if (marketCapSol) {
      const solPrice = priceServiceClient.getSolPrice();
      marketCapUsd = new Decimal(marketCapSol).mul(solPrice);
      console.log(`[TokenDiscovery] Market cap: ${marketCapSol} SOL = $${marketCapUsd.toFixed(2)}`);
    }

    if (vTokensInBondingCurve && vSolInBondingCurve) {
      // Progress = (SOL in curve / 85 SOL target) * 100
      bondingCurveProgress = new Decimal(vSolInBondingCurve).div(85).mul(100);
      const progress = parseFloat(bondingCurveProgress.toString());

      // NEW: Brand new launches (< 50% progress)
      if (progress < 50) {
        tokenState = 'new';
      }
      // GRADUATING: Actively progressing towards completion (50-99%)
      else if (progress >= 50 && progress < 100) {
        tokenState = 'graduating';
      }
      // BONDED: Completed bonding curve (100%)
      else {
        tokenState = 'bonded';
      }

      // Calculate initial liquidity from bonding curve SOL
      try {
        const liquidityCalc = await healthCapsuleService.calculateBondingCurveLiquidity(vSolInBondingCurve);
        liquidityUsd = new Decimal(liquidityCalc);
      } catch (error) {
        console.error('[TokenDiscovery] Error calculating bonding curve liquidity:', error);
      }
    }

    // Convert IPFS URI to HTTP gateway URL
    const httpLogoURI = convertIPFStoHTTP(uri);

    // Fetch additional metadata from URI if not provided directly
    let metadata: Awaited<ReturnType<typeof fetchTokenMetadata>> = {};
    if (uri && (!description || !twitter || !telegram || !website)) {
      metadata = await fetchTokenMetadata(uri);
    }

    // Get current transaction count for this token
    const txCount = txCountMap.get(mint)?.size || 0;

    // Upsert to database
    await prisma.tokenDiscovery.upsert({
      where: { mint },
      create: {
        mint,
        symbol: symbol || null,
        name: name || null,
        logoURI: httpLogoURI, // ✅ Convert ipfs:// to https://
        imageUrl: metadata.image || null,
        description: description || metadata.description || null,
        twitter: twitter || metadata.twitter || null,
        telegram: telegram || metadata.telegram || null,
        website: website || metadata.website || null,
        creatorWallet: creator || null,
        holderCount: holderCount || null,
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
        // Update metadata if available
        ...(description && { description }),
        ...(twitter && { twitter }),
        ...(telegram && { telegram }),
        ...(website && { website }),
        ...(holderCount && { holderCount }),
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

    // Cache in Redis
    await cacheTokenRow(mint);

    // Async health enrichment (non-blocking)
    enrichHealthData(mint).catch((err) =>
      console.error(`[TokenDiscovery] Health enrichment error for ${mint}:`, err)
    );
  } catch (error) {
    console.error('[TokenDiscovery] Error handling newToken event:', error);
  }
}

/**
 * Handle PumpPortal migration event → BONDED → GRADUATING → NEW
 */
async function handleMigration(event: MigrationEvent): Promise<void> {
  try {
    const { mint, data } = event;
    const { status, poolAddress, poolType } = data;

    console.log(`[TokenDiscovery] Migration event for ${mint}: ${status}`);

    // Fetch current token state
    const currentToken = await prisma.tokenDiscovery.findUnique({
      where: { mint },
    });

    if (!currentToken) {
      console.warn(`[TokenDiscovery] Migration event for unknown token: ${mint}`);
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
      console.warn(`[TokenDiscovery] Unknown migration status: ${status}`);
      return;
    }

    // Update state
    await updateState(mint, newState, currentToken.state);

    // Notify watchers
    await notifyWatchers(mint, currentToken.state, newState);
  } catch (error) {
    console.error('[TokenDiscovery] Error handling migration event:', error);
  }
}

/**
 * Handle Raydium newPool event → Create/update NEW token
 */
async function handleNewPool(event: NewPoolEvent): Promise<void> {
  try {
    const { poolAddress, mint1, mint2, signature, blockTime } = event.pool;

    // Determine which mint is the token (not SOL/USDC/USDT)
    const knownMints = [SOL_MINT, USDC_MINT, USDT_MINT];
    const tokenMint = knownMints.includes(mint1) ? mint2 : mint1;

    console.log(`[TokenDiscovery] New Raydium pool for token: ${tokenMint}`);

    // Check if token already exists (migration path)
    const existing = await prisma.tokenDiscovery.findUnique({
      where: { mint: tokenMint },
    });

    if (existing) {
      // Update existing token to BONDED state (has LP now)
      console.log(`[TokenDiscovery] Updating existing token ${tokenMint} to BONDED state`);

      await updateState(tokenMint, 'bonded', existing.state);
      await prisma.tokenDiscovery.update({
        where: { mint: tokenMint },
        data: {
          poolAddress,
          poolType: 'raydium',
          poolCreatedAt: new Date(blockTime * 1000),
        },
      });

      // Notify watchers
      await notifyWatchers(tokenMint, existing.state, 'bonded');
    } else {
      // Direct Raydium listing (not from Pump.fun) - has LP, so BONDED
      console.log(`[TokenDiscovery] Creating direct Raydium listing: ${tokenMint}`);

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
    await cacheTokenRow(tokenMint);

    // Async health enrichment
    enrichHealthData(tokenMint).catch((err) =>
      console.error(`[TokenDiscovery] Health enrichment error for ${tokenMint}:`, err)
    );
  } catch (error) {
    console.error('[TokenDiscovery] Error handling newPool event:', error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert IPFS URI to HTTP gateway URL
 */
function convertIPFStoHTTP(uri: string | undefined | null): string | null {
  if (!uri) return null;

  // Already an HTTP URL
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  // Convert ipfs:// protocol to HTTP gateway
  if (uri.startsWith('ipfs://')) {
    const ipfsHash = uri.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  }

  // If it's just a hash, prepend the gateway
  if (uri.match(/^[a-zA-Z0-9]{46,59}$/)) {
    return `https://ipfs.io/ipfs/${uri}`;
  }

  return uri;
}

/**
 * Update token state with transition tracking
 */
async function updateState(mint: string, newState: string, oldState?: string): Promise<void> {
  await prisma.tokenDiscovery.update({
    where: { mint },
    data: {
      state: newState,
      previousState: oldState || null,
      stateChangedAt: new Date(),
      lastUpdatedAt: new Date(),
    },
  });

  // Invalidate Redis cache
  await redis.del(`token:${mint}`);

  console.log(`[TokenDiscovery] State transition: ${mint} ${oldState} → ${newState}`);
}

/**
 * Enrich token with health capsule data + metadata + market data (async, batched)
 */
async function enrichHealthData(mint: string): Promise<void> {
  try {
    // Get current token to fetch metadata URI
    const currentToken = await prisma.tokenDiscovery.findUnique({
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

    await prisma.tokenDiscovery.update({
      where: { mint },
      data: updateData,
    });

    // Update cache
    await cacheTokenRow(mint);

    console.log(`[TokenDiscovery] Health data enriched for ${mint}`);
  } catch (error) {
    console.error(`[TokenDiscovery] Error enriching health data for ${mint}:`, error);
  }
}

/**
 * Calculate hot score based on recency, liquidity, and watchers
 */
async function calculateHotScore(mint: string): Promise<number> {
  try {
    const token = await prisma.tokenDiscovery.findUnique({ where: { mint } });
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
    console.error(`[TokenDiscovery] Error calculating hot score for ${mint}:`, error);
    return 0;
  }
}

/**
 * Notify watchers on state change
 */
async function notifyWatchers(mint: string, oldState: string, newState: string): Promise<void> {
  try {
    // Query watchers based on preferences
    const watchers = await prisma.tokenWatch.findMany({
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

    console.log(
      `[TokenDiscovery] Notifying ${watchers.length} watchers for ${mint}: ${oldState} → ${newState}`
    );

    // TODO: Integrate with NotificationService
    // For now, just log
    for (const watch of watchers) {
      console.log(
        `[Watch] User ${watch.userId} notified: ${mint} transitioned ${oldState} → ${newState}`
      );

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
    console.error(`[TokenDiscovery] Error notifying watchers for ${mint}:`, error);
  }
}

/**
 * Cache token row in Redis with TTL
 */
async function cacheTokenRow(mint: string): Promise<void> {
  try {
    const token = await prisma.tokenDiscovery.findUnique({ where: { mint } });
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
    await redis.setex(`token:${mint}`, TOKEN_TTL, JSON.stringify(tokenRow));

    // Add to sorted set by hotScore for fast feed queries
    await redis.zadd(
      `tokens:${token.state}`,
      parseFloat(token.hotScore.toString()),
      mint
    );
  } catch (error) {
    console.error(`[TokenDiscovery] Error caching token ${mint}:`, error);
  }
}

// ============================================================================
// SCHEDULED JOBS
// ============================================================================

/**
 * Recalculate hot scores for all active tokens
 */
async function recalculateHotScores(): Promise<void> {
  try {
    console.log('[TokenDiscovery] Recalculating hot scores...');

    const tokens = await prisma.tokenDiscovery.findMany({
      where: {
        state: { in: ['bonded', 'graduating', 'new'] },
      },
    });

    let updated = 0;
    for (const token of tokens) {
      const ageHours = (Date.now() - token.firstSeenAt.getTime()) / 3600000;
      const progress = token.bondingCurveProgress ? parseFloat(token.bondingCurveProgress.toString()) : 0;
      
      // Progress-based state transitions (regardless of age)
      if (token.state === 'new' && progress >= 50 && progress < 100) {
        // Actively progressing → GRADUATING
        await updateState(token.mint, 'graduating', token.state);
        console.log(`[TokenDiscovery] Progress transition: ${token.mint} NEW → GRADUATING (progress: ${progress}%)`);
      } else if (token.state === 'graduating' && (progress >= 100 || token.poolAddress)) {
        // Completed bonding or has LP → BONDED
        await updateState(token.mint, 'bonded', token.state);
        console.log(`[TokenDiscovery] Completion transition: ${token.mint} GRADUATING → BONDED (progress: ${progress}%)`);
      } else if (token.state === 'new' && (progress >= 100 || token.poolAddress)) {
        // Skip graduating if already at 100% → BONDED
        await updateState(token.mint, 'bonded', token.state);
        console.log(`[TokenDiscovery] Fast completion: ${token.mint} NEW → BONDED (progress: ${progress}%)`);
      }
      
      // Calculate and update hot score
      const newScore = await calculateHotScore(token.mint);
      await prisma.tokenDiscovery.update({
        where: { mint: token.mint },
        data: { hotScore: new Decimal(newScore) },
      });
      updated++;
    }

    console.log(`[TokenDiscovery] Hot scores updated for ${updated} tokens`);
  } catch (error) {
    console.error('[TokenDiscovery] Error recalculating hot scores:', error);
  }
}

/**
 * Sync watcher counts from TokenWatch table
 */
async function syncWatcherCounts(): Promise<void> {
  try {
    console.log('[TokenDiscovery] Syncing watcher counts...');

    const counts = await prisma.tokenWatch.groupBy({
      by: ['mint'],
      _count: {
        mint: true,
      },
    });

    let updated = 0;
    for (const { mint, _count } of counts) {
      await prisma.tokenDiscovery.update({
        where: { mint },
        data: { watcherCount: _count.mint },
      });
      updated++;
    }

    console.log(`[TokenDiscovery] Watcher counts synced for ${updated} tokens`);
  } catch (error) {
    console.error('[TokenDiscovery] Error syncing watcher counts:', error);
  }
}

/**
 * Cleanup old tokens (>24h old for NEW, >12h for BONDED)
 */
async function cleanupOldTokens(): Promise<void> {
  try {
    console.log('[TokenDiscovery] Cleaning up old tokens...');

    // Cleanup old NEW tokens (>24h old)
    const newCutoffDate = new Date(Date.now() - NEW_TOKEN_RETENTION_HOURS * 60 * 60 * 1000);
    const newResult = await prisma.tokenDiscovery.deleteMany({
      where: {
        state: 'new',
        firstSeenAt: { lt: newCutoffDate },
      },
    });

    // Cleanup BONDED tokens older than 12 hours (based on stateChangedAt)
    const bondedCutoffDate = new Date(Date.now() - BONDED_TOKEN_RETENTION_HOURS * 60 * 60 * 1000);
    const bondedResult = await prisma.tokenDiscovery.deleteMany({
      where: {
        state: 'bonded',
        stateChangedAt: { lt: bondedCutoffDate },
      },
    });

    console.log(`[TokenDiscovery] Cleaned up ${newResult.count} old NEW tokens, ${bondedResult.count} old BONDED tokens (>12h)`);
  } catch (error) {
    console.error('[TokenDiscovery] Error cleaning up old tokens:', error);
  }
}

// ============================================================================
// MAIN WORKER
// ============================================================================

/**
 * Start Token Discovery Worker
 */
async function startWorker(): Promise<void> {
  console.log('🚀 Token Discovery Worker Starting...');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Test Redis connection
    await redis.ping();
    console.log('✅ Redis connected');

    // Start price service client (reads SOL price from Redis)
    await priceServiceClient.start();
    console.log('✅ Price service client started');

    // Start streaming services
    console.log('📡 Starting streaming services...');

    await pumpPortalStreamService.start();
    console.log('✅ PumpPortal stream service started');

    await raydiumStreamService.start();
    console.log('✅ Raydium stream service started');

    // Register event handlers
    console.log('🔌 Registering event handlers...');

    pumpPortalStreamService.on('newToken', handleNewToken);
    pumpPortalStreamService.on('migration', handleMigration);
    pumpPortalStreamService.on('swap', handleSwap);
    raydiumStreamService.on('newPool', handleNewPool);

    console.log('✅ Event handlers registered');

    // Schedule background jobs
    console.log('⏰ Scheduling background jobs...');

    setInterval(recalculateHotScores, HOT_SCORE_UPDATE_INTERVAL);
    setInterval(syncWatcherCounts, WATCHER_SYNC_INTERVAL);
    setInterval(cleanupOldTokens, CLEANUP_INTERVAL);

    console.log('✅ Background jobs scheduled');
    console.log('');
    console.log('🎮 Token Discovery Worker is running!');
    console.log('   - Listening to PumpPortal (bonded, migration)');
    console.log('   - Listening to Raydium (new pools)');
    console.log('   - Hot score updates: every 5 minutes');
    console.log('   - Watcher sync: every 1 minute');
    console.log('   - Cleanup: every 1 hour');
  } catch (error) {
    console.error('❌ Token Discovery Worker failed to start:', error);
    throw error;
  }
}

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

async function shutdown(): Promise<void> {
  console.log('🛑 Token Discovery Worker shutting down...');

  pumpPortalStreamService.stop();
  await raydiumStreamService.stop();
  await prisma.$disconnect();
  await redis.quit();

  console.log('✅ Token Discovery Worker stopped');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ============================================================================
// START
// ============================================================================

startWorker().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
