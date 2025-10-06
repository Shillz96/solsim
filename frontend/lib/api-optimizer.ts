// API Request Optimization
// Reduces redundant API calls and implements intelligent request scheduling

import { errorLogger } from './error-logger'

export class ApiOptimizer {
  private static instance: ApiOptimizer;
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private requestQueue: Map<string, Array<{ resolve: Function, reject: Function }>> = new Map();
  private lastRequestTime: Map<string, number> = new Map();

  static getInstance(): ApiOptimizer {
    if (!ApiOptimizer.instance) {
      ApiOptimizer.instance = new ApiOptimizer();
    }
    return ApiOptimizer.instance;
  }

  /**
   * Deduplicate identical requests that are made simultaneously
   */
  async deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If an identical request is already in progress, wait for it
    const existingRequest = this.pendingRequests.get(key);
    if (existingRequest) {
      // Request deduplication in progress
      return existingRequest;
    }

    // Start new request and track it
    const request = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, request);
    return request;
  }

  /**
   * Throttle requests to prevent rapid-fire calls to the same endpoint
   */
  async throttleRequest<T>(
    endpoint: string,
    requestFn: () => Promise<T>,
    minInterval: number = 1000
  ): Promise<T> {
    const now = Date.now();
    const lastRequest = this.lastRequestTime.get(endpoint);

    if (lastRequest && now - lastRequest < minInterval) {
      const delay = minInterval - (now - lastRequest);
      // Request throttling applied for rate limiting
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime.set(endpoint, Date.now());
    return requestFn();
  }

  /**
   * Batch multiple requests together with a small delay
   */
  async batchRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    batchDelay: number = 50
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Add to queue
      const queue = this.requestQueue.get(key) || [];
      queue.push({ resolve, reject });
      this.requestQueue.set(key, queue);

      // If this is the first request in the batch, set a timer
      if (queue.length === 1) {
        setTimeout(async () => {
          const currentQueue = this.requestQueue.get(key) || [];
          this.requestQueue.delete(key);

          try {
            const result = await requestFn();
            // Resolve all requests in the batch with the same result
            currentQueue.forEach(({ resolve }) => resolve(result));
          } catch (error) {
            // Reject all requests in the batch
            currentQueue.forEach(({ reject }) => reject(error));
          }
        }, batchDelay);
      }
    });
  }

  /**
   * Create a request key for deduplication
   */
  createRequestKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramString}`;
  }
}

export const apiOptimizer = ApiOptimizer.getInstance();
