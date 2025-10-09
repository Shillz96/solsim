// Test suite for Trading Service
import apiClient from '@/lib/api'
import { ClientRateLimiter } from '@/lib/security-utils'

// Mock dependencies
jest.mock('@/lib/api')
jest.mock('@/lib/security-utils')

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>
const mockRateLimiter = ClientRateLimiter as jest.Mocked<typeof ClientRateLimiter>

describe('TradingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimiter.checkRateLimit.mockReturnValue(true)
  })

  describe('executeTrade', () => {
    it('should execute a valid trade request', async () => {
      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: '11111111111111111111111111111111111111111',
        amountSol: 1.5
      }
      
      const expectedResult = {
        success: true,
        transactionId: 'tx123',
        trade: { id: '1', ...tradeRequest }
      }

      mockApiClient.post.mockResolvedValueOnce(expectedResult)

      const result = await tradingService.executeTrade(tradeRequest)

      expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith('/api/v1/trades/execute', 5, 60000)
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/trades/execute', tradeRequest)
      expect(result).toEqual(expectedResult)
    })

    it('should reject requests when rate limited', async () => {
      mockRateLimiter.checkRateLimit.mockReturnValueOnce(false)

      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: '11111111111111111111111111111111111111111',
        amountSol: 1.5
      }

      await expect(tradingService.executeTrade(tradeRequest)).rejects.toThrow(
        'Too many trade requests. Please wait before trying again.'
      )
      
      expect(mockApiClient.post).not.toHaveBeenCalled()
    })

    it('should validate and sanitize token address', async () => {
      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: 'invalid-address',
        amountSol: 1.5
      }

      await expect(tradingService.executeTrade(tradeRequest)).rejects.toThrow('Invalid token address format')
    })

    it('should validate numeric input', async () => {
      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: '11111111111111111111111111111111111111111',
        amountSol: NaN
      }

      await expect(tradingService.executeTrade(tradeRequest)).rejects.toThrow('Invalid numeric input')
    })
  })

  describe('buy', () => {
    it('should execute a buy order correctly', async () => {
      const tokenAddress = '11111111111111111111111111111111111111111'
      const amountSol = 2.5
      const expectedResult = { success: true, transactionId: 'tx456' }

      mockApiClient.post.mockResolvedValueOnce(expectedResult)

      const result = await tradingService.buy(tokenAddress, amountSol)

      expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith('/api/v1/trades/buy', 5, 60000)
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/trades/buy', {
        tokenAddress,
        amountSol
      })
      expect(result).toEqual(expectedResult)
    })

    it('should reject buy requests when rate limited', async () => {
      mockRateLimiter.checkRateLimit.mockReturnValueOnce(false)

      await expect(tradingService.buy('11111111111111111111111111111111111111111', 1.0)).rejects.toThrow(
        'Too many buy requests. Please wait before trying again.'
      )
    })
  })

  describe('sell', () => {
    it('should execute a sell order correctly', async () => {
      const tokenAddress = '11111111111111111111111111111111111111111'
      const amountSol = 1.0
      const expectedResult = { success: true, transactionId: 'tx789' }

      mockApiClient.post.mockResolvedValueOnce(expectedResult)

      const result = await tradingService.sell(tokenAddress, amountSol)

      expect(mockRateLimiter.checkRateLimit).toHaveBeenCalledWith('/api/v1/trades/sell', 5, 60000)
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/v1/trades/sell', {
        tokenAddress,
        amountSol
      })
      expect(result).toEqual(expectedResult)
    })

    it('should reject sell requests when rate limited', async () => {
      mockRateLimiter.checkRateLimit.mockReturnValueOnce(false)

      await expect(tradingService.sell('11111111111111111111111111111111111111111', 1.0)).rejects.toThrow(
        'Too many sell requests. Please wait before trying again.'
      )
    })
  })

  describe('getTradeHistory', () => {
    it('should fetch trade history with default parameters', async () => {
      const expectedHistory = {
        trades: [
          { id: '1', action: 'buy', tokenAddress: '11111111111111111111111111111111111111111', amountSol: 1.0 }
        ],
        total: 1,
        hasMore: false
      }

      mockApiClient.get.mockResolvedValueOnce(expectedHistory)

      const result = await tradingService.getTradeHistory()

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/trades/history')
      expect(result).toEqual(expectedHistory)
    })

    it('should fetch trade history with parameters', async () => {
      const params = {
        tokenAddress: '11111111111111111111111111111111111111111',
        limit: 20,
        offset: 10
      }

      mockApiClient.get.mockResolvedValueOnce({ trades: [], total: 0, hasMore: false })

      await tradingService.getTradeHistory(params)

      expect(mockApiClient.get).toHaveBeenCalledWith(
        '/api/v1/trades/history?tokenAddress=11111111111111111111111111111111111111111&limit=20&offset=10'
      )
    })
  })

  describe('getTradeStats', () => {
    it('should fetch trade statistics', async () => {
      const expectedStats = {
        totalTrades: 10,
        totalVolume: 100.5,
        winRate: 0.7,
        totalPnL: 50.25
      }

      const response = { stats: expectedStats }
      mockApiClient.get.mockResolvedValueOnce(response)

      const result = await tradingService.getTradeStats()

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/trades/stats')
      expect(result).toEqual(expectedStats)
    })
  })

  describe('getRecentTrades', () => {
    it('should fetch recent trades with default limit', async () => {
      const expectedTrades = [
        { id: '1', action: 'buy', tokenAddress: '11111111111111111111111111111111111111111' },
        { id: '2', action: 'sell', tokenAddress: '22222222222222222222222222222222222222222' }
      ]

      const response = { trades: expectedTrades }
      mockApiClient.get.mockResolvedValueOnce(response)

      const result = await tradingService.getRecentTrades()

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/trades/recent?limit=20')
      expect(result).toEqual(expectedTrades)
    })

    it('should fetch recent trades with custom limit', async () => {
      const expectedTrades: any[] = []
      const response = { trades: expectedTrades }
      mockApiClient.get.mockResolvedValueOnce(response)

      const result = await tradingService.getRecentTrades(5)

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/v1/trades/recent?limit=5')
      expect(result).toEqual(expectedTrades)
    })
  })
})