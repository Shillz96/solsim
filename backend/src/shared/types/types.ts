// Import Decimal for type safety
import { Decimal } from 'decimal.js'

// User types
export interface User {
  id: string
  email: string
  username: string
  virtualSolBalance: Decimal
  avatar?: string
  twitter?: string
  discord?: string
  createdAt: Date
  updatedAt: Date
}

// User API response type (with serialized Decimal as string)
export interface UserResponse {
  id: string
  email: string
  username: string
  virtualSolBalance: string // Serialized Decimal
  avatar?: string
  twitter?: string
  discord?: string
  createdAt: string
  updatedAt: string
}

// Trade types
export enum TradeAction {
  BUY = 'BUY',
  SELL = 'SELL'
}

export interface Trade {
  id: string
  userId: string
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
  action: TradeAction
  quantity: Decimal
  price: Decimal
  totalCost: Decimal
  realizedPnL?: Decimal
  timestamp: Date
}

// Trade API response type (with serialized Decimals)
export interface TradeResponse {
  id: string
  userId: string
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
  action: TradeAction
  quantity: string // Serialized Decimal
  price: string // Serialized Decimal
  totalCost: string // Serialized Decimal
  realizedPnL?: string
  timestamp: string
}

// Holding types
export interface Holding {
  id: string
  userId: string
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
  entryPrice: Decimal
  quantity: Decimal
  currentPrice?: Decimal // Current market price
  unrealizedPnL?: Decimal // Unrealized P&L amount
  unrealizedPnLPercent?: Decimal // Unrealized P&L percentage
  updatedAt: Date
}

// Holding API response type
export interface HoldingResponse {
  id: string
  userId: string
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
  entryPrice: string // Serialized Decimal
  quantity: string // Serialized Decimal
  updatedAt: string
}

// Token types
export interface Token {
  id: string
  address: string
  symbol: string
  name: string
  decimals: number
  logoUri?: string
  description?: string
}

// Request/Response types for authentication
export interface AuthenticatedRequest extends Request {
  userId?: string
  user?: {
    id: string
    email: string
    username: string
  }
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  meta?: {
    total?: number
    page?: number
    limit?: number
    [key: string]: any
  }
}

// Portfolio types
export interface PortfolioSummary {
  totalValue: Decimal
  totalCost: Decimal
  totalPnL: Decimal
  totalPnLPercent: Decimal
  holdings: HoldingResponse[]
  solBalance: string
}

// Portfolio API response type
export interface PortfolioResponse {
  totalValue: string // Serialized Decimal
  totalCost: string // Serialized Decimal
  totalPnL: string // Serialized Decimal
  totalPnLPercent: string // Serialized Decimal
  holdings: HoldingResponse[]
  solBalance: string
}

// Trade request types
export interface TradeRequest {
  tokenAddress: string
  amountSol: number
}

export interface BuyTradeRequest extends TradeRequest {
  action: 'buy'
}

export interface SellTradeRequest extends TradeRequest {
  action: 'sell'
}

// Trade result types
export interface TradeResult {
  trade: TradeResponse
  updatedBalance: string
  updatedHolding?: HoldingResponse
}

// Error types
export interface ErrorResponse {
  success: false
  error: string
  code?: string
  details?: any
}

// Pagination types
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Market data types
export interface PriceData {
  tokenAddress: string
  price: number
  priceChange24h?: number
  volume24h?: number
  marketCap?: number
  lastUpdated: Date
}

export interface TrendingToken {
  address: string
  symbol?: string
  name?: string
  price: number
  priceChange24h: number
  volume24h: number
  marketCap?: number
  rank?: number
}

// WebSocket types
export interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
}

export interface PriceUpdate extends WebSocketMessage {
  type: 'price_update'
  data: {
    tokenAddress: string
    price: number
    priceChange: number
  }
}

export interface TradeUpdate extends WebSocketMessage {
  type: 'trade_update'
  data: {
    userId: string
    trade: TradeResponse
  }
}

export interface BalanceUpdate extends WebSocketMessage {
  type: 'balance_update'
  data: {
    userId: string
    newBalance: string
  }
}

// Service types
export interface ServiceFactory {
  getTradeService(): any
  getPortfolioService(): any
  getPriceService(): any
  getTrendingService(): any
}

// Configuration types
export interface DatabaseConfig {
  url: string
  maxConnections?: number
  connectionTimeoutMs?: number
}

export interface RedisConfig {
  host: string
  port: number
  password?: string
  db?: number
}

export interface AppConfig {
  port: number
  env: 'development' | 'production' | 'test'
  corsOrigins: string[]
  jwtSecret: string
  database: DatabaseConfig
  redis?: RedisConfig
}

// Validation types
export interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object'
  min?: number
  max?: number
  pattern?: RegExp
  enum?: any[]
  custom?: (value: any) => boolean | string
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  data?: any
}

// Cache types
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number
  enableStats?: boolean
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number
  max: number
  message?: string
  standardHeaders?: boolean
  legacyHeaders?: boolean
}

// Logging types
export interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  data?: any
  timestamp: Date
  userId?: string
  requestId?: string
}

// Audit types
export interface AuditLogEntry {
  id: string
  userId: string
  action: string
  resourceType: string
  resourceId?: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
  timestamp: Date
}

// Search types
export interface SearchParams {
  query: string
  filters?: {
    tokenType?: string
    minMarketCap?: number
    maxMarketCap?: number
    minVolume?: number
    maxVolume?: number
    minPriceChange?: number
    maxPriceChange?: number
  }
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
  pagination?: PaginationParams
}

export interface SearchResult<T> {
  items: T[]
  total: number
  hasMore: boolean
  aggregations?: {
    [key: string]: any
  }
}

// Analytics types
export interface AnalyticsEvent {
  name: string
  userId?: string
  properties?: {
    [key: string]: any
  }
  timestamp?: Date
}

export interface UserStats {
  totalTrades: number
  totalVolume: string // Serialized Decimal
  winRate: number
  bestTrade: string // Serialized Decimal
  worstTrade: string // Serialized Decimal
  averageHoldTime: number // in hours
  favoriteTokens: string[]
}