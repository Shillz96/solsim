/**
 * Warp Pipes API Client
 *
 * Client-side functions for interacting with the Warp Pipes API
 */

import type {
  TokenRow,
  WarpPipesFeedResponse,
  AddWatchRequest,
  UpdateWatchRequest,
  FeedFilters,
} from "@/lib/types/warp-pipes"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"

// Helper to get authorization headers
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Get token discovery feed (bonded, graduating, new)
 */
export async function getWarpPipesFeed(
  filters?: FeedFilters
): Promise<WarpPipesFeedResponse> {
  const params = new URLSearchParams()

  if (filters?.searchQuery) params.append("searchQuery", filters.searchQuery)
  if (filters?.sortBy) params.append("sortBy", filters.sortBy)
  if (filters?.minLiquidity) params.append("minLiquidity", filters.minLiquidity.toString())
  if (filters?.onlyWatched) params.append("onlyWatched", "true")

  const url = `${API_BASE_URL}/api/warp-pipes/feed${params.toString() ? `?${params}` : ""}`

  const response = await fetch(url, { headers: getAuthHeaders() })

  if (!response.ok) {
    throw new Error("Failed to fetch warp pipes feed")
  }

  return response.json()
}

/**
 * Add a token to watchlist
 */
export async function addTokenWatch(
  request: AddWatchRequest
): Promise<{ success: boolean; watch: any }> {
  const response = await fetch(`${API_BASE_URL}/api/warp-pipes/watch`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to add token watch")
  }

  return response.json()
}

/**
 * Remove a token from watchlist
 */
export async function removeTokenWatch(mint: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE_URL}/api/warp-pipes/watch/${mint}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to remove token watch")
  }

  return response.json()
}

/**
 * Update watch preferences
 */
export async function updateWatchPreferences(
  mint: string,
  request: UpdateWatchRequest
): Promise<{ success: boolean; watch: any }> {
  const response = await fetch(`${API_BASE_URL}/api/warp-pipes/watch/${mint}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Failed to update watch preferences")
  }

  return response.json()
}

/**
 * Get user's watched tokens
 */
export async function getUserWatches(): Promise<{ watches: any[] }> {
  const response = await fetch(`${API_BASE_URL}/api/warp-pipes/watches`, {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error("Failed to fetch user watches")
  }

  return response.json()
}

/**
 * Get health data for a specific token
 */
export async function getTokenHealth(mint: string): Promise<{ mint: string; health: any }> {
  const response = await fetch(`${API_BASE_URL}/api/warp-pipes/health/${mint}`)

  if (!response.ok) {
    throw new Error("Failed to fetch token health")
  }

  return response.json()
}

/**
 * Get detailed token information
 */
export async function getTokenDetails(
  mint: string
): Promise<{ token: TokenRow }> {
  const response = await fetch(`${API_BASE_URL}/api/warp-pipes/token/${mint}`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error("Failed to fetch token details")
  }

  return response.json()
}
