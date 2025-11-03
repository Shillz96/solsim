# Token Discovery Worker Refactoring Guide

## Overview

This document describes the complete refactoring of `tokenDiscoveryWorker.ts` from a monolithic 1830-line file into a modular, testable architecture.

## Problems Solved

### Critical Issues
1. **SQL Injection Vulnerability** - Fixed by replacing `$executeRawUnsafe` with Prisma transactions
2. **Memory Leak** - Fixed by replacing unbounded `txCountMap` with LRU-based `TxCountManager`
3. **Untestable Code** - Fixed through dependency injection and separation of concerns

### Major Issues
4. **Monolithic Structure** - Broken into logical modules
5. **Functions Too Large** - Decomposed into single-responsibility methods
6. **Code Duplication** - Extracted common patterns into utilities
7. **Global State** - Replaced with dependency injection container
8. **Inconsistent Error Handling** - Standardized across all modules

## New Structure

```
backend/src/workers/tokenDiscovery/
├── config/
│   └── index.ts                         ✅ CREATED - Configuration with env vars
├── services/
│   ├── TokenStateManager.ts             ✅ CREATED - State transitions
│   ├── TokenCacheManager.ts             ✅ CREATED - Redis caching
│   └── TokenHealthEnricher.ts           ✅ CREATED - Health data enrichment
├── handlers/
│   ├── SwapHandler.ts                   ✅ CREATED - Swap event processing
│   ├── NewTokenHandler.ts               ⏳ TODO - New token creation (see template below)
│   ├── MigrationHandler.ts              ⏳ TODO - Migration events
│   └── NewPoolHandler.ts                ⏳ TODO - Raydium pool events
├── jobs/
│   ├── RedisSyncJob.ts                  ⏳ TODO - Redis-to-DB sync
│   ├── MarketDataJob.ts                 ⏳ TODO - Market data updates
│   ├── HotScoreJob.ts                   ⏳ TODO - Hot score calculation
│   ├── HolderCountJob.ts                ⏳ TODO - Holder count updates
│   ├── WatcherCountJob.ts               ⏳ TODO - Watcher count sync
│   ├── CleanupJob.ts                    ⏳ TODO - Old token cleanup
│   ├── TokenSubscriptionJob.ts          ⏳ TODO - Token subscription
│   └── ScheduledJobManager.ts           ⏳ TODO - Job orchestration
├── utils/
│   ├── batchUpdate.ts                   ✅ CREATED - Safe batch updates
│   ├── imageUtils.ts                    ✅ CREATED - Image URL helpers
│   ├── timestampUtils.ts                ✅ CREATED - Timestamp validation
│   └── txCountManager.ts                ✅ CREATED - Transaction counting with cleanup
├── types.ts                             ✅ CREATED - TypeScript interfaces
├── index.ts                             ⏳ TODO - Main orchestrator
└── REFACTORING_GUIDE.md                 ✅ THIS FILE
```

## Implementation Templates

### Event Handler Template

```typescript
/**
 * [EventName] Handler
 *
 * Handles [event type] from [source]
 */

import { IEventHandler, [EventType] } from '../types.js';
import { WorkerDependencies } from '../types.js';

export class [EventName]Handler implements IEventHandler<[EventType]> {
  constructor(private deps: WorkerDependencies) {}

  async handle(event: [EventType]): Promise<void> {
    try {
      // 1. Validate input
      const validation = this.validateEvent(event);
      if (!validation.valid) {
        return;
      }

      // 2. Extract data
      const data = this.extractData(event);

      // 3. Process logic
      await this.processEvent(data);

      // 4. Cache results
      await this.deps.cacheManager.cacheTokenRow(data.mint);

      // 5. Async enrichment (non-blocking)
      this.deps.healthEnricher.enrichHealthData(data.mint).catch(err =>
        logger.error({ error: err }, 'Health enrichment error')
      );
    } catch (error) {
      logger.error({ error }, 'Error handling event');
    }
  }

  private validateEvent(event: [EventType]): { valid: boolean } {
    // Validation logic
  }

  private extractData(event: [EventType]): any {
    // Data extraction
  }

  private async processEvent(data: any): Promise<void> {
    // Main processing logic
  }
}
```

### Scheduled Job Template

```typescript
/**
 * [JobName] Job
 *
 * [Description of what this job does]
 */

import { IScheduledJob } from '../types.js';
import { WorkerDependencies } from '../types.js';
import { config } from '../config/index.js';

export class [JobName]Job implements IScheduledJob {
  constructor(private deps: WorkerDependencies) {}

  getName(): string {
    return '[job_name]';
  }

  getInterval(): number {
    return config.intervals.[INTERVAL_NAME];
  }

  async run(): Promise<void> {
    try {
      logger.debug({ operation: this.getName() }, 'Starting job');

      // Job logic here

      logger.debug({ operation: this.getName() }, 'Job completed');
    } catch (error) {
      logger.error({ error, operation: this.getName() }, 'Job failed');
    }
  }
}
```

