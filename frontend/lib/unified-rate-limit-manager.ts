// Unified Rate Limit Manager
// Single source of truth for all rate limiting logic
// Replaces: circuit-breaker.ts, emergency-rate-limit-fix.ts, rate-limit-recovery.ts

import { errorLogger } from './error-logger'

interface EndpointState {
  failures: number
  lastFailureTime: number
  isBlocked: boolean
  blockUntil: number
  backoffMultiplier: number
}

interface RateLimitConfig {
  maxFailures: number          // Number of 429s before blocking
  initialBlockDuration: number // Initial block time in ms
  maxBlockDuration: number     // Maximum block time in ms
  resetAfter: number          // Time to reset failure count
}

export class UnifiedRateLimitManager {
  private static instance: UnifiedRateLimitManager
  private endpointStates = new Map<string, EndpointState>()
  
  private readonly config: RateLimitConfig = {
    maxFailures: 3,                    // Block after 3 failures
    initialBlockDuration: 2 * 60 * 1000,  // 2 minutes initial
    maxBlockDuration: 10 * 60 * 1000,     // 10 minutes max
    resetAfter: 5 * 60 * 1000          // Reset count after 5 minutes
  }

  static getInstance(): UnifiedRateLimitManager {
    if (!UnifiedRateLimitManager.instance) {
      UnifiedRateLimitManager.instance = new UnifiedRateLimitManager()
    }
    return UnifiedRateLimitManager.instance
  }

  /**
   * Check if a request to this endpoint is allowed
   */
  isRequestAllowed(endpoint: string): boolean {
    const state = this.getState(endpoint)
    const now = Date.now()

    // Check if block has expired
    if (state.isBlocked && now >= state.blockUntil) {
      this.resetState(endpoint)
      return true
    }

    return !state.isBlocked
  }

  /**
   * Record a successful request - resets failure count
   */
  recordSuccess(endpoint: string): void {
    const normalized = this.normalizeEndpoint(endpoint)
    const state = this.getState(normalized)
    
    // Reset on success
    state.failures = 0
    state.backoffMultiplier = 1
    state.isBlocked = false
    
    this.endpointStates.set(normalized, state)
  }

  /**
   * Record a 429 error - increment failures and potentially block
   */
  recordRateLimitError(endpoint: string, retryAfter?: number): void {
    const normalized = this.normalizeEndpoint(endpoint)
    const now = Date.now()
    const state = this.getState(normalized)

    // Reset failure count if enough time has passed
    if (now - state.lastFailureTime > this.config.resetAfter) {
      state.failures = 0
      state.backoffMultiplier = 1
    }

    state.failures++
    state.lastFailureTime = now

    // Block if threshold reached
    if (state.failures >= this.config.maxFailures) {
      const blockDuration = this.calculateBlockDuration(state.backoffMultiplier, retryAfter)
      state.isBlocked = true
      state.blockUntil = now + blockDuration
      state.backoffMultiplier = Math.min(state.backoffMultiplier * 2, 8) // Max 8x

      errorLogger.warn(`Endpoint blocked due to rate limiting`, {
        action: 'endpoint_blocked',
        metadata: {
          endpoint: normalized,
          failures: state.failures,
          blockDuration: blockDuration / 1000,
          blockUntil: new Date(state.blockUntil).toISOString()
        }
      })
    }

    this.endpointStates.set(normalized, state)
  }

  /**
   * Get retry delay for exponential backoff
   */
  getRetryDelay(endpoint: string, retryAfter?: number): number {
    const state = this.getState(endpoint)
    const now = Date.now()

    // If blocked, return time until unblock
    if (state.isBlocked && state.blockUntil > now) {
      return state.blockUntil - now
    }

    // Use server's Retry-After if provided
    if (retryAfter && retryAfter > 0) {
      return Math.max(retryAfter * 1000, 60000) // Min 1 minute
    }

    // Exponential backoff based on failure count
    const baseDelay = 60000 // 1 minute
    return Math.min(
      baseDelay * Math.pow(2, state.failures),
      this.config.maxBlockDuration
    )
  }

  /**
   * Get current state of an endpoint for monitoring
   */
  getEndpointState(endpoint: string): Readonly<EndpointState> {
    return { ...this.getState(endpoint) }
  }

  /**
   * Get all blocked endpoints for debugging
   */
  getBlockedEndpoints(): string[] {
    const now = Date.now()
    return Array.from(this.endpointStates.entries())
      .filter(([_, state]) => state.isBlocked && state.blockUntil > now)
      .map(([endpoint]) => endpoint)
  }

  /**
   * Manually clear all blocks (admin function)
   */
  clearAllBlocks(): void {
    this.endpointStates.clear()
    errorLogger.info('All rate limit blocks cleared', {
      action: 'rate_limits_cleared'
    })
  }

  // Private helper methods

  private getState(endpoint: string): EndpointState {
    const normalized = this.normalizeEndpoint(endpoint)
    
    if (!this.endpointStates.has(normalized)) {
      return {
        failures: 0,
        lastFailureTime: 0,
        isBlocked: false,
        blockUntil: 0,
        backoffMultiplier: 1
      }
    }

    return this.endpointStates.get(normalized)!
  }

  private resetState(endpoint: string): void {
    const normalized = this.normalizeEndpoint(endpoint)
    this.endpointStates.delete(normalized)
  }

  private calculateBlockDuration(backoffMultiplier: number, retryAfter?: number): number {
    // Use server's retry-after if provided
    if (retryAfter && retryAfter > 0) {
      return Math.min(retryAfter * 1000 * 2, this.config.maxBlockDuration)
    }

    // Exponential backoff
    const duration = this.config.initialBlockDuration * backoffMultiplier
    return Math.min(duration, this.config.maxBlockDuration)
  }

  /**
   * Normalize endpoint to group similar requests
   * Removes dynamic parameters like IDs, addresses, query strings
   */
  private normalizeEndpoint(endpoint: string): string {
    return endpoint
      .replace(/\/[a-fA-F0-9-]{36,}/g, '/:id')        // UUIDs
      .replace(/\/[a-zA-Z0-9]{32,}/g, '/:address')    // Token addresses
      .replace(/\?.*$/, '')                           // Query parameters
      .replace(/\d+/g, ':num')                        // Any numbers
  }
}

// Export singleton
export const rateLimitManager = UnifiedRateLimitManager.getInstance()

