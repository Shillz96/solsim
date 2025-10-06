// Rate Limit Recovery Strategies
// Provides intelligent backoff and recovery when hitting 429 errors

export class RateLimitRecovery {
  private static instance: RateLimitRecovery;
  private backoffTimers: Map<string, number> = new Map();
  private lastErrorTime: Map<string, number> = new Map();

  static getInstance(): RateLimitRecovery {
    if (!RateLimitRecovery.instance) {
      RateLimitRecovery.instance = new RateLimitRecovery();
    }
    return RateLimitRecovery.instance;
  }

  /**
   * Get appropriate delay before retrying a request after 429 error
   */
  getRetryDelay(endpoint: string, retryAfter?: number): number {
    const now = Date.now();
    const baseKey = this.getEndpointKey(endpoint);
    const lastError = this.lastErrorTime.get(baseKey) || 0;
    const currentBackoff = this.backoffTimers.get(baseKey) || 1;

    // Use server's Retry-After header if provided
    if (retryAfter && retryAfter > 0) {
      return Math.max(retryAfter * 1000, 60000); // Minimum 1 minute
    }

    // If errors are happening frequently, increase backoff exponentially
    if (now - lastError < 60000) { // Within last minute
      const newBackoff = Math.min(currentBackoff * 2, 16); // Max 16 minutes
      this.backoffTimers.set(baseKey, newBackoff);
      return newBackoff * 60000;
    }

    // Reset backoff if enough time has passed
    this.backoffTimers.set(baseKey, 1);
    return 60000; // Default 1 minute delay
  }

  /**
   * Record a 429 error for an endpoint
   */
  recordRateLimitError(endpoint: string): void {
    const baseKey = this.getEndpointKey(endpoint);
    this.lastErrorTime.set(baseKey, Date.now());
  }

  /**
   * Check if we should make a request to this endpoint
   */
  shouldMakeRequest(endpoint: string): boolean {
    const now = Date.now();
    const baseKey = this.getEndpointKey(endpoint);
    const lastError = this.lastErrorTime.get(baseKey);
    const backoff = this.backoffTimers.get(baseKey) || 1;

    if (!lastError) return true;

    const timeSinceLastError = now - lastError;
    const requiredDelay = backoff * 60000; // Convert minutes to ms

    return timeSinceLastError >= requiredDelay;
  }

  /**
   * Get a normalized key for the endpoint (removes dynamic parameters)
   */
  private getEndpointKey(endpoint: string): string {
    // Normalize endpoints to group similar requests
    return endpoint
      .replace(/\/[a-fA-F0-9-]{36,}/g, '/:id') // UUIDs
      .replace(/\/[a-zA-Z0-9]{32,}/g, '/:address') // Token addresses
      .replace(/\?.*$/, ''); // Remove query parameters
  }

  /**
   * Clear recovery state for an endpoint
   */
  clearRecoveryState(endpoint: string): void {
    const baseKey = this.getEndpointKey(endpoint);
    this.backoffTimers.delete(baseKey);
    this.lastErrorTime.delete(baseKey);
  }
}

export const rateLimitRecovery = RateLimitRecovery.getInstance();
