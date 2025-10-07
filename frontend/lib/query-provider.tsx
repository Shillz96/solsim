// Optimized React Query Provider for High-Volume Traffic
// Configured for Railway (1000 req/min) and Vercel constraints

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'

// Optimized timing constants for high-volume traffic
// Backend limits: 1000 req/min authenticated, 300 req/min unauthenticated
// Strategy: Reduce polling, increase stale times, rely on user actions to refetch

export const STALE_TIMES = {
  immediate: 0,                    // Always stale
  fast: 10 * 60 * 1000,           // 10 minutes (prices, balances)
  moderate: 15 * 60 * 1000,       // 15 minutes (portfolio, holdings)
  slow: 30 * 60 * 1000,           // 30 minutes (user profiles)  
  static: 60 * 60 * 1000,         // 60 minutes (market stats, leaderboard)
} as const

export const CACHE_TIMES = {
  short: 15 * 60 * 1000,          // 15 minutes
  medium: 30 * 60 * 1000,         // 30 minutes
  long: 2 * 60 * 60 * 1000,       // 2 hours
} as const

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Conservative defaults for high traffic
            staleTime: STALE_TIMES.moderate,
            gcTime: CACHE_TIMES.medium,
            
            // Disable aggressive refetching
            refetchOnWindowFocus: false,
            refetchOnMount: false,       // Only refetch if data is stale
            refetchOnReconnect: true,    // Refetch on network reconnect
            
            // Smart retry logic for 429 errors
            retry: (failureCount, error: any) => {
              // Never retry 429 errors automatically
              if (error?.status === 429) {
                return false
              }
              // Don't retry 4xx client errors (except 429 handled above)
              if (error?.status >= 400 && error?.status < 500) {
                return false
              }
              // Retry server errors max 2 times
              return failureCount < 2
            },
            
            // Exponential backoff with special 429 handling
            retryDelay: (attemptIndex, error: any) => {
              // For 429 errors, use the retryAfter from error
              if (error?.status === 429) {
                const retryAfter = error?.retryAfter ? error.retryAfter * 1000 : 120000
                return retryAfter // Use server's recommendation
              }
              // Standard exponential backoff for other errors
              return Math.min(1000 * Math.pow(2, attemptIndex), 30000)
            },
            
            networkMode: 'online',
          },
          mutations: {
            retry: (failureCount, error: any) => {
              // Never retry mutations on 4xx errors
              if (error?.status >= 400 && error?.status < 500) {
                return false
              }
              // Single retry for server errors
              return failureCount < 1
            },
            networkMode: 'online',
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  )
}

