// Backend Types - Matching Prisma Schema and API Responses
// This file contains TypeScript types that match the backend database schema and API responses

// ================================
// Database Model Types (matching Prisma schema)
// ================================

export type UserTier = 'EMAIL_USER' | 'WALLET_USER' | 'SIM_HOLDER' | 'ADMINISTRATOR';

export interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  
  // Profile information
  displayName: string | null;
  bio: string | null;
  avatar: string | null;
  avatarUrl: string | null;
  
  // Social media links
  twitter: string | null;
  discord: string | null;
  telegram: string | null;
  website: string | null;
  
  // Trading preferences
  virtualSolBalance: string; // Decimal as string
  isProfilePublic: boolean;
  
  // Creator rewards
  solanaWallet: string | null;
  
  // Tier system and wallet verification
  userTier: UserTier;
  walletAddress: string | null;
  walletVerified: boolean;
  simTokenBalance: string | null; // Decimal as string
  simBalanceUpdated: string | null; // DateTime as ISO string
  monthlyConversions: string; // Decimal as string
  conversionResetAt: string | null; // DateTime as ISO string
  premiumFeatures: string | null; // JSON array as string
  
  // Timestamps
  createdAt: string; // DateTime as ISO string
  updatedAt: string; // DateTime as ISO string
}

export interface Trade {
  id: string;
  userId: string;
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  action: string; // 'BUY' or 'SELL'
  quantity: string; // Decimal as string
  price: string; // Decimal as string - Price per token in USD
  totalCost: string; // Decimal as string - Total cost in SOL
  realizedPnL: string | null; // Decimal as string - For sell trades only
  marketCapUsd: string | null; // Decimal as string
  timestamp: string; // DateTime as ISO string
}

export interface Holding {
  id: string;
  userId: string;
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  tokenImageUrl: string | null;
  entryPrice: string; // Decimal as string - Entry price in USD per token
  quantity: string; // Decimal as string
  avgBuyMarketCap: string | null; // Decimal as string
  updatedAt: string; // DateTime as ISO string
}

export interface TransactionHistory {
  id: string;
  userId: string;
  tokenAddress: string;
  tokenSymbol: string | null;
  tokenName: string | null;
  
  // Transaction details
  action: string; // 'BUY', 'SELL', 'MIGRATED'
  quantity: string; // Decimal as string
  pricePerTokenSol: string; // Decimal as string
  totalCostSol: string; // Decimal as string
  feesSol: string; // Decimal as string
  
  // FIFO tracking
  remainingQuantity: string; // Decimal as string
  costBasisSol: string; // Decimal as string
  realizedPnLSol: string | null; // Decimal as string
  
  // Reference to original trade
  tradeId: string | null;
  
  // Timestamps
  executedAt: string; // DateTime as ISO string
  createdAt: string; // DateTime as ISO string
}

export interface Token {
  address: string;
  symbol: string | null;
  name: string | null;
  imageUrl: string | null;
  lastPrice: string | null; // Decimal as string
  lastTs: string | null; // DateTime as ISO string

  // Short-term metrics
  volume5m: string | null; // Decimal as string
  volume1h: string | null; // Decimal as string
  volume24h: string | null; // Decimal as string
  priceChange5m: string | null; // Decimal as string
  priceChange1h: string | null; // Decimal as string
  priceChange24h: string | null; // Decimal as string
  liquidityUsd: string | null; // Decimal as string
  marketCapUsd: string | null; // Decimal as string
  holderCount: string | null; // BigInt as string

  // Discovery and trending flags
  isNew: boolean;
  isTrending: boolean;
  momentumScore: string | null; // Decimal as string

  // Social and metadata
  websites: string | null; // JSON array as string
  socials: string | null; // JSON array as string

  // Additional properties used in components
  price: number | null;

  // Timestamps
  firstSeenAt: string | null; // DateTime as ISO string
  lastUpdatedAt: string | null; // DateTime as ISO string
}

export interface ConversionHistory {
  id: string;
  userId: string;
  virtualSolAmount: string; // Decimal as string
  simTokensReceived: string; // Decimal as string
  conversionRate: string; // Decimal as string
  transactionHash: string | null;
  status: string; // 'PENDING', 'COMPLETED', 'FAILED', 'ESCROWED'
  createdAt: string; // DateTime as ISO string
  updatedAt: string; // DateTime as ISO string
}

// ================================
// API Response Types (enriched with metadata)
// ================================

export interface EnrichedTrade extends Trade {
  // Enriched fields from tokenService
  symbol?: string | null;
  name?: string | null;
  logoURI?: string | null;
  side: 'BUY' | 'SELL';
  qty: string;
  priceUsd: string;
  costUsd: string;
  createdAt: string;
  user?: {
    id: string;
    handle: string | null;
    profileImage: string | null;
  };
}

export interface PortfolioPosition {
  mint: string;
  qty: string;
  quantity: string;
  avgCostUsd: string;
  valueUsd: string;
  unrealizedUsd: string;
  unrealizedPercent: string;
  entryPrice: string;
  pnl?: {
    sol: {
      absolute: string;
      percent: number;
    };
  };
}

