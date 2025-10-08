// Market Data API Service
// Handles token prices, market data, and trending tokens

import apiClient from './api-client'
import { InputSanitizer } from './security-utils'
import { errorLogger } from './error-logger'
import type { 
  TokenPrice, 
  TrendingToken, 
  TokenDetails,
  TokenSearchResult,
  MarketStats,
  SearchTokensParams,
  BatchPricesRequest,
  TokenCategory
} from './types/api-types'

class MarketService {
  private tokenDetailsCache = new Map<string, { data: TokenDetails; timestamp: number }>()
  private readonly CACHE_DURATION = 30000 // 30 seconds cache

  // Get current SOL price
  async getSolPrice(): Promise<{ price: number; priceChange24h: number }> {
    const response = await apiClient.get<{ price: number; currency: string; source: string; timestamp: number }>('/api/v1/market/sol-price')
    // Backend doesn't provide priceChange24h yet, return 0 as default
    return {
      price: response.price,
      priceChange24h: 0
    }
  }

  // Get token price by address
  async getTokenPrice(tokenAddress: string): Promise<TokenPrice> {
    return apiClient.get<TokenPrice>(`/api/v1/market/price/${tokenAddress}`)
  }

  // Get multiple token prices (batch request)
  async getTokenPrices(tokenAddresses: string[]): Promise<TokenPrice[]> {
    return apiClient.post<TokenPrice[]>('/api/v1/market/prices', {
      tokenAddresses
    } as BatchPricesRequest)
  }

  // Get trending tokens with optional category filter
  async getTrendingTokens(
    limit: number = 20, 
    category?: TokenCategory
  ): Promise<TrendingToken[]> {
    const params = new URLSearchParams({ limit: limit.toString() })
    if (category) params.append('category', category)
    
    try {
      // Use enhanced Solana Tracker API for better diversity
      // Fetching trending tokens from enhanced Solana Tracker API
      const response = await apiClient.get<{ tokens: TrendingToken[] }>(`/api/v1/solana-tracker/trending?${params.toString()}`)
      
      if (response.tokens && Array.isArray(response.tokens)) {
        // Successfully fetched trending tokens
        return response.tokens
      }
      
      errorLogger.generalError('Market API returned invalid data', new Error('Invalid trending tokens response'), { endpoint: 'trending' })
      return []
      
    } catch (error) {
      errorLogger.apiError('trending', error instanceof Error ? error : new Error(String(error)), {
        metadata: { service: 'market' }
      })
      return []
    }
  }

  // Search for tokens
  async searchTokens(query: string, limit: number = 10): Promise<TokenSearchResult[]> {
    const sanitizedQuery = InputSanitizer.sanitizeSearchQuery(query)
    const queryParams = new URLSearchParams({
      q: sanitizedQuery,
      limit: limit.toString()
    })
    
    const response = await apiClient.get<{ tokens: TokenSearchResult[] }>(`/api/v1/market/search?${queryParams.toString()}`)
    return response.tokens || []
  }

  // Get comprehensive market statistics
  async getMarketStats(): Promise<MarketStats> {
    // Backend returns partial stats, need to construct full MarketStats
    const response = await apiClient.get<{
      totalTrades: number;
      totalVolume: string;
      totalVolumeUsd: string;
      solPrice: string;
      timestamp: number;
    }>('/api/v1/market/stats')
    
    // Convert to expected MarketStats format
    return {
      solPrice: parseFloat(response.solPrice),
      solPriceChange24h: 0, // Not provided by backend yet
      totalMarketCap: 0, // Not provided by backend yet
      totalVolume24h: parseFloat(response.totalVolumeUsd),
      activeTokens: 0, // Not provided by backend yet
      topGainer: {} as TokenPrice, // Not provided by backend yet
      topLoser: {} as TokenPrice, // Not provided by backend yet
    }
  }

  // Get detailed token information
  async getTokenDetails(tokenAddress: string): Promise<TokenDetails> {
    // Check cache first
    const cached = this.tokenDetailsCache.get(tokenAddress)
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      const data = await apiClient.get<TokenDetails>(`/api/v1/market/token/${tokenAddress}`)
      
      // Cache the response
      this.tokenDetailsCache.set(tokenAddress, {
        data,
        timestamp: Date.now()
      })
      
      return data
    } catch (error) {
      // If we have cached data and the API fails, return cached data
      if (cached) {
        return cached.data
      }
      throw error
    }
  }

  // Get token by ID (alternative endpoint)
  async getTokenById(tokenId: string): Promise<TokenDetails> {
    return apiClient.get<TokenDetails>(`/api/v1/market/tokens/${tokenId}`)
  }

  // Get major cryptocurrency prices
  async getMajorCryptoPrices(): Promise<TokenPrice[]> {
    // Backend returns array directly (not wrapped in data)
    const prices = await apiClient.get<Array<{
      symbol: string;
      name: string;
      price: number;
      change24h: number;
      timestamp: number;
    }>>('/api/v1/market/major-crypto-prices')
    
    // Convert to TokenPrice format
    return prices.map(p => ({
      tokenAddress: p.symbol, // Use symbol as address for major cryptos
      tokenSymbol: p.symbol,
      tokenName: p.name,
      price: p.price,
      priceChange24h: p.change24h,
      priceChangePercent24h: p.change24h,
      volume24h: 0,
      marketCap: 0,
      imageUrl: null,
      lastUpdated: new Date(p.timestamp).toISOString()
    }))
  }

  // Test Pump.fun integration
  async testPumpfun(): Promise<any> {
    return apiClient.get('/api/v1/market/test-pumpfun')
  }

  // Get market overview (legacy method for backward compatibility)
  async getMarketOverview(): Promise<{
    solPrice: number
    totalMarketCap: number
    totalVolume24h: number
    trendingTokens: TrendingToken[]
  }> {
    const [solPrice, stats, trending] = await Promise.all([
      this.getSolPrice(),
      this.getMarketStats(),
      this.getTrendingTokens(10)
    ])

    return {
      solPrice: solPrice.price,
      totalMarketCap: stats.totalMarketCap,
      totalVolume24h: stats.totalVolume24h,
      trendingTokens: trending
    }
  }
}

// Export singleton instance
const marketService = new MarketService()
export default marketService