// Global Error Handler for React Query and API Errors
// Provides centralized error handling, user notifications, and recovery strategies

import { QueryClient } from '@tanstack/react-query'
import { rateLimitRecovery } from './rate-limit-recovery'
import { circuitBreaker } from './circuit-breaker'
import { errorLogger } from './error-logger'

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private queryClient: QueryClient | null = null;

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  setQueryClient(queryClient: QueryClient) {
    this.queryClient = queryClient;
  }

  /**
   * Handle API errors globally with appropriate user feedback and recovery
   */
  handleApiError(error: any, endpoint: string): void {
    // Handle rate limiting errors
    if (error?.status === 429) {
      this.handleRateLimitError(error, endpoint);
      return;
    }

    // Handle authentication errors
    if (error?.status === 401) {
      this.handleAuthError(error);
      return;
    }

    // Handle server errors
    if (error?.status >= 500) {
      this.handleServerError(error, endpoint);
      return;
    }

    // Handle network errors
    if (error?.status === 0 || !error?.status) {
      this.handleNetworkError(error, endpoint);
      return;
    }

    // Default error handling
    errorLogger.generalError('Unhandled API error', error, { endpoint });
  }

  private handleRateLimitError(error: any, endpoint: string): void {
    errorLogger.apiError(endpoint, error, { metadata: { type: 'rate_limit' } });
    
    // Record the error for recovery strategies
    rateLimitRecovery.recordRateLimitError(endpoint);
    circuitBreaker.onFailure(endpoint, error);

    // Pause queries temporarily to let rate limits reset
    if (this.queryClient) {
      const queryKey = this.getQueryKeyFromEndpoint(endpoint);
      if (queryKey) {
        // Cancel any pending queries for this endpoint
        this.queryClient.cancelQueries({ queryKey });
        
        // Pause refetching for 2 minutes
        setTimeout(() => {
          this.queryClient?.invalidateQueries({ queryKey });
        }, 2 * 60 * 1000);
      }
    }

    // Show user-friendly message (could integrate with toast system)
    this.showUserMessage('System is busy. Please wait a moment and try again.');
  }

  private handleAuthError(error: any): void {
    errorLogger.authError('Authentication error', error);
    
    // Clear auth state and redirect to login
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }

    this.showUserMessage('Your session has expired. Please log in again.');
  }

  private handleServerError(error: any, endpoint: string): void {
    errorLogger.apiError(endpoint, error, { metadata: { type: 'server_error' } });
    
    // Implement exponential backoff for server errors
    circuitBreaker.onFailure(endpoint, error);
    
    this.showUserMessage('Server is experiencing issues. Please try again in a few moments.');
  }

  private handleNetworkError(error: any, endpoint: string): void {
    errorLogger.generalError('Network error', error, { endpoint });
    this.showUserMessage('Connection problem. Please check your internet connection.');
  }

  private getQueryKeyFromEndpoint(endpoint: string): string[] | null {
    // Map endpoints to query keys for targeted invalidation
    const endpointMap: Record<string, string[]> = {
      '/api/v1/portfolio': ['portfolio', 'summary'],
      '/api/v1/portfolio/balance': ['portfolio', 'balance'],
      '/api/v1/user/profile': ['user', 'profile'],
      '/api/v1/market/trending': ['market', 'trending'],
      '/api/v1/market/token': ['market', 'details'],
    };

    for (const [pattern, queryKey] of Object.entries(endpointMap)) {
      if (endpoint.includes(pattern)) {
        return queryKey;
      }
    }

    return null;
  }

  private showUserMessage(message: string): void {
    // Dispatch custom event for toast notifications
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('user-message', {
        detail: { message, type: 'info' }
      }));
    }
    
    // Could dispatch custom event for UI components to show toast
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:user-message', { 
        detail: { message, type: 'warning' }
      }));
    }
  }
}

export const globalErrorHandler = GlobalErrorHandler.getInstance();
