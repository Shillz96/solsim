/**
 * WebSocket Subscription Delta Manager
 * 
 * Manages WebSocket subscriptions with delta-based updates to prevent subscription floods.
 * Keeps a stable set of subscriptions per socket and computes only the changes needed.
 * 
 * Features:
 * - Idempotent subscriptions (no duplicate subscribe calls)
 * - Delta-based updates (only add/remove what changed)
 * - Batched operations (single call for multiple tokens)
 * - Automatic cleanup on component unmount
 * 
 * Usage:
 * ```typescript
 * const mgr = new WsSubManager(subscribeMany, unsubscribeMany);
 * 
 * // Update subscriptions (only diffs are sent)
 * mgr.sync(['token1', 'token2', 'token3']);
 * 
 * // Later, update again (only changes sent)
 * mgr.sync(['token1', 'token3', 'token4']); // Removes token2, adds token4
 * 
 * // Cleanup all subscriptions
 * mgr.clear();
 * ```
 */

export class WsSubManager {
  private current = new Set<string>();
  
  constructor(
    private subscribe: (tokens: string[]) => void,
    private unsubscribe: (tokens: string[]) => void
  ) {}
  
  /**
   * Synchronize subscriptions to match the provided list.
   * Only sends subscribe/unsubscribe for tokens that changed.
   * 
   * @param next - Array of token addresses to subscribe to
   */
  sync(next: string[]): void {
    const nextSet = new Set(next);
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    
    // Find tokens to add (in next but not in current)
    nextSet.forEach(token => {
      if (!this.current.has(token)) {
        toAdd.push(token);
      }
    });
    
    // Find tokens to remove (in current but not in next)
    this.current.forEach(token => {
      if (!nextSet.has(token)) {
        toRemove.push(token);
      }
    });
    
    // Batch operations
    if (toAdd.length > 0) {
      this.subscribe(toAdd);
    }
    
    if (toRemove.length > 0) {
      this.unsubscribe(toRemove);
    }
    
    // Update current state
    this.current = nextSet;
  }
  
  /**
   * Clear all current subscriptions
   */
  clear(): void {
    if (this.current.size > 0) {
      this.unsubscribe(Array.from(this.current));
      this.current.clear();
    }
  }
  
  /**
   * Get the current set of subscribed tokens
   */
  getCurrent(): string[] {
    return Array.from(this.current);
  }
  
  /**
   * Check if a token is currently subscribed
   */
  isSubscribed(token: string): boolean {
    return this.current.has(token);
  }
}
