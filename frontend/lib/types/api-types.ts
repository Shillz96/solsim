// Comprehensive API Types for Frontend-Backend Integration
// This file provides complete type safety for all API interactions

// ================================
// SHARED RESPONSE INTERFACES
// ================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    userId?: string
    timestamp?: number
    pagination?: PaginationMeta
    count?: number
    limit?: number
    category?: string
  }
}

export interface PaginationMeta {
  limit: number
  offset: number
  hasMore: boolean
  total?: number
}

// ================================
// AUTH INTERFACES
// ================================

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  username?: string
  solanaWallet?: string
}

export interface AuthResponse {
  token: string
  user: User
  isNew?: boolean
}

export interface User {
  id: string
  email: string
  username: string | null
  virtualSolBalance: string
  displayName?: string
  bio?: string
  website?: string
  twitter?: string
  discord?: string
  telegram?: string
  avatarUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ForgotPasswordRequest {
  email: string
}

// ================================
// PORTFOLIO INTERFACES
// ================================

export interface Portfolio {
  totalValue: {
    sol: string
    usd: string
  }
  totalInvested: {
    sol: string
    usd: string
  }
  totalPnL: {
    sol: string
    usd: string
    percent: number
  }
  solBalance: string
  holdings: Holding[]
  positionCount: number
}

export interface Holding {
  id: string
  userId: string
  tokenAddress: string
  tokenSymbol: string | null
  tokenName: string | null
  tokenImageUrl: string | null
  quantity: string
  entryPrice: string
  avgBuyMarketCap: string | null
  currentPrice?: number
  currentValue?: string
  realizedPnL?: string
  unrealizedPnL?: string
  totalPnL?: string
  pnlPercent?: number
  createdAt: string
  updatedAt: string
}

export interface PerformanceData {
  period: string
  totalInvested: number
  currentValue: number
  totalReturn: number
  totalReturnPercentage: number
  realizedPnL: number
  unrealizedPnL: number
  winRate: number
  totalTrades: number
  profitableTrades: number
  tradeHistory: PerformanceHistoryPoint[]
}

export interface PerformanceHistoryPoint {
  date: string
  value: number
  pnl: number
}

// ================================
// TRADING INTERFACES
// ================================

export interface TradeRequest {
  action: 'buy' | 'sell'
  tokenAddress: string
  amountSol: number
}

export interface Trade {
  id: string
  userId: string
  tokenAddress: string
  tokenSymbol: string | null
  tokenName: string | null
  tokenImageUrl?: string | null
  action: 'BUY' | 'SELL'
  quantity: string
  price: string
  totalCost: string
  realizedPnL: string | null
  timestamp: string
  marketCap?: string
}

export interface TradeResult {
  trade: Trade
  updatedBalance: string
  updatedHolding?: {
    id: string
    quantity: string
    entryPrice: string
  }
}

export interface TradeHistory {
  trades: Trade[]
  pagination: PaginationMeta
}

export interface TradeStats {
  totalTrades: number
  buyTrades: number
  sellTrades: number
  totalRealizedPnL: number
  winRate: number
  totalVolume: number
  avgTradeSize: number
  biggestWin: number
  biggestLoss: number
}

// ================================
// MARKET DATA INTERFACES
// ================================

export interface TokenPrice {
  tokenAddress: string
  tokenSymbol: string | null
  tokenName: string | null
  price: number
  priceChange24h: number
  priceChangePercent24h: number
  volume24h: number
  marketCap: number
  holders?: number
  imageUrl: string | null
  lastUpdated: string
}

export interface TrendingToken extends TokenPrice {
  trendScore: number
  reason: string
  category?: 'gainers' | 'losers' | 'volume' | 'new'
}

export interface TokenSearchResult {
  address: string
  symbol: string | null
  name: string | null
  price: string | null
  priceChange24h?: number
  marketCap?: number
  imageUrl: string | null
  trending?: boolean
}

export interface TokenDetails extends TokenPrice {
  description?: string
  website?: string
  twitter?: string
  telegram?: string
  liquidity?: number
  fdv?: number
  supply?: number
  maxSupply?: number
  dilutedMarketCap?: number
}

export interface MarketStats {
  solPrice: number
  solPriceChange24h: number
  totalMarketCap: number
  totalVolume24h: number
  activeTokens: number
  topGainer: TokenPrice
  topLoser: TokenPrice
}

export interface SearchTokensParams {
  q: string
  limit?: number
}

export interface BatchPricesRequest {
  tokenAddresses: string[]
}

// ================================
// LEADERBOARD INTERFACES
// ================================

export interface LeaderboardEntry {
  id: string
  username: string
  email: string
  balance: number
  totalPnL: number
  totalTrades: number
  winRate: number
  lastTradeDate: number | null
  rank?: number
  previousRank?: number
  avatar?: string
  displayName?: string
}

// ================================
// USER PROFILE INTERFACES
// ================================

export interface UserProfile extends User {
  rank?: number
  stats?: {
    totalTrades: number
    winRate: number
    totalPnL: number
    avgTradeSize: number
  }
  isPublic?: boolean
}

export interface UpdateProfileRequest {
  displayName?: string
  bio?: string
  website?: string
  twitter?: string
  discord?: string
  telegram?: string
}

export interface UserSettings {
  notifications: {
    email: boolean
    browser: boolean
    trading: boolean
    portfolio: boolean
  }
  privacy: {
    publicProfile: boolean
    showBalance: boolean
    showTrades: boolean
  }
  trading: {
    confirmTrades: boolean
    defaultSlippage: number
    autoRefresh: boolean
  }
}

// ================================
// MONITORING INTERFACES
// ================================

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: number
  uptime: number
  version: string
  database: {
    status: 'connected' | 'disconnected'
    responseTime: number
  }
  services: {
    priceService: boolean
    tradingService: boolean
    portfolioService: boolean
  }
}

export interface SystemMetrics {
  memory: {
    used: number
    total: number
    percentage: number
  }
  cpu: {
    usage: number
  }
  requests: {
    total: number
    errors: number
    avgResponseTime: number
  }
  database: {
    connections: number
    queries: number
    avgQueryTime: number
  }
}

// ================================
// ERROR INTERFACES
// ================================

export interface ApiError {
  message: string
  status: number
  code?: string
  details?: any
}

export interface ValidationError extends ApiError {
  field?: string
  value?: any
}

// ================================
// WEBSOCKET INTERFACES
// ================================

export interface WebSocketMessage {
  type: 'trade_executed' | 'trade_update' | 'price_update' | 'portfolio_update'
  userId?: string
  tokenAddress?: string
  timestamp: number
  data: any
}

export interface TradeExecutedMessage extends WebSocketMessage {
  type: 'trade_executed'
  data: {
    trade: Trade
    updatedBalance: string
    updatedHolding?: Holding
  }
}

export interface PriceUpdateMessage extends WebSocketMessage {
  type: 'price_update'
  data: {
    tokenAddress: string
    price: number
    change24h: number
  }
}

// ================================
// UTILITY TYPES
// ================================

export type SortOrder = 'asc' | 'desc'
export type TimePeriod = '24h' | '7d' | '30d' | '90d' | '1y' | 'all'
export type TradeAction = 'buy' | 'sell'
export type TokenCategory = 'gainers' | 'losers' | 'volume' | 'new'