export interface PortfolioTotals {
  totalValueUsd: string;
  totalUnrealizedUsd: string;
  totalRealizedUsd: string;
  totalPnlUsd: string;
}

export interface PortfolioResponse {
  positions: PortfolioPosition[];
  totals: PortfolioTotals;
}

export interface LeaderboardEntry {
  userId: string;
  handle: string | null;
  profileImage: string | null;
  totalPnlUsd: string;
  totalTrades: number;
  winRate: number;
  totalVolumeUsd: string;
  rank: number;
}

export interface TrendingTokenResponse extends Token {
  // Additional fields for trending display
  priceChangeFormatted?: string;
  volumeFormatted?: string;
  marketCapFormatted?: string;
}

// ================================
// API Request/Response Types
// ================================

export interface TradeRequest {
  userId: string;
  mint: string;
  side: 'BUY' | 'SELL';
  qty: string;
}

export interface TradeResponse {
  success: boolean;
  trade: EnrichedTrade;
  position: PortfolioPosition | null;
}

export interface TradesResponse {
  trades: EnrichedTrade[];
}

export interface TradeStats {
  totalTrades: number;
  totalVolumeUsd: string;
  uniqueTraders: number;
}

export interface RewardsClaimRequest {
  userId: string;
  epoch: number;
  wallet: string;
}

export interface RewardsClaimResponse {
  sig: string;
  amount: string;
}

export interface AuthSignupRequest {
  email: string;
  password: string;
  handle?: string;
  profileImage?: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  userId: string;
}

export interface WalletNonceRequest {
  walletAddress: string;
}

export interface WalletNonceResponse {
  nonce: string;
}

export interface WalletVerifyRequest {
  walletAddress: string;
  signature: string;
}

export interface ProfileUpdateRequest {
  userId: string;
  handle?: string;
  profileImage?: string;
  bio?: string;
}

// ================================
// Utility Types
// ================================

export type ApiError = {
  message: string;
  code?: string;
  details?: any;
};

export type PaginationParams = {
  limit?: number;
  offset?: number;
};

export type TimeframeFilter = '5m' | '1h' | '24h' | '7d' | '30d' | '90d';

export type SortOrder = 'asc' | 'desc';

export type TradeAction = 'BUY' | 'SELL';

export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'ESCROWED';

// ================================
// WebSocket Types
// ================================

export interface PriceUpdate {
  mint: string;
  price: number;
  timestamp: number;
  source: string;
  volume?: number;
  marketCapUsd?: number | null;
  priceSol?: number;
  solUsd?: number;
}

export interface WebSocketMessage {
  type: 'price_update' | 'subscribe_token' | 'unsubscribe_token' | 'subscribe_all';
  data?: PriceUpdate;
  mint?: string;
}

// ================================
// Search and Filter Types
// ================================

export interface TokenSearchResult {
  mint: string;
  symbol: string;
  name: string;
  logoURI: string | null;
  priceUsd: number;
  marketCapUsd: number | null;
  liquidity: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  source: string;
  // Computed/convenience fields for UI
  address: string;  // Same as mint
  imageUrl: string | null; // Same as logoURI
  price: number;    // Same as priceUsd
  lastPrice: string | null; // String version of priceUsd
  trending?: boolean; // UI-only field
}

export interface SearchResponse {
  query: string;
  results: TokenSearchResult[];
}

// ================================
// Wallet and Balance Types
// ================================

export interface WalletBalance {
  userId: string;
  balance: string;
  currency: string;
}

export interface WalletTransaction {
  id: string;
  type: 'DEBIT' | 'CREDIT';
  amount: string;
  currency: string;
  description: string;
  mint?: string;
  timestamp: string;
}

export interface WalletStats {
  userId: string;
  balance: string;
  totalTradeVolume: string;
  totalTrades: number;
  activePositions: number;
  accountAge: number;
}

// ================================
// Reward System Types
// ================================

export interface RewardClaim {
  id: string;
  userId: string;
  epoch: number;
  wallet: string;
  amount: string; // Decimal as string from backend
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  claimedAt?: string; // DateTime as ISO string
  txSig?: string;
  createdAt: string; // DateTime as ISO string
}

export interface RewardSnapshot {
  id: string;
  epoch: number;
  totalPoints: string;
  poolAmount: string;
  createdAt: string;
}

export interface RewardStats {
  totalClaims: number;
  totalAmount: number; // Aggregated amount from all claims
  pendingClaims: number;
}

// ================================
// Wallet Tracking Types
// ================================

export interface TrackedWallet {
  id: string;
  userId: string;
  walletAddress: string;
  label: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface WalletActivity {
  signature: string;
  type: string;
  tokenIn: string | null;
  tokenOut: string | null;
  amountIn: string;
  amountOut: string;
  timestamp: string;
  program: string;
  fee: string;
}

export interface CopyTrade {
  id: string;
  userId: string;
  originalWallet: string;
  originalSignature: string;
  copyTradeId: string;
  percentage: number;
  originalAmount: string;
  copiedAmount: string;
  createdAt: string;
}

