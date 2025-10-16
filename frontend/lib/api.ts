// Centralized API Client for New Backend
// Maps to openapi.yaml contract from backend

import type * as Backend from './types/backend';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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

// Re-export types for convenience (excluding portfolio types which are in backend types)
export type {
  TradeRequest,
  TradeResponse,
  LeaderboardEntry,
  TrendingToken,
  TrendingTokenResponse,
  EnrichedTrade as TradeHistoryItem,
  TradesResponse,
  TradeStats,
  RewardsClaimRequest,
  RewardsClaimResponse,
  AuthSignupRequest,
  AuthLoginRequest,
  AuthResponse,
  WalletNonceRequest,
  WalletNonceResponse,
  WalletVerifyRequest,
  ProfileUpdateRequest,
  TokenSearchResult,
  SearchResponse,
  WalletBalance,
  WalletTransaction,
  WalletStats,
  TrackedWallet,
  WalletActivity,
  RewardClaim,
  RewardStats,
  PriceUpdate,
  WebSocketMessage,
  ApiError,
  User,
  PortfolioPosition,
  PortfolioResponse,
  Token
} from './types/backend';

// All types are now imported from ./types/backend

// ================================
// API Functions
// ================================

/**
 * Execute a trade (buy or sell)
 * POST /api/trade
 */
