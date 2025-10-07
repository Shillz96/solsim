// Trading API Service
// Handles trade execution, history, and statistics

import apiClient from './api-client'
import { InputSanitizer, ClientRateLimiter } from './security-utils'
import type {
  TradeRequest,
  Trade,
  TradeResult,
  TradeHistory,
  TradeStats
} from './types/api-types'

class TradingService {
  // Execute a trade (buy or sell)
  async executeTrade(tradeRequest: TradeRequest): Promise<TradeResult> {
    // Rate limiting check
    if (!ClientRateLimiter.checkRateLimit('/api/v1/trades/execute', 5, 60000)) {
      throw new Error('Too many trade requests. Please wait before trying again.')
    }

    // Sanitize and validate inputs
    const sanitizedRequest = {
      ...tradeRequest,
      tokenAddress: InputSanitizer.sanitizeTokenAddress(tradeRequest.tokenAddress),
      amountSol: InputSanitizer.sanitizeNumericInput(tradeRequest.amountSol)
    }

    const response = await apiClient.post<{ result: TradeResult }>('/api/v1/trades/execute', sanitizedRequest)
    return response.result
  }

  // Direct buy endpoint
  async buy(tokenAddress: string, amountSol: number): Promise<TradeResult> {
    // Rate limiting check
    if (!ClientRateLimiter.checkRateLimit('/api/v1/trades/buy', 5, 60000)) {
      throw new Error('Too many buy requests. Please wait before trying again.')
    }

    const response = await apiClient.post<{ result: TradeResult }>('/api/v1/trades/buy', {
      tokenAddress: InputSanitizer.sanitizeTokenAddress(tokenAddress),
      amountSol: InputSanitizer.sanitizeNumericInput(amountSol)
    })
    return response.result
  }

  // Direct sell endpoint
  async sell(tokenAddress: string, amountSol: number): Promise<TradeResult> {
    // Rate limiting check
    if (!ClientRateLimiter.checkRateLimit('/api/v1/trades/sell', 5, 60000)) {
      throw new Error('Too many sell requests. Please wait before trying again.')
    }

    const response = await apiClient.post<{ result: TradeResult }>('/api/v1/trades/sell', {
      tokenAddress: InputSanitizer.sanitizeTokenAddress(tokenAddress),
      amountSol: InputSanitizer.sanitizeNumericInput(amountSol)
    })
    return response.result
  }

  // Get trade history for current user
  async getTradeHistory(params?: {
    tokenAddress?: string
    limit?: number
    offset?: number
  }): Promise<TradeHistory> {
    const queryParams = new URLSearchParams()
    
    if (params?.tokenAddress) {
      queryParams.append('tokenAddress', params.tokenAddress)
    }
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString())
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString())
    }

    const query = queryParams.toString()
    // Backend returns { success: true, data: { trades: [...], pagination: {...} } }
    const response = await apiClient.get<{ trades: any[]; pagination: any }>(`/api/v1/trades/history${query ? `?${query}` : ''}`)
    return {
      trades: response.trades,
      pagination: response.pagination
    }
  }

  // Get trade history for specific user (public)
  async getUserTradeHistory(userId: string, params?: {
    limit?: number
    offset?: number
  }): Promise<TradeHistory> {
    const queryParams = new URLSearchParams()
    
    if (params?.limit) {
      queryParams.append('limit', params.limit.toString())
    }
    if (params?.offset) {
      queryParams.append('offset', params.offset.toString())
    }

    const query = queryParams.toString()
    const response = await apiClient.get<{ trades: any[]; pagination: any }>(`/api/v1/trades/history/${userId}${query ? `?${query}` : ''}`)
    return {
      trades: response.trades,
      pagination: response.pagination
    }
  }

  // Get trade statistics
  async getTradeStats(): Promise<TradeStats> {
    const response = await apiClient.get<{ stats: TradeStats }>('/api/v1/trades/stats')
    return response.stats
  }

  // Get recent trades across all users (public feed)
  async getRecentTrades(limit: number = 20): Promise<Trade[]> {
    const response = await apiClient.get<{ trades: Trade[] }>(`/api/v1/trades/recent?limit=${limit}`)
    return response.trades
  }

  // Legacy executeTrade alias for backward compatibility
  async executeBuyTrade(tokenAddress: string, amountSol: number): Promise<TradeResult> {
    return this.executeTrade({
      action: 'buy',
      tokenAddress,
      amountSol
    })
  }

  async executeSellTrade(tokenAddress: string, amountSol: number): Promise<TradeResult> {
    return this.executeTrade({
      action: 'sell',
      tokenAddress,
      amountSol
    })
  }
}

// Export singleton instance
const tradingService = new TradingService()
export default tradingService