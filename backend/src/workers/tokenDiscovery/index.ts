/**
 * Token Discovery Worker - Main Orchestrator
 *
 * Slim orchestration layer that wires together all refactored components
 * Replaces monolithic tokenDiscoveryWorker.ts (1830 lines)
 */

import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { getRedisClient } from '../../plugins/redisClient.js';
import { PumpPortalStreamService } from '../../services/pumpPortalStreamService.js';
import { raydiumStreamService } from '../../services/raydiumStreamService.js';
import priceServiceClient from '../../plugins/priceServiceClient.js';
import { loggers } from '../../utils/logger.js';
import { config } from './config/index.js';

// Services
import { TokenStateManager } from './services/TokenStateManager.js';
import { TokenCacheManager } from './services/TokenCacheManager.js';
import { TokenHealthEnricher } from './services/TokenHealthEnricher.js';

// Handlers
import { SwapHandler } from './handlers/SwapHandler.js';
import { NewTokenHandler } from './handlers/NewTokenHandler.js';
import { MigrationHandler } from './handlers/MigrationHandler.js';
import { NewPoolHandler } from './handlers/NewPoolHandler.js';

// Jobs
import { ScheduledJobManager } from './jobs/ScheduledJobManager.js';
import { RedisSyncJob } from './jobs/RedisSyncJob.js';
import { MarketDataJob } from './jobs/MarketDataJob.js';
import { HotScoreJob } from './jobs/HotScoreJob.js';
import { HolderCountJob } from './jobs/HolderCountJob.js';
import { WatcherCountJob } from './jobs/WatcherCountJob.js';
import { CleanupJob } from './jobs/CleanupJob.js';
import { TokenSubscriptionJob } from './jobs/TokenSubscriptionJob.js';

// Utils
import { txCountManager } from './utils/txCountManager.js';
import { shouldRunBackgroundJobs } from './utils/activityCheck.js';

// Types
import { WorkerDependencies } from './types.js';

const logger = loggers.server;

/**
 * Configure Prisma with reduced connection pool for worker
 */
function getDatabaseUrl(): string | undefined {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) return baseUrl;

  const url = new URL(baseUrl);
  url.searchParams.set('connection_limit', config.database.CONNECTION_LIMIT.toString());
  url.searchParams.set('pool_timeout', config.database.POOL_TIMEOUT.toString());
  url.searchParams.set('statement_cache_size', config.database.STATEMENT_CACHE_SIZE.toString());

  return url.toString();
}

/**
 * Token Discovery Worker
 * Main class that orchestrates all components
 */
export class TokenDiscoveryWorker {
  private prisma!: PrismaClient;
  private redis!: Redis;
  private dependencies!: WorkerDependencies;
  private pumpPortalStream!: PumpPortalStreamService;
  private jobManager!: ScheduledJobManager;
  private activityPoller?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private isShuttingDown: boolean = false;

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    logger.info({ service: 'token-discovery-worker' }, '🚀 Token Discovery Worker Starting...');

