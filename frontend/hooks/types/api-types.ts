// API Types for SolSim Trading Platform

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  solBalance: number;
  createdAt: string;
}

export interface TrendingToken {
  address: string;
  name: string;
  symbol: string;
  logoUrl: string;
  price: number;
  priceChange24h: number;
  priceChange7d?: number;
  marketCap?: number;
  volume24h?: number;
  fdv?: number;
  trendScore?: number;
}

export interface TokenDetails extends TrendingToken {
  description?: string;
  website?: string;
  twitter?: string;
  discord?: string;
  holders?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  liquidityUsd?: number;
  isPumpToken?: boolean;
  firstListed?: string;
  tags?: string[];
}

export interface TokenBalance {
  tokenAddress: string;
  quantity: number;
  symbol: string;
  name?: string;
  logoUrl?: string;
  valueUsd?: number;
  pnlUsd?: number;
  pnlPercentage?: number;
}

export interface Portfolio {
  solBalance: number;
  totalValueUsd: number;
  pnlUsd: number;
  pnlPercentage: number;
  holdings: TokenBalance[];
}

export interface PortfolioHistoryPoint {
  timestamp: number;
  value: number;
  solBalance?: number;
  tokenValue?: number;
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  tokenAddress: string;
  tokenSymbol: string;
  tokenName?: string;
  tokenLogoUrl?: string;
  quantity: number;
  pricePerToken: number;
  totalValueUsd: number;
  pnlUsd?: number;
  pnlPercentage?: number;
  timestamp: string;
}

export interface TradeRequest {
  tokenAddress: string;
  amount: number;
  tradeType: 'buy' | 'sell';
  slippageTolerance?: number;
}

export interface TradeResponse {
  success: boolean;
  transactionId?: string;
  tokenAddress: string;
  quantity: number;
  pricePerToken: number;
  totalValueUsd: number;
  solBalance: number;
  error?: string;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  totalValueUsd: number;
  pnlPercentage: number;
  rank: number;
}

export interface WatchlistItem {
  id: string;
  tokenAddress: string;
  token: {
    address: string;
    name: string;
    symbol: string;
    logoUrl?: string;
    price: number;
    priceChange24h: number;
  };
  addedAt: string;
}