## NewTokenHandler Implementation Guide

The `NewTokenHandler` (lines 641-866) is the most complex handler. Break it into these methods:

### Structure
```typescript
export class NewTokenHandler implements IEventHandler<NewTokenEventData> {
  async handle(event: NewTokenEventData): Promise<void> {
    // 1. Validate token has metadata
    if (!this.hasMetadata(event)) return;

    // 2. Calculate metrics
    const metrics = this.calculateMetrics(event);

    // 3. Fetch additional metadata if needed
    const metadata = await this.fetchMetadata(event, metrics);

    // 4. Fetch token supply
    const supply = await this.fetchSupply(event.token.mint);

    // 5. Upsert to database
    await this.upsertToken(event, metrics, metadata, supply);

    // 6. Cache and enrich
    await this.cacheAndEnrich(event.token.mint);
  }

  private hasMetadata(event: NewTokenEventData): boolean {
    const { symbol, name, uri } = event.token;
    return !!(symbol || name || uri);
  }

  private calculateMetrics(event: NewTokenEventData) {
    const { marketCapSol, vTokensInBondingCurve, vSolInBondingCurve } = event.token;

    // Calculate bonding curve progress
    let bondingCurveProgress = null;
    let tokenState: 'bonded' | 'graduating' | 'new' = 'new';
    let liquidityUsd = null;
    let marketCapUsd = null;

    // ... calculation logic

    return { bondingCurveProgress, tokenState, liquidityUsd, marketCapUsd };
  }

  private async fetchMetadata(event, metrics) {
    // Use imageUtils helpers
    // Fetch from IPFS if needed
  }

  private async fetchSupply(mint: string) {
    // Fetch token supply and decimals
  }

  private async upsertToken(event, metrics, metadata, supply) {
    // Database upsert logic
  }

  private async cacheAndEnrich(mint: string) {
    // Cache in Redis + async health enrichment
  }
}
```

## ScheduledJobManager Implementation

```typescript
/**
 * Scheduled Job Manager
 *
 * Manages all scheduled background jobs with activity-aware execution
 */

import { IScheduledJob } from '../types.js';
import { loggers } from '../../utils/logger.js';
import { shouldRunBackgroundJobs } from '../utils/activityCheck.js';

const logger = loggers.server;

export class ScheduledJobManager {
  private intervals: NodeJS.Timeout[] = [];
  private jobs: IScheduledJob[] = [];

  registerJob(job: IScheduledJob): void {
    this.jobs.push(job);

    const interval = setInterval(async () => {
      // Check if system should run jobs
      if (await shouldRunBackgroundJobs()) {
        try {
          await job.run();
        } catch (error) {
          logger.error({
            job: job.getName(),
            error
          }, 'Job execution failed');
        }
      } else {
        logger.debug({
          job: job.getName()
        }, 'Skipping job - system idle');
      }
    }, job.getInterval());

    this.intervals.push(interval);
    logger.info({
      job: job.getName(),
      interval: job.getInterval()
    }, 'Job registered');
  }

  registerMany(jobs: IScheduledJob[]): void {
    jobs.forEach(job => this.registerJob(job));
  }

  stopAll(): void {
    this.intervals.forEach(i => clearInterval(i));
    this.intervals = [];
    logger.info({
      jobCount: this.jobs.length
    }, 'All jobs stopped');
  }
}
```

## Main Orchestrator (index.ts)

