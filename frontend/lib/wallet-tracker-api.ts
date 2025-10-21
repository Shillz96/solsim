// Wallet Tracker API Client
import type * as Backend from './types/backend';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Track a new wallet address
 * POST /api/wallet-tracker/track
 */
export async function trackWallet(
  userId: string,
  walletAddress: string,
  label?: string
): Promise<{ id: string; walletAddress: string; label: string | null; message: string }> {
  const response = await fetch(`${API}/api/wallet-tracker/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, walletAddress, label }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to track wallet' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get user's tracked wallets
 * GET /api/wallet-tracker/user/{userId}
 */
export async function getTrackedWallets(
  userId: string
): Promise<{ trackedWallets: Backend.TrackedWallet[] }> {
  const response = await fetch(`${API}/api/wallet-tracker/user/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch tracked wallets' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Untrack a wallet
 * DELETE /api/wallet-tracker/{trackingId}
 */
export async function untrackWallet(trackingId: string): Promise<{ message: string }> {
  const response = await fetch(`${API}/api/wallet-tracker/${encodeURIComponent(trackingId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to untrack wallet' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get wallet activity
 * GET /api/wallet-tracker/activity/{walletAddress}?limit={limit}
 */
export async function getWalletActivity(
  walletAddress: string,
  limit: number = 50
): Promise<{ walletAddress: string; activity: Backend.WalletActivity[] }> {
  const response = await fetch(
    `${API}/api/wallet-tracker/activity/${encodeURIComponent(walletAddress)}?limit=${limit}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch wallet activity' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Copy trade from tracked wallet
 * POST /api/wallet-tracker/copy-trade
 */
export async function copyTrade(
  userId: string,
  walletAddress: string,
  signature: string,
  percentage: number = 100
): Promise<{
  success: boolean;
  copyTradeId: string;
  originalAmount: number;
  copiedAmount: number;
  percentage: number;
  token: string;
}> {
  const response = await fetch(`${API}/api/wallet-tracker/copy-trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, walletAddress, signature, percentage }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to copy trade' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get tracking statistics
 * GET /api/wallet-tracker/stats/{userId}
 */
export async function getTrackingStats(
  userId: string
): Promise<{ userId: string; totalTracked: number }> {
  const response = await fetch(`${API}/api/wallet-tracker/stats/${encodeURIComponent(userId)}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch tracking stats' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get activity feed from V2 endpoint with filtering
 * GET /api/wallet-tracker/v2/feed/{userId}
 */
export async function getActivityFeed(
  userId: string,
  params?: {
    limit?: number;
    offset?: number;
    type?: string;
    tokenMint?: string;
  }
): Promise<{
  activities: any[];
  hasMore: boolean;
  nextOffset: number | null;
}> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.offset) queryParams.set('offset', params.offset.toString());
  if (params?.type) queryParams.set('type', params.type);
  if (params?.tokenMint) queryParams.set('tokenMint', params.tokenMint);

  const response = await fetch(
    `${API}/api/wallet-tracker/v2/feed/${encodeURIComponent(userId)}?${queryParams}`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch activity feed' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Sync wallet activities from blockchain
 * POST /api/wallet-tracker/v2/sync/{walletAddress}
 */
export async function syncWalletActivities(
  walletAddress: string,
  limit?: number
): Promise<{
  message: string;
  activitiesCount: number;
  latestActivity: { signature: string; timestamp: string } | null;
}> {
  const response = await fetch(
    `${API}/api/wallet-tracker/v2/sync/${encodeURIComponent(walletAddress)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: limit?.toString() || '100' }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to sync wallet' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}
