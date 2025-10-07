// Portfolio API Service
// Handles portfolio data, holdings, and performance metrics

import apiClient from './api-client'

export interface PortfolioPosition {
  tokenAddress: string
  tokenSymbol: string | null
  tokenName: string | null
  tokenImageUrl: string | null
  quantity: string
  entryPrice: string
  avgBuyMarketCap: string | null
  currentPrice: number
  pnl: {
    sol: {
      absolute: string
      percent: number
    }
    usd: {
      absolute: string
      percent: number
    }
  }
}

export interface PortfolioSummary {
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
  positionCount: number
  solBalance: string
  positions: PortfolioPosition[]
}

export interface PerformanceData {
  period: string
  performance: {
    totalInvested: number
    currentValue: number
    totalReturn: number
    totalReturnPercentage: number
    realizedPnL: number
    unrealizedPnL: number
    winRate: number
    totalTrades: number
    profitableTrades: number
  }
  tradeHistory: any[]
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
  createdAt: string
  updatedAt: string
}

class PortfolioService {
  // Get complete portfolio summary
  async getPortfolio(): Promise<PortfolioSummary> {
    const response = await apiClient.get<{ portfolio: PortfolioSummary }>('/api/v1/portfolio')
    return response.portfolio
  }

  // Get user's SOL balance
  async getBalance(): Promise<{ balance: string; currency: string; timestamp: number }> {
    // Balance endpoint returns data directly (not nested in portfolio)
    return apiClient.get<{ balance: string; currency: string; timestamp: number }>('/api/v1/portfolio/balance')
  }

  // Get detailed holdings
  async getHoldings(params?: {
    includeZero?: boolean
    sortBy?: 'value' | 'quantity' | 'symbol'
    sortOrder?: 'asc' | 'desc'
  }): Promise<Holding[]> {
    const queryParams = new URLSearchParams()
    
    if (params?.includeZero !== undefined) {
      queryParams.append('includeZero', params.includeZero.toString())
    }
    if (params?.sortBy) {
      queryParams.append('sortBy', params.sortBy)
    }
    if (params?.sortOrder) {
      queryParams.append('sortOrder', params.sortOrder)
    }

    const query = queryParams.toString()
    const response = await apiClient.get<{ holdings: Holding[] }>(`/api/v1/portfolio/holdings${query ? `?${query}` : ''}`)
    return response.holdings
  }

  // Get portfolio performance over time
  async getPerformance(period: '24h' | '7d' | '30d' | '90d' | '1y' | 'all' = '30d'): Promise<PerformanceData> {
    // Performance endpoint returns data directly (not nested)
    return apiClient.get<PerformanceData>(`/api/v1/portfolio/performance?period=${period}`)
  }

  // Get portfolio value history for charts
  async getPortfolioHistory(days: number = 30): Promise<Array<{ date: string; value: string }>> {
    return apiClient.get<Array<{ date: string; value: string }>>(`/api/v1/portfolio/history?days=${days}`)
  }
}

// Export singleton instance
const portfolioService = new PortfolioService()
export default portfolioService