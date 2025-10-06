// React Query Provider Setup
// Configures TanStack Query with optimal caching, background refetching, and error handling

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, type ReactNode } from 'react'

const DEFAULT_STALE_TIME = 5 * 60 * 1000 // 5 minutes
const DEFAULT_CACHE_TIME = 10 * 60 * 1000 // 10 minutes

export function QueryProvider({ children }: { children: ReactNode }) {
  // Create client instance only once to prevent re-initialization on re-renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Global query configuration
            staleTime: DEFAULT_STALE_TIME, // Data is fresh for 5 minutes
            gcTime: DEFAULT_CACHE_TIME, // Keep in cache for 10 minutes (renamed from cacheTime)
            refetchOnWindowFocus: true, // Refetch when user returns to tab
            refetchOnMount: true, // Refetch when component mounts
            refetchOnReconnect: true, // Refetch when network reconnects
            retry: 3, // Retry failed requests 3 times
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
            networkMode: 'online', // Only run queries when online
          },
          mutations: {
            // Global mutation configuration
            retry: 1, // Retry mutations once
            networkMode: 'online',
            onError: (error) => {
              console.error('Mutation error:', error)
            },
          },
        },
      })
  )

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