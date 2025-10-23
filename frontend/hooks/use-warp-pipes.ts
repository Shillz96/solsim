/**
 * React Query Hooks for Warp Pipes Hub
 *
 * Custom hooks for fetching and mutating Warp Pipes data
 */

"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth-provider"
import {
  getWarpPipesFeed,
  addTokenWatch,
  removeTokenWatch,
  updateWatchPreferences,
  getUserWatches,
  getTokenHealth,
  getTokenDetails,
} from "@/lib/api/warp-pipes"
import type { FeedFilters, AddWatchRequest, UpdateWatchRequest } from "@/lib/types/warp-pipes"

/**
 * Hook to fetch Warp Pipes feed
 */
export function useWarpPipesFeed(filters?: FeedFilters) {
  const { token } = useAuth()

  return useQuery({
    queryKey: ["warp-pipes-feed", filters],
    queryFn: () => getWarpPipesFeed(filters, token || undefined),
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
    staleTime: 1000, // Consider data stale after 1 second
  })
}

/**
 * Hook to add a token to watchlist
 */
export function useAddTokenWatch() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: AddWatchRequest) => {
      if (!token) throw new Error("Authentication required")
      return addTokenWatch(request, token)
    },
    onSuccess: () => {
      // Invalidate feed to update isWatched flags
      queryClient.invalidateQueries({ queryKey: ["warp-pipes-feed"] })
      queryClient.invalidateQueries({ queryKey: ["warp-pipes-watches"] })
    },
  })
}

/**
 * Hook to remove a token from watchlist
 */
export function useRemoveTokenWatch() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mint: string) => {
      if (!token) throw new Error("Authentication required")
      return removeTokenWatch(mint, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warp-pipes-feed"] })
      queryClient.invalidateQueries({ queryKey: ["warp-pipes-watches"] })
    },
  })
}

/**
 * Hook to update watch preferences
 */
export function useUpdateWatchPreferences() {
  const { token } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ mint, preferences }: { mint: string; preferences: UpdateWatchRequest }) => {
      if (!token) throw new Error("Authentication required")
      return updateWatchPreferences(mint, preferences, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warp-pipes-watches"] })
    },
  })
}

/**
 * Hook to fetch user's watched tokens
 */
export function useUserWatches() {
  const { token } = useAuth()

  return useQuery({
    queryKey: ["warp-pipes-watches"],
    queryFn: () => {
      if (!token) throw new Error("Authentication required")
      return getUserWatches(token)
    },
    enabled: !!token, // Only fetch if authenticated
  })
}

/**
 * Hook to fetch token health data
 */
export function useTokenHealth(mint: string) {
  return useQuery({
    queryKey: ["warp-pipes-health", mint],
    queryFn: () => getTokenHealth(mint),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch token details
 */
export function useTokenDetails(mint: string) {
  const { token } = useAuth()

  return useQuery({
    queryKey: ["warp-pipes-token", mint],
    queryFn: () => getTokenDetails(mint, token || undefined),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
