/**
 * Simple Circuit Breaker Pattern
 * 
 * Prevents cascading failures by stopping calls to failing services
 * and allowing them time to recover.
 * 
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are blocked
 * - HALF_OPEN: Testing if service has recovered
 */

import { logger } from './logger.js';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Number of failures before opening circuit
  successThreshold?: number; // Number of successes to close circuit from half-open
  timeout?: number; // Time in ms before attempting to close circuit
  name?: string; // Circuit breaker name for logging
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private nextAttempt: number = Date.now();
  
  private readonly failureThreshold: number;
  private readonly successThreshold: number;
  private readonly timeout: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 60000; // 1 minute default
    this.name = options.name || 'CircuitBreaker';
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: T): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        logger.debug(`${this.name}: Circuit OPEN, request blocked`);
        if (fallback !== undefined) {
          return fallback;
        }
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
      // Try half-open
      this.state = CircuitState.HALF_OPEN;
      logger.info(`${this.name}: Circuit entering HALF_OPEN state`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.close();
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.successCount = 0;

    if (this.failureCount >= this.failureThreshold) {
      this.open();
    }
  }

  /**
   * Open the circuit (block requests)
   */
  private open(): void {
    this.state = CircuitState.OPEN;
    this.nextAttempt = Date.now() + this.timeout;
    logger.warn(`${this.name}: Circuit OPENED after ${this.failureCount} failures. Will retry at ${new Date(this.nextAttempt).toISOString()}`);
  }

  /**
   * Close the circuit (allow requests)
   */
  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    logger.info(`${this.name}: Circuit CLOSED, service recovered`);
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    nextAttemptAt?: string;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttemptAt: this.state === CircuitState.OPEN 
        ? new Date(this.nextAttempt).toISOString() 
        : undefined
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
    logger.info(`${this.name}: Circuit manually reset`);
  }
}

/**
 * Circuit Breaker Manager
 * Manages multiple circuit breakers by service name
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(serviceName: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      this.breakers.set(
        serviceName,
        new CircuitBreaker({ ...options, name: serviceName })
      );
    }
    return this.breakers.get(serviceName)!;
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats(): Record<string, ReturnType<CircuitBreaker['getStats']>> {
    const stats: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => breaker.reset());
    logger.info('All circuit breakers reset');
  }
}

// Export singleton instance
export const circuitBreakerManager = CircuitBreakerManager.getInstance();

