/**
 * Transaction Count Manager
 *
 * Manages transaction counting with automatic cleanup to prevent memory leaks
 * Replaces the unbounded global Map with an LRU-like structure
 */

import { config } from '../config/index.js';
import { loggers } from '../../../utils/logger.js';

const logger = loggers.server;

export interface ITxCountManager {
  addTransaction(mint: string, txId: string): void;
  getCount(mint: string): number;
  cleanup(): void;
}

interface TokenTxData {
  transactions: Set<string>;
  lastUpdated: number;
}

/**
 * Transaction count manager with automatic cleanup
 * Prevents memory leaks by removing old entries
 */
export class TxCountManager implements ITxCountManager {
  private txMap: Map<string, TokenTxData> = new Map();
  private maxSize: number;
  private maxAge: number; // Maximum age in milliseconds

  constructor(
    maxSize: number = 1000,
    maxAgeHours: number = 24
  ) {
    this.maxSize = maxSize;
    this.maxAge = maxAgeHours * 60 * 60 * 1000;
  }

  /**
   * Add a transaction for a token
   */
  addTransaction(mint: string, txId: string): void {
    let tokenData = this.txMap.get(mint);

    if (!tokenData) {
      tokenData = {
        transactions: new Set(),
        lastUpdated: Date.now(),
      };
      this.txMap.set(mint, tokenData);
    }

    tokenData.transactions.add(txId);
    tokenData.lastUpdated = Date.now();

    // Auto-cleanup if map gets too large
    if (this.txMap.size > this.maxSize) {
      this.cleanup();
    }
  }

  /**
   * Get transaction count for a token
   */
  getCount(mint: string): number {
    const tokenData = this.txMap.get(mint);
    return tokenData ? tokenData.transactions.size : 0;
  }

  /**
   * Cleanup old entries
   * Removes tokens that haven't been updated recently
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [mint, data] of this.txMap.entries()) {
      const age = now - data.lastUpdated;
      if (age > this.maxAge) {
        this.txMap.delete(mint);
        removed++;
      }
    }

    // If still too large after cleanup, remove oldest entries
    if (this.txMap.size > this.maxSize) {
      const entries = Array.from(this.txMap.entries())
        .sort((a, b) => a[1].lastUpdated - b[1].lastUpdated);

      const toRemove = this.txMap.size - this.maxSize;
      for (let i = 0; i < toRemove; i++) {
        this.txMap.delete(entries[i][0]);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug({
        removed,
        remaining: this.txMap.size,
        operation: 'tx_count_cleanup',
      }, 'Transaction count map cleanup completed');
    }
  }

  /**
   * Get current size of the map
   */
  getSize(): number {
    return this.txMap.size;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.txMap.clear();
  }
}

// Export singleton instance
export const txCountManager = new TxCountManager();
