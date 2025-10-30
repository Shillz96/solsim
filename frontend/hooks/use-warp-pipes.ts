/**
 * React Query Hooks for Warp Pipes Hub
 *
 * Custom hooks for fetching and mutating Warp Pipes data
 */

"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/use-auth"
import {
  getWarpPipesFeed,
  addTokenWatch,
  removeTokenWatch,
  updateWatchPreferences,
  getUserWatches,
  getTokenHealth,
  getTokenDetails,
} from "@/lib/api/warp-pipes"
import type { FeedFilters, AdvancedFilters, AddWatchRequest, UpdateWatchRequest } from "@/lib/types/warp-pipes"

/**
 * Hook to fetch Warp Pipes feed with advanced filtering
 */
export function useWarpPipesFeed(filters?: FeedFilters & AdvancedFilters) {
  return useQuery({
    queryKey: ["warp-pipes-feed", filters],
    queryFn: () => getWarpPipesFeed(filters),
    refetchInterval: 30000, // Refetch every 30 seconds (optimized for performance - use WebSocket for real-time prices)
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

/**
 * Hook to add a token to watchlist
 */
export function useAddTokenWatch() {
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  return useMutation({
    mutationFn: (request: AddWatchRequest) => {
      if (!isAuthenticated) throw new Error("Authentication required")
      return addTokenWatch(request)
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
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  return useMutation({
    mutationFn: (mint: string) => {
      if (!isAuthenticated) throw new Error("Authentication required")
      return removeTokenWatch(mint)
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
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

  return useMutation({
    mutationFn: ({ mint, preferences }: { mint: string; preferences: UpdateWatchRequest }) => {
      if (!isAuthenticated) throw new Error("Authentication required")
      return updateWatchPreferences(mint, preferences)
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
  const { isAuthenticated } = useAuth()

  return useQuery({
    queryKey: ["warp-pipes-watches"],
    queryFn: () => getUserWatches(),
    enabled: isAuthenticated, // Only fetch if authenticated
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
  return useQuery({
    queryKey: ["warp-pipes-token", mint],
    queryFn: () => getTokenDetails(mint),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}