    try {
      // Initialize all dependencies
      await this.initializeDependencies();

      // Register event handlers
      this.registerEventHandlers();

      // Wait for activity before starting jobs
      await this.waitForActivity();

      // Start health check reporting
      this.startHealthCheck();

      logger.info({
        service: 'token-discovery-worker',
        status: 'ready',
        features: [
          'PumpPortal event listening (bonded, migration)',
          'Raydium pool monitoring (new pools)',
          `Market data updates: every ${config.intervals.MARKET_DATA_UPDATE / 1000}s`,
          `Hot score updates: every ${config.intervals.HOT_SCORE_UPDATE / 1000}s`,
          `Watcher sync: every ${config.intervals.WATCHER_SYNC / 1000}s`,
          `Holder count updates: every ${config.intervals.HOLDER_COUNT_UPDATE / 1000}s`,
          `Token trade subscriptions: every ${config.intervals.TOKEN_SUBSCRIPTION / 1000}s`,
          `Cleanup: every ${config.intervals.CLEANUP / 1000}s`
        ]
      }, '🎮 Token Discovery Worker is running!');
    } catch (error) {
      logger.error({ error }, 'Token Discovery Worker failed to start');
      console.error('❌ Fatal startup error:', error);
      throw error;
    }
  }

  /**
   * Initialize all dependencies
   */
  private async initializeDependencies(): Promise<void> {
    logger.info({ phase: 'init' }, 'Initializing dependencies...');

    // Create Prisma client with worker config
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: getDatabaseUrl()
        }
      },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
    await this.prisma.$connect();
    logger.info({ component: 'database' }, '✅ Database connected');

    // Create Redis client
    this.redis = getRedisClient();
    await this.redis.ping();
    logger.info({ component: 'redis' }, '✅ Redis connected');

    // Create services
    const stateManager = new TokenStateManager(this.prisma, this.redis);
    const cacheManager = new TokenCacheManager(this.prisma, this.redis);
    const healthEnricher = new TokenHealthEnricher(this.prisma, cacheManager);

    // Create dependency container
    this.dependencies = {
      prisma: this.prisma,
      redis: this.redis,
      stateManager,
      cacheManager,
      healthEnricher,
      txCountManager,
    };

    // Start price service client
    await priceServiceClient.start();
    logger.info({ component: 'price-service' }, '✅ Price service client started');

    // Start streaming services
    logger.info({ phase: 'streaming' }, '📡 Starting streaming services...');

    this.pumpPortalStream = new PumpPortalStreamService();
    await this.pumpPortalStream.start();
    logger.info({ component: 'pumpportal-stream' }, '✅ PumpPortal stream service started');

    await raydiumStreamService.start();
    logger.info({ component: 'raydium-stream' }, '✅ Raydium stream service started');
  }

  /**
   * Register event handlers
   */
  private registerEventHandlers(): void {
    logger.info({ phase: 'handlers' }, '🔌 Registering event handlers...');

    // Create handlers
    const swapHandler = new SwapHandler(this.redis, txCountManager);
    const newTokenHandler = new NewTokenHandler(this.dependencies, txCountManager);
    const migrationHandler = new MigrationHandler(this.dependencies);
    const newPoolHandler = new NewPoolHandler(this.dependencies);

    // Register PumpPortal handlers
    this.pumpPortalStream.on('swap', (e) => swapHandler.handle(e));
    this.pumpPortalStream.on('newToken', (e) => newTokenHandler.handle(e));
    this.pumpPortalStream.on('migration', (e) => migrationHandler.handle(e));

    // Register Raydium handlers
    raydiumStreamService.on('newPool', (e) => newPoolHandler.handle(e));

    // CRITICAL FIX: Re-subscribe to active tokens on reconnection
    this.pumpPortalStream.on('connected', () => {
      logger.info({ event: 'pumpportal_reconnection' }, 'PumpPortal reconnected, resubscribing to active tokens');
      this.subscribeToActiveTokens().catch(err => {
        logger.error({ error: err }, 'Failed to resubscribe on reconnection');
      });
    });

    logger.info({ component: 'event-handlers' }, '✅ Event handlers registered');
  }

  /**
   * Wait for user activity before starting background jobs
   */
  private async waitForActivity(): Promise<void> {
    logger.info({ phase: 'activation' }, '⏳ Waiting for user activity before starting background jobs...');

    return new Promise((resolve) => {
      let jobsStarted = false;

      // Poll Redis every 30 seconds to check for activity
      this.activityPoller = setInterval(async () => {
        if (!jobsStarted && await shouldRunBackgroundJobs(this.redis)) {
          jobsStarted = true;
          if (this.activityPoller) {
            clearInterval(this.activityPoller);
          }

          logger.info({ phase: 'activation' }, '🎬 User activity detected! Starting background jobs...');

          // Start all scheduled jobs
          this.startScheduledJobs();

          // Run initial jobs with delays
          setTimeout(() => this.subscribeToActiveTokens(), 5000);

          logger.info({ component: 'background-jobs' }, '✅ All background jobs started');
          resolve();
        } else if (!jobsStarted) {
          logger.debug({ phase: 'idle' }, '💤 Still waiting for user activity...');
        }
      }, config.intervals.ACTIVITY_POLL);
    });
  }

  /**
   * Start all scheduled jobs
   */
  private startScheduledJobs(): void {
    this.jobManager = new ScheduledJobManager(this.redis);

    // Create all jobs
    const jobs = [
      new RedisSyncJob(this.dependencies),
      new MarketDataJob(this.dependencies),
      new HotScoreJob(this.dependencies),
      new HolderCountJob(this.dependencies),
      new WatcherCountJob(this.dependencies),
      new CleanupJob(this.dependencies),
      new TokenSubscriptionJob(this.prisma, this.pumpPortalStream),
    ];

    // Register all jobs
    this.jobManager.registerMany(jobs);
  }

  /**
   * Start health check reporting
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      logger.debug({
        subscribedTokens: this.pumpPortalStream.getSubscribedTokenCount(),
        subscribedWallets: this.pumpPortalStream.getSubscribedWalletCount(),
        pumpPortalConnected: this.pumpPortalStream.isConnected,
        uptime: Math.floor(process.uptime()),
        memoryUsageMB: Math.floor(process.memoryUsage().heapUsed / 1024 / 1024),
        health: 'alive'
      }, 'Token Discovery Worker health check');

      // Run transaction count cleanup
      txCountManager.cleanup();
    }, config.intervals.HEALTH_CHECK);
  }

  /**
   * Subscribe to active tokens (helper method)
   */
  private async subscribeToActiveTokens(): Promise<void> {
    try {
      const activeTokens = await this.prisma.tokenDiscovery.findMany({
        where: {
          OR: [
            { volume24h: { gt: 1000 } },
            { marketCapUsd: { gt: 5000 } },
            { lastTradeTs: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
            { state: 'graduating' },
          ],
        },
        select: { mint: true },
        orderBy: [
          { volume24h: 'desc' },
          { marketCapUsd: 'desc' },
        ],
        take: config.limits.MAX_ACTIVE_TOKENS_SUBSCRIPTION,
      });

      const tokenMints = activeTokens.map(t => t.mint);
      if (tokenMints.length > 0) {
        this.pumpPortalStream.subscribeToTokens(tokenMints);
        logger.debug({
          count: tokenMints.length,
          operation: 'token_subscription'
        }, 'Subscribed to active tokens');
      }
    } catch (error) {
      logger.error({ error }, 'Error subscribing to active tokens');
    }
  }

  /**
   * Graceful shutdown
   */
  async stop(signal: string = 'SIGTERM'): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn({ operation: 'shutdown' }, 'Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info({ signal, operation: 'shutdown' }, '🛑 Token Discovery Worker shutting down');

    try {
      // 1. Stop accepting new work - clear all intervals
      logger.debug({ operation: 'shutdown', phase: 'cleanup_intervals' }, 'Stopping background jobs');
      if (this.jobManager) {
        this.jobManager.stopAll();
      }
      if (this.activityPoller) {
        clearInterval(this.activityPoller);
      }
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // 2. Stop accepting new events
      logger.debug({ operation: 'shutdown', phase: 'remove_listeners' }, 'Removing event listeners');
      this.pumpPortalStream.removeAllListeners();
      raydiumStreamService.removeAllListeners();

      // 3. Give in-flight operations time to complete
      logger.debug({ operation: 'shutdown', phase: 'await_operations' }, 'Waiting for in-flight operations');
      await new Promise(resolve => setTimeout(resolve, config.shutdown.GRACE_PERIOD_MS));

      // 4. Stop streaming services
      logger.debug({ operation: 'shutdown', phase: 'stop_streams' }, 'Stopping streaming services');
      this.pumpPortalStream.stop();
      await raydiumStreamService.stop();

      // 5. Disconnect from databases with timeout
      logger.debug({ operation: 'shutdown', phase: 'disconnect_db' }, 'Disconnecting from databases');
      await Promise.race([
        Promise.all([
          this.prisma.$disconnect(),
          this.redis.quit()
        ]),
        new Promise((resolve) => setTimeout(resolve, config.shutdown.DB_DISCONNECT_TIMEOUT_MS))
      ]);

      logger.info({ operation: 'shutdown', status: 'completed' }, '✅ Token Discovery Worker stopped gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// ============================================================================
// START WORKER (if this file is run directly)
// ============================================================================

// Only start if this file is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const worker = new TokenDiscoveryWorker();

  // Start the worker
  worker.start().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

  // Shutdown handlers
  process.on('SIGTERM', () => worker.stop('SIGTERM'));
  process.on('SIGINT', () => worker.stop('SIGINT'));

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
    worker.stop('uncaughtException');
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
    worker.stop('unhandledRejection');
  });
}

// Export for use in other files
export default TokenDiscoveryWorker;
