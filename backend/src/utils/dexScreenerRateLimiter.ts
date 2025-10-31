/**
 * Global DexScreener API Rate Limiter
 * 
 * Prevents 429 errors by queuing all DexScreener requests
 * through a single bottleneck with configurable delay.
 */

class DexScreenerRateLimiter {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private readonly delayMs: number;

  constructor(delayMs = 500) {
    this.delayMs = delayMs;
  }

  /**
   * Execute a DexScreener API call with rate limiting
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        await task();
        // Wait before processing next request
        if (this.queue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, this.delayMs));
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}

// Singleton instance with 500ms delay (DexScreener allows ~120 req/min = 500ms per request)
export const dexScreenerRateLimiter = new DexScreenerRateLimiter(500);