export async function trade(request: Backend.TradeRequest): Promise<Backend.TradeResponse> {
  const response = await fetch(`${API}/api/trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Trade failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get user portfolio with positions and totals
 * GET /api/portfolio?userId={userId}
 */
export async function getPortfolio(userId: string): Promise<Backend.PortfolioResponse> {
  const response = await fetch(`${API}/api/portfolio?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch portfolio' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get user portfolio with real-time price updates
 * GET /api/portfolio/realtime?userId={userId}
 */
export async function getPortfolioRealtime(userId: string): Promise<Backend.PortfolioResponse> {
  const response = await fetch(`${API}/api/portfolio/realtime?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch real-time portfolio' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get trading statistics for a user
 * GET /api/portfolio/stats?userId={userId}
 */
export async function getPortfolioStats(userId: string): Promise<Backend.TradingStats> {
  const response = await fetch(`${API}/api/portfolio/stats?userId=${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch portfolio stats' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get portfolio performance over time
 * GET /api/portfolio/performance?userId={userId}&days={days}
 */
export async function getPortfolioPerformance(userId: string, days: number = 30): Promise<Backend.PortfolioPerformanceResponse> {
  const response = await fetch(`${API}/api/portfolio/performance?userId=${encodeURIComponent(userId)}&days=${days}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch portfolio performance' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get trending tokens
 * GET /api/trending
 */
export async function getTrendingTokens(): Promise<Backend.TrendingToken[]> {
  const response = await fetch(`${API}/api/trending`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch trending tokens' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.items; // Backend returns { items: TrendingToken[] }
}

/**
 * Get token details by mint address
 * GET /api/search/token/{mint}
 */
export async function getTokenDetails(mint: string): Promise<Backend.Token> {
  const response = await fetch(`${API}/api/search/token/${encodeURIComponent(mint)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch token details' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  const data = await response.json();
  
  // Map backend fields to the expected frontend fields
  return {
    ...data,
    address: data.mint || data.address,
    imageUrl: data.logoURI || data.imageUrl, // Map logoURI to imageUrl
    price: data.price || (data.lastPrice ? parseFloat(data.lastPrice) : 0), // Only parse for display
    isNew: data.isNew || false,
    isTrending: data.isTrending || false,
  };
}

/**
 * Search tokens by name/symbol
 * GET /api/search/tokens?q={query}&limit={limit}
 */
export async function searchTokens(query: string, limit: number = 20): Promise<Backend.TokenSearchResult[]> {
  if (!query || query.length < 2) {
    throw new Error('Query must be at least 2 characters');
  }

  const response = await fetch(`${API}/api/search/tokens?q=${encodeURIComponent(query)}&limit=${limit}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Search failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  // Transform backend response to include convenience fields
  return (data.results || []).map((token: any) => ({
    ...token,
    address: token.mint || token.address,
    imageUrl: token.logoURI || token.imageUrl,
    price: token.priceUsd || token.price || 0,
    lastPrice: token.priceUsd?.toString() || token.price?.toString() || null,
  }));
}

/**
 * Get leaderboard rankings
 * GET /api/leaderboard?limit={limit}
 */
export async function getLeaderboard(limit: number = 50): Promise<Backend.LeaderboardEntry[]> {
  const response = await fetch(`${API}/api/leaderboard?limit=${limit}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch leaderboard' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get trending tokens
 * GET /api/trending
 */
export async function getTrending(sortBy: 'rank' | 'volume24hUSD' | 'liquidity' = 'rank'): Promise<Backend.TrendingToken[]> {
  const response = await fetch(`${API}/api/trending?sortBy=${sortBy}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch trending tokens' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.items; // Backend returns { items: TrendingToken[] }
}

/**
 * Get tokenized stocks
 * GET /api/stocks
 */
export async function getStocks(limit: number = 50): Promise<Backend.TrendingToken[]> {
  const response = await fetch(`${API}/api/stocks?limit=${limit}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch stocks' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.items; // Backend returns { items: StockToken[] } (compatible with TrendingToken)
}

/**
 * Claim vSOL rewards
 * POST /api/rewards/claim
 */
export async function claimRewards(request: Backend.RewardsClaimRequest): Promise<Backend.RewardsClaimResponse> {
  const response = await fetch(`${API}/api/rewards/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to claim rewards' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get recent trades (global feed)
 * GET /api/trades?limit={limit}&offset={offset}
 */
export async function getTrades(limit: number = 50, offset: number = 0): Promise<Backend.TradesResponse> {
  const response = await fetch(`${API}/api/trades?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch trades' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get trades for a specific user
 * GET /api/trades/user/{userId}?limit={limit}&offset={offset}
 */
export async function getUserTrades(userId: string, limit: number = 50, offset: number = 0): Promise<Backend.TradesResponse> {
  const response = await fetch(`${API}/api/trades/user/${encodeURIComponent(userId)}?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch user trades' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get trades for a specific token
 * GET /api/trades/token/{mint}?limit={limit}&offset={offset}
 */
export async function getTokenTrades(mint: string, limit: number = 50, offset: number = 0): Promise<Backend.TradesResponse> {
  const response = await fetch(`${API}/api/trades/token/${encodeURIComponent(mint)}?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch token trades' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get trade statistics
 * GET /api/trades/stats
 */
export async function getTradeStats(): Promise<Backend.TradeStats> {
  const response = await fetch(`${API}/api/trades/stats`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch trade stats' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Email signup
 * POST /api/auth/signup-email
 */
export async function signupEmail(request: Backend.AuthSignupRequest): Promise<Backend.AuthResponse> {
  const response = await fetch(`${API}/api/auth/signup-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Signup failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Email login
 * POST /api/auth/login-email
 */
export async function loginEmail(request: Backend.AuthLoginRequest): Promise<Backend.AuthResponse> {
  const response = await fetch(`${API}/api/auth/login-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get wallet nonce for Sign-In With Solana
 * POST /api/auth/wallet/nonce
 */
export async function getWalletNonce(request: Backend.WalletNonceRequest): Promise<Backend.WalletNonceResponse> {
  const response = await fetch(`${API}/api/auth/wallet/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to get nonce' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Verify wallet signature
 * POST /api/auth/wallet/verify
 */
export async function verifyWallet(request: Backend.WalletVerifyRequest): Promise<Backend.AuthResponse> {
  const response = await fetch(`${API}/api/auth/wallet/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Wallet verification failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Update user profile
 * POST /api/auth/profile
 */
export async function updateProfile(request: Backend.ProfileUpdateRequest): Promise<{ success: boolean; user?: Partial<Backend.User> }> {
  const response = await fetch(`${API}/api/auth/profile`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Profile update failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get user profile details
 * GET /api/auth/user/{userId}
 */
export async function getUserProfile(userId: string): Promise<Backend.User> {
  const response = await fetch(`${API}/api/auth/user/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch user profile' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Change user password
 * POST /api/auth/change-password
 */
export async function changePassword(request: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API}/api/auth/change-password`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to change password' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Update user avatar
 * POST /api/auth/update-avatar
 */
export async function updateAvatar(request: {
  userId: string;
  avatarUrl: string;
}): Promise<{ success: boolean; avatarUrl: string; message: string }> {
  const response = await fetch(`${API}/api/auth/update-avatar`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update avatar' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Remove user avatar
 * POST /api/auth/remove-avatar
 */
export async function removeAvatar(userId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API}/api/auth/remove-avatar`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to remove avatar' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ================================
// Helper Functions
// ================================

/**
 * Generic API call wrapper with error handling
 */
export async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API call failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ================================
// Generic API Client (axios-like interface)
// ================================

interface ApiRequestConfig {
  params?: Record<string, any>;
  headers?: HeadersInit;
}

interface ApiResponse<T> {
  data: T;
  status: number;
}

export const api = {
  async get<T>(endpoint: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const params = config?.params
      ? '?' + new URLSearchParams(config.params).toString()
      : '';

    const response = await fetch(`${API}${endpoint}${params}`, {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        ...config?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { data, status: response.status };
  },

  async post<T>(endpoint: string, body?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response = await fetch(`${API}${endpoint}`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...config?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { data, status: response.status };
  },

  async patch<T>(endpoint: string, body?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response = await fetch(`${API}${endpoint}`, {
      method: 'PATCH',
      headers: {
        ...getAuthHeaders(),
        ...config?.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { data, status: response.status };
  },

  async delete<T>(endpoint: string, config?: ApiRequestConfig): Promise<ApiResponse<T>> {
    const response = await fetch(`${API}${endpoint}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        ...config?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { data, status: response.status };
  },
};

/**
 * Get user's reward claims
 * GET /api/rewards/claims/{userId}
 */
export async function getUserRewardClaims(userId: string): Promise<Backend.RewardClaim[]> {
  const response = await fetch(`${API}/api/rewards/claims/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch reward claims' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.claims; // Backend returns { claims: RewardClaim[] }
}

/**
 * Get reward statistics
 * GET /api/rewards/stats
 */
export async function getRewardStats(): Promise<Backend.RewardStats> {
  const response = await fetch(`${API}/api/rewards/stats`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch reward stats' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ================================
// Wallet & Balance Functions
// ================================

/**
 * Get user's virtual SOL balance
 * GET /api/wallet/balance/{userId}
 */
export async function getWalletBalance(userId: string): Promise<Backend.WalletBalance> {
  const response = await fetch(`${API}/api/wallet/balance/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch balance' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get wallet transaction history
 * GET /api/wallet/transactions/{userId}?limit={limit}&offset={offset}
 */
export async function getWalletTransactions(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ transactions: Backend.WalletTransaction[] }> {
  const response = await fetch(
    `${API}/api/wallet/transactions/${encodeURIComponent(userId)}?limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch transactions' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get wallet statistics
 * GET /api/wallet/stats/{userId}
 */
export async function getWalletStats(userId: string): Promise<Backend.WalletStats> {
  const response = await fetch(`${API}/api/wallet/stats/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch wallet stats' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ================================
// Purchase Functions
// ================================

/**
 * Get available purchase tiers
 * GET /api/purchase/tiers
 */
export async function getPurchaseTiers(): Promise<Backend.PurchaseTiersResponse> {
  const response = await fetch(`${API}/api/purchase/tiers`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch purchase tiers' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Initiate a SOL purchase
 * POST /api/purchase/initiate
 */
export async function initiatePurchase(
  request: Backend.PurchaseRequest
): Promise<Backend.PurchaseInitiateResponse> {
  const response = await fetch(`${API}/api/purchase/initiate`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to initiate purchase' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Verify a purchase transaction
 * POST /api/purchase/verify
 */
export async function verifyPurchase(
  request: Backend.PurchaseVerifyRequest
): Promise<Backend.PurchaseVerifyResponse> {
  const response = await fetch(`${API}/api/purchase/verify`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to verify purchase' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get purchase history for a user
 * GET /api/purchase/history/{userId}
 */
export async function getPurchaseHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ purchases: Backend.PurchaseHistory[]; total: number }> {
  const response = await fetch(
    `${API}/api/purchase/history/${encodeURIComponent(userId)}?limit=${limit}&offset=${offset}`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch purchase history' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// ================================
// Perpetual Trading Functions
// ================================

/**
 * Open a new perpetual position
 * POST /api/perp/open
 */
export async function openPerpPosition(request: {
  userId: string;
  mint: string;
  side: "LONG" | "SHORT";
  leverage: number;
  marginAmount: string;
}): Promise<any> {
  const response = await fetch(`${API}/api/perp/open`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to open perp position' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Close an existing perpetual position
 * POST /api/perp/close
 */
export async function closePerpPosition(request: {
  userId: string;
  positionId: string;
}): Promise<any> {
  const response = await fetch(`${API}/api/perp/close`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to close perp position' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get user's open perpetual positions
 * GET /api/perp/positions/{userId}
 */
export async function getPerpPositions(userId: string): Promise<any> {
  const response = await fetch(`${API}/api/perp/positions/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch perp positions' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.positions || [];
}

/**
 * Get user's perpetual trade history
 * GET /api/perp/history/{userId}
 */
export async function getPerpTradeHistory(userId: string, limit?: number): Promise<any> {
  const url = `${API}/api/perp/history/${encodeURIComponent(userId)}${limit ? `?limit=${limit}` : ''}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch perp history' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.trades || [];
}

export default {
  trade,
  getPortfolio,
  getPortfolioRealtime,
  getPortfolioStats,
  getPortfolioPerformance,
  getLeaderboard,
  getTrendingTokens,
  getTrending,
  getStocks,
  getTokenDetails,
  searchTokens,
  claimRewards,
  getUserRewardClaims,
  getRewardStats,
  signupEmail,
  loginEmail,
  getWalletNonce,
  verifyWallet,
  updateProfile,
  getUserProfile,
  changePassword,
  updateAvatar,
  removeAvatar,
  getWalletBalance,
  getWalletTransactions,
  getWalletStats,
  getTrades,
  getUserTrades,
  getTokenTrades,
  getTradeStats,
  getPurchaseTiers,
  initiatePurchase,
  verifyPurchase,
  getPurchaseHistory,
  openPerpPosition,
  closePerpPosition,
  getPerpPositions,
  getPerpTradeHistory,
  apiCall,
};

