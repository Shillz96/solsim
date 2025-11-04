/**
 * Simple Circuit Breaker Implementation
 *
 * Prevents cascading failures by monitoring error rates and temporarily
 * blocking operations when failure threshold is exceeded.
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, block all requests
 * - HALF_OPEN: Testing if service recovered, allow limited requests
 */

type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening
  successThreshold: number;      // Number of successes in HALF_OPEN to close
  timeout: number;               // ms to wait before trying HALF_OPEN
  monitoringWindowMs: number;    // Time window to track failures
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = Date.now();
  private failures: number[] = []; // Timestamps of recent failures

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        console.warn({
          circuit: this.name,
          state: this.state,
          nextAttempt: new Date(this.nextAttempt).toISOString()
        }, '⚡ Circuit breaker is OPEN - rejecting request');

        if (fallback) {
          return await fallback();
        }

        throw new Error(`Circuit breaker [${this.name}] is OPEN`);
      } else {
        // Transition to HALF_OPEN to test recovery
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log({
          circuit: this.name,
          state: this.state
        }, '⚡ Circuit breaker transitioning to HALF_OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();

      if (fallback) {
        console.warn({
          circuit: this.name,
          state: this.state,
          error
        }, '⚡ Circuit breaker executing fallback');
        return await fallback();
      }

      throw error;
    }
  }

  /**
   * Record successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        // Recovered - close circuit
        this.state = 'CLOSED';
        this.failures = [];
        console.log({
          circuit: this.name,
          state: this.state
        }, '✅ Circuit breaker CLOSED - service recovered');
      }
    }
  }

  /**
   * Record failed execution
   */
  private onFailure(): void {
    const now = Date.now();
    this.failures.push(now);

    // Remove failures outside monitoring window
    this.failures = this.failures.filter(
      timestamp => now - timestamp < this.config.monitoringWindowMs
    );

    this.failureCount = this.failures.length;

    console.warn({
      circuit: this.name,
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold
    }, '❌ Circuit breaker recorded failure');

    if (this.state === 'HALF_OPEN') {
      // Failed during recovery - reopen circuit
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.timeout;
      console.error({
        circuit: this.name,
        state: this.state,
        nextAttempt: new Date(this.nextAttempt).toISOString()
      }, '🚨 Circuit breaker OPENED (failed during recovery)');
    } else if (this.failureCount >= this.config.failureThreshold) {
      // Too many failures - open circuit
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.config.timeout;
      console.error({
        circuit: this.name,
        state: this.state,
        failureCount: this.failureCount,
        threshold: this.config.failureThreshold,
        nextAttempt: new Date(this.nextAttempt).toISOString()
      }, '🚨 Circuit breaker OPENED (failure threshold exceeded)');
    }
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null
    };
  }

  /**
   * Manually reset the circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.failures = [];
    console.log({
      circuit: this.name,
      state: this.state
    }, '🔄 Circuit breaker manually reset');
  }
}
