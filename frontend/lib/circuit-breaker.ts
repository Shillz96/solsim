// Circuit Breaker Pattern for API Rate Limiting
// Prevents cascading failures by temporarily stopping requests when rate limits are hit

import { errorLogger } from './error-logger'

export class CircuitBreaker {
  private failures: Map<string, number> = new Map()
  private lastFailureTime: Map<string, number> = new Map()
  private isOpen: Map<string, boolean> = new Map()

  private readonly FAILURE_THRESHOLD = 3 // Open circuit after 3 429 errors
  private readonly TIMEOUT = 2 * 60 * 1000 // Keep circuit open for 2 minutes
  private readonly HALF_OPEN_TIMEOUT = 30 * 1000 // Try again after 30 seconds

  /**
   * Check if requests are allowed for the given endpoint
   */
  isRequestAllowed(endpoint: string): boolean {
    const now = Date.now()
    const failures = this.failures.get(endpoint) || 0
    const lastFailure = this.lastFailureTime.get(endpoint) || 0
    const isOpen = this.isOpen.get(endpoint) || false

    // If circuit is open, check if we should transition to half-open
    if (isOpen && now - lastFailure > this.TIMEOUT) {
      this.isOpen.set(endpoint, false)
      this.failures.set(endpoint, 0)
      errorLogger.generalError('Circuit breaker half-open', new Error(`Circuit breaker for ${endpoint} transitioning to half-open`), { endpoint, state: 'half-open' })
      return true
    }

    // If circuit is open and timeout hasn't elapsed, block requests
    if (isOpen) {
      return false
    }

    return true
  }

  /**
   * Record a successful request
   */
  onSuccess(endpoint: string): void {
    this.failures.set(endpoint, 0)
    this.isOpen.set(endpoint, false)
  }

  /**
   * Record a failed request
   */
  onFailure(endpoint: string, error: any): void {
    const now = Date.now()
    
    // Only trigger circuit breaker for 429 errors
    if (error?.status !== 429) return

    const failures = (this.failures.get(endpoint) || 0) + 1
    this.failures.set(endpoint, failures)
    this.lastFailureTime.set(endpoint, now)

    // Open circuit if failure threshold is reached
    if (failures >= this.FAILURE_THRESHOLD) {
      this.isOpen.set(endpoint, true)
      errorLogger.apiError(endpoint, new Error(`Circuit breaker opened after ${failures} failures`), { 
        metadata: { type: 'circuit_breaker_opened', failures, endpoint } 
      })
    }
  }

  /**
   * Get circuit state for debugging
   */
  getState(endpoint: string) {
    return {
      failures: this.failures.get(endpoint) || 0,
      isOpen: this.isOpen.get(endpoint) || false,
      lastFailure: this.lastFailureTime.get(endpoint),
    }
  }
}

// Global circuit breaker instance
export const circuitBreaker = new CircuitBreaker()
