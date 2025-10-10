// Centralized API Client for New Backend
// Maps to openapi.yaml contract from backend

import type * as Backend from './types/backend';
import type {
  UserNote,
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteResponse,
  DeleteNoteResponse,
} from './types/notes';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
  Token,
  // Note types from notes.ts
  UserNote,
  CreateNoteRequest,
  UpdateNoteRequest,
  NotesResponse,
  NoteResponse,
  DeleteNoteResponse
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
    headers: { 'Content-Type': 'application/json' },
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
    price: data.price || Number(data.lastPrice) || 0,
    isNew: data.isNew || false,
    isTrending: data.isTrending || false,
  };
}

/**
 * Get user notes for a specific token or all tokens
 * GET /api/notes?userId={userId}&tokenAddress={tokenAddress}
 */
export async function getUserNotes(userId: string, tokenAddress?: string): Promise<UserNote[]> {
  const params = new URLSearchParams({
    userId
  });
  
  if (tokenAddress) {
    params.append('tokenAddress', tokenAddress);
  }
  
  const response = await fetch(`${API}/api/notes?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch notes' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.notes;
}

/**
 * Create a new note
 * POST /api/notes
 */
export async function createNote(request: CreateNoteRequest): Promise<NoteResponse> {
  const response = await fetch(`${API}/api/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create note' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Update an existing note
 * PUT /api/notes/{noteId}
 */
export async function updateNote(noteId: string, request: UpdateNoteRequest): Promise<NoteResponse> {
  const response = await fetch(`${API}/api/notes/${encodeURIComponent(noteId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to update note' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Delete a note
 * DELETE /api/notes/{noteId}?userId={userId}
 */
export async function deleteNote(noteId: string, userId: string): Promise<DeleteNoteResponse> {
  const params = new URLSearchParams({
    userId
  });
  
  const response = await fetch(`${API}/api/notes/${encodeURIComponent(noteId)}?${params.toString()}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to delete note' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
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
export async function getTrending(): Promise<Backend.TrendingToken[]> {
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
 * Claim SIM rewards
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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
    headers: { 'Content-Type': 'application/json' },
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

export default {
  trade,
  getPortfolio,
  getPortfolioRealtime,
  getPortfolioStats,
  getPortfolioPerformance,
  getLeaderboard,
  getTrendingTokens,
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
  apiCall,
};

