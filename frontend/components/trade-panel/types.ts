/**
 * Trade Panel Type Definitions
 * Shared types for the refactored trade panel system
 */

export interface TokenDetails {
  tokenAddress: string
  tokenSymbol: string | null
  tokenName: string | null
  price: number
  priceChange24h: number
  volume24h: number
  marketCap: number
  imageUrl: string | null
}

export interface TradePresets {
  buyPresets: number[]
  sellPresets: number[]
}

export interface TradeState {
  // Buy state
  selectedSolAmount: number | null
  customSolAmount: string
  showCustomInput: boolean
  
  // Sell state
  selectedPercentage: number | null
  customSellPercentage: string
  
  // Trade execution state
  isTrading: boolean
  tradeError: string | null
  lastTradeSuccess: boolean
}

export interface PositionData {
  qty: string
  avgCostUsd: string
  valueUsd: string
  unrealizedUsd: string
  unrealizedPercent: string
  currentPrice: string
}

export interface RealtimePnL {
  unrealizedPnL: number
  unrealizedPercent: number
  currentValue: number
  costBasis: number
}

export interface TradeEstimate {
  tokenQuantity: number
  solAmount: number
  usdValue: number
}

export interface TradeFees {
  totalFeePercent: number
  estimatedFeeSol: number
  estimatedFeeUsd: number
}

export type TradeAction = 'buy' | 'sell'
export type TradeMode = 'PAPER' | 'REAL'