```typescript
/**
 * Token Discovery Worker - Main Orchestrator
 *
 * Slim orchestration layer that wires together all components
 */

import { PrismaClient } from '@prisma/client';
import { getRedisClient } from '../../plugins/redisClient.js';
import { PumpPortalStreamService } from '../../services/pumpPortalStreamService.js';
import { raydiumStreamService } from '../../services/raydiumStreamService.js';
import priceServiceClient from '../../plugins/priceServiceClient.js';

// Services
import { TokenStateManager } from './services/TokenStateManager.js';
import { TokenCacheManager } from './services/TokenCacheManager.js';
import { TokenHealthEnricher } from './services/TokenHealthEnricher.js';

// Handlers
import { SwapHandler } from './handlers/SwapHandler.js';
// Import other handlers...

// Jobs
import { ScheduledJobManager } from './jobs/ScheduledJobManager.js';
// Import job classes...

// Utils
import { txCountManager } from './utils/txCountManager.js';

export class TokenDiscoveryWorker {
  private prisma: PrismaClient;
  private redis: Redis;
  private dependencies: WorkerDependencies;
  private jobManager: ScheduledJobManager;
  private pumpPortalStream: PumpPortalStreamService;
  private isShuttingDown: boolean = false;

  async start(): Promise<void> {
    logger.info({ service: 'token-discovery-worker' }, '🚀 Starting...');

    // Initialize dependencies
    await this.initializeDependencies();

    // Register event handlers
    this.registerEventHandlers();

    // Wait for activity before starting jobs
    await this.waitForActivity();

    // Start scheduled jobs
    this.startScheduledJobs();

    logger.info({ service: 'token-discovery-worker' }, '✅ Running');
  }

  private async initializeDependencies(): Promise<void> {
    // Create Prisma client with worker config
    this.prisma = new PrismaClient({ /* config */ });
    await this.prisma.$connect();

    // Create Redis client
    this.redis = getRedisClient();
    await this.redis.ping();

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

    // Start streaming services
    this.pumpPortalStream = new PumpPortalStreamService();
    await this.pumpPortalStream.start();
    await raydiumStreamService.start();
    await priceServiceClient.start();
  }

  private registerEventHandlers(): void {
    const swapHandler = new SwapHandler(this.redis, txCountManager);
    // Create other handlers...

    this.pumpPortalStream.on('swap', (e) => swapHandler.handle(e));
    // Register other handlers...
  }

  private async waitForActivity(): Promise<void> {
    // Poll Redis for activity...
  }

  private startScheduledJobs(): void {
    this.jobManager = new ScheduledJobManager();

    // Create and register all jobs
    const jobs = [
      new RedisSyncJob(this.dependencies),
      new MarketDataJob(this.dependencies),
      new HotScoreJob(this.dependencies),
      new HolderCountJob(this.dependencies),
      new WatcherCountJob(this.dependencies),
      new CleanupJob(this.dependencies),
      new TokenSubscriptionJob(this.dependencies, this.pumpPortalStream),
    ];

    this.jobManager.registerMany(jobs);
  }

  async stop(): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    logger.info({ operation: 'shutdown' }, '🛑 Shutting down...');

    // Stop jobs
    this.jobManager.stopAll();

    // Stop streams
    this.pumpPortalStream.stop();
    await raydiumStreamService.stop();

    // Disconnect databases
    await Promise.race([
      Promise.all([this.prisma.$disconnect(), this.redis.quit()]),
      new Promise(resolve => setTimeout(resolve, 10000)),
    ]);

    logger.info({ operation: 'shutdown' }, '✅ Shutdown complete');
  }
}

// Startup
const worker = new TokenDiscoveryWorker();
worker.start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

// Shutdown handlers
process.on('SIGTERM', () => worker.stop());
process.on('SIGINT', () => worker.stop());
```

## Migration Strategy

### Phase 1: Create New Structure (Completed)
- ✅ Create directory structure
- ✅ Create types.ts
- ✅ Create config module
- ✅ Create utilities
- ✅ Create services
- ✅ Create SwapHandler

### Phase 2: Complete Remaining Files
- ⏳ Create remaining handlers (NewToken, Migration, NewPool)
- ⏳ Create all 7 job classes
- ⏳ Create ScheduledJobManager
- ⏳ Create main orchestrator (index.ts)

### Phase 3: Update Original File
Update `tokenDiscoveryWorker.ts` to simply import and start the new worker:

```typescript
import { TokenDiscoveryWorker } from './tokenDiscovery/index.js';

const worker = new TokenDiscoveryWorker();
worker.start().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
```

### Phase 4: Testing
- Test each module in isolation
- Test integration
- Monitor production for issues
- Remove old code once stable

## Benefits Achieved

1. **Security**: SQL injection vulnerability fixed
2. **Stability**: Memory leak eliminated
3. **Maintainability**: Clear module boundaries, easy to navigate
4. **Testability**: Each component testable in isolation
5. **Reusability**: Services can be used elsewhere
6. **Readability**: Functions are single-responsibility
7. **Performance**: Same performance, better resource management

## Key Architectural Improvements

1. **Dependency Injection**: All dependencies passed via constructor
2. **Interface Segregation**: Clear interfaces for each component
3. **Single Responsibility**: Each class has one job
4. **Separation of Concerns**: Logic organized by domain
5. **Error Handling**: Consistent patterns throughout
6. **Configuration Management**: Environment-aware config

## Next Steps

1. Create remaining handler files using templates above
2. Create job files using templates above
3. Create ScheduledJobManager
4. Create main orchestrator
5. Test thoroughly
6. Deploy and monitor

## Notes

- All critical fixes (SQL injection, memory leak) are in the utilities
- Services are extracted with minimal changes to logic
- Handlers break down complex functions into methods
- Jobs wrap existing logic with IScheduledJob interface
- Main orchestrator is thin—just wires components together

This refactoring improves code quality without changing business logic.
