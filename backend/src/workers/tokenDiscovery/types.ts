/**
 * Type definitions for Token Discovery Worker
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import Redis from 'ioredis';

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface ITokenStateManager {
  updateState(mint: string, newState: string, oldState?: string): Promise<void>;
  classifyTokenState(token: TokenClassificationInput): string;
  notifyWatchers(mint: string, oldState: string, newState: string): Promise<void>;
}

export interface ITokenCacheManager {
  cacheTokenRow(mint: string): Promise<void>;
  invalidateCache(mint: string): Promise<void>;
}

export interface ITokenHealthEnricher {
  enrichHealthData(mint: string): Promise<void>;
  calculateHotScore(mint: string): Promise<number>;
}

export interface IScheduledJob {
  run(): Promise<void>;
  getInterval(): number;
  getName(): string;
}

export interface IEventHandler<T> {
  handle(event: T): Promise<void>;
}

export interface ITxCountManager {
  addTransaction(mint: string, txId: string): void;
  getCount(mint: string): number;
  cleanup(): void;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface TokenClassificationInput {
  bondingCurveProgress?: Decimal | null;
  isGraduated?: boolean;
  lastTradeTs?: Date | null;
  volume24hSol?: Decimal | null;
  holderCount?: number | null;
  hasFirstTrade?: boolean;
}

export interface BatchUpdateItem<T = number> {
  mint: string;
  value: T;
}

// ============================================================================
// DEPENDENCY CONTAINER
// ============================================================================

export interface WorkerDependencies {
  prisma: PrismaClient;
  redis: Redis;
  stateManager: ITokenStateManager;
  cacheManager: ITokenCacheManager;
  healthEnricher: ITokenHealthEnricher;
  txCountManager: ITxCountManager;
}

// ============================================================================
// EVENT TYPES (re-export for convenience)
// ============================================================================

export interface SwapEventData {
  mint: string;
  timestamp: number;
  txType: 'buy' | 'sell';
  solAmount?: number;
  tokenAmount?: number;
  user?: string;
}

export interface NewTokenEventData {
  token: {
    mint?: string;
    name?: string;
    symbol?: string;
    uri?: string;
    creator?: string;
    bondingCurve?: string;
    marketCapSol?: number;
    vTokensInBondingCurve?: number;
    vSolInBondingCurve?: number;
    holderCount?: number;
    twitter?: string;
    telegram?: string;
    website?: string;
    description?: string;
  };
}

export interface MigrationEventData {
  mint: string;
  data: {
    status: 'initiated' | 'completed';
    poolAddress?: string;
    poolType?: string;
  };
}

export interface NewPoolEventData {
  pool: {
    poolAddress: string;
    mint1: string;
    mint2: string;
    signature: string;
    blockTime: number;
  };
}
