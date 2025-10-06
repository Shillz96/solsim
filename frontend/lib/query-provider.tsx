// React Query Provider Setup
// Configures TanStack Query with optimal caching, background refetching, and error handling

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect, type ReactNode } from 'react'
import { globalErrorHandler } from './global-error-handler'

const DEFAULT_STALE_TIME = 5 * 60 * 1000 // 5 minutes
const DEFAULT_CACHE_TIME = 10 * 60 * 1000 // 10 minutes

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create client instance only once to prevent re-initialization on re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Global query configuration optimized for rate limiting
            staleTime: DEFAULT_STALE_TIME, // Data is fresh for 5 minutes
            gcTime: DEFAULT_CACHE_TIME, // Keep in cache for 10 minutes
            refetchOnWindowFocus: false, // Disable aggressive window focus refetching
            refetchOnMount: false, // Only refetch if data is stale
            refetchOnReconnect: true, // Refetch when network reconnects
            retry: (failureCount, error: any) => {
              // Don't retry 429 (rate limit) errors aggressively
              if (error?.status === 429) {
                return failureCount < 1; // Only retry once for 429 errors
              }
              // Don't retry 4xx client errors except 429
              if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
                return false;
              }
              // Retry server errors up to 2 times
              return failureCount < 2;
            },
            retryDelay: (attemptIndex, error: any) => {
              // Special handling for 429 errors with longer delays
              if (error?.status === 429) {
                // Use Retry-After header if available, otherwise exponential backoff starting at 60s
                const retryAfter = error?.retryAfter ? parseInt(error.retryAfter) * 1000 : 60000;
                return Math.min(retryAfter * Math.pow(2, attemptIndex), 300000); // Max 5 minutes
              }
              // Standard exponential backoff for other errors
              return Math.min(1000 * Math.pow(2, attemptIndex), 30000);
            },
            networkMode: 'online',
          },
          mutations: {
            // Global mutation configuration
            retry: (failureCount, error: any) => {
              // Don't retry 429 errors or 4xx client errors
              if (error?.status === 429 || (error?.status >= 400 && error?.status < 500)) {
                return false;
              }
              return failureCount < 1;
            },
            networkMode: 'online',
            onError: (error, variables, context) => {
              // Use global error handler for consistent error management
              globalErrorHandler.handleApiError(error, 'mutation');
            },
          },
        },
      })
  )

  // Set up global error handler
  useEffect(() => {
    globalErrorHandler.setQueryClient(queryClient)
    
    // Global error handling is now managed through the QueryClient constructor
    // and individual hook error handlers, not through defaultOptions.onError
  }, [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Show DevTools only in development */}
      {process.env.NEXT_PUBLIC_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  )
}

// Export configured stale times for custom hook usage
export const STALE_TIMES = {
  immediate: 0, // Always stale, refetch immediately
  fast: 30 * 1000, // 30 seconds (for balance, prices)
  moderate: 2 * 60 * 1000, // 2 minutes (for portfolio data)
  slow: 5 * 60 * 1000, // 5 minutes (for user profiles, settings)
  static: 15 * 60 * 1000, // 15 minutes (for market stats, leaderboard)
} as const

// Export cache times for different data types
export const CACHE_TIMES = {
  short: 5 * 60 * 1000, // 5 minutes
  medium: 10 * 60 * 1000, // 10 minutes
  long: 30 * 60 * 1000, // 30 minutes
} as const