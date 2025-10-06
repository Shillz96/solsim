import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { TradeService } from '../../src/services/tradeService';
import { PriceService } from '../../src/services/priceService';
import { PrismaClient } from '@prisma/client';
import { Decimal } from 'decimal.js';
import { 
  InsufficientBalanceError, 
  InvalidTokenError,
  ValidationError 
} from '../../src/middleware/errorHandler';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../src/services/priceService');
jest.mock('../../src/lib/prisma', () => ({
  __esModule: true,
  default: new (require('@prisma/client').PrismaClient)()
}));

// Create a mock NotificationService since it doesn't exist
class MockNotificationService {
  notifyTradeExecution = jest.fn();
  notifyBalanceUpdate = jest.fn();
  notifyPortfolioUpdate = jest.fn();
}

describe('TradeService - Trade Execution Tests', () => {
  let tradeService: TradeService;
  let prismaMock: jest.Mocked<PrismaClient>;
  let priceServiceMock: jest.Mocked<PriceService>;
  let notificationServiceMock: MockNotificationService;
  
  const mockUserId = 'user-123';
  const mockTokenAddress = 'So11111111111111111111111111111111111111112';
  const mockTokenSymbol = 'SOL';
  const mockTokenName = 'Solana';
  
  beforeEach(() => {
    // Setup mocks
    prismaMock = new PrismaClient() as jest.Mocked<PrismaClient>;
    priceServiceMock = new PriceService(prismaMock, {} as any) as jest.Mocked<PriceService>;
    notificationServiceMock = new MockNotificationService();
    
    // Initialize service (mock NotificationService if TradeService expects it)
    tradeService = new TradeService(
      prismaMock,
      notificationServiceMock as any,
      priceServiceMock as any
    );
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Buy Trade Execution', () => {
    it('should execute a valid buy trade successfully', async () => {
      // Arrange
      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 10 // 10 SOL to spend
      };
      
      const mockUser = {
        id: mockUserId,
        virtualSolBalance: new Decimal(100), // 100 SOL balance
        email: 'test@test.com',
        username: 'testuser'
      };
      
      const mockPrice = '5'; // 5 SOL per token
      const totalCost = new Decimal(50); // 10 tokens * 5 SOL
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaMock.holding.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      
      (prismaMock.trade.create as jest.Mock).mockResolvedValue({
        id: 'trade-123',
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        tokenSymbol: mockTokenSymbol,
        tokenName: mockTokenName,
        action: 'buy',
        quantity: new Decimal(10),
        price: new Decimal(5),
        totalCost,
        timestamp: new Date()
      });
      
      (prismaMock.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        virtualSolBalance: new Decimal(50) // 100 - 50
      });
      
      (prismaMock.holding.create as jest.Mock).mockResolvedValue({
        id: 'holding-123',
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        tokenSymbol: mockTokenSymbol,
        tokenName: mockTokenName,
        entryPrice: new Decimal(5),
        quantity: new Decimal(10)
      });
      
      // Act
      const result = await tradeService.executeTradeSerialized(
        tradeRequest,
        mockUserId,
        mockPrice
      );
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.trade).toBeDefined();
      expect(result.trade.action).toBe('buy');
      expect(result.trade.quantity).toBe(10);
      expect(result.trade.price).toBe(5);
      expect(result.trade.totalCost).toBe(50);
      expect(result.newBalance).toBe(50);
      
      // Verify transaction was called
      expect(prismaMock.$transaction).toHaveBeenCalled();
      
      // Verify notification was sent
      expect(notificationServiceMock.notifyTradeExecution).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          action: 'buy',
          tokenAddress: mockTokenAddress
        })
      );
    });
    
    it('should throw InsufficientBalanceError when balance is too low', async () => {
      // Arrange
      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 100 // 100 SOL to spend
      };
      
      const mockUser = {
        id: mockUserId,
        virtualSolBalance: new Decimal(10), // Only 10 SOL
        email: 'test@test.com',
        username: 'testuser'
      };
      
      const mockPrice = '5'; // 5 SOL per token = 500 SOL needed
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      
      // Act & Assert
      await expect(
        tradeService.executeTradeSerialized(tradeRequest, mockUserId, mockPrice)
      ).rejects.toThrow(InsufficientBalanceError);
      
      // Verify no transaction was executed
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
    
    it('should handle existing holdings correctly on buy', async () => {
      // Arrange
      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 10
      };
      
      const mockUser = {
        id: mockUserId,
        virtualSolBalance: new Decimal(100)
      };
      
      const existingHolding = {
        id: 'holding-existing',
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        quantity: new Decimal(5),
        entryPrice: new Decimal(4)
      };
      
      const mockPrice = '5';
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaMock.holding.findUnique as jest.Mock).mockResolvedValue(existingHolding);
      (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      
      (prismaMock.holding.update as jest.Mock).mockResolvedValue({
        ...existingHolding,
        quantity: new Decimal(15), // 5 + 10
        entryPrice: new Decimal(4.67) // Weighted average
      });
      
      // Act
      const result = await tradeService.executeTradeSerialized(
        tradeRequest,
        mockUserId,
        mockPrice
      );
      
      // Assert
      expect(prismaMock.holding.update).toHaveBeenCalledWith({
        where: { userId_tokenAddress: { userId: mockUserId, tokenAddress: mockTokenAddress } },
        data: expect.objectContaining({
          quantity: expect.any(Decimal),
          entryPrice: expect.any(Decimal)
        })
      });
    });
  });
  
  describe('Sell Trade Execution', () => {
    it('should execute a valid sell trade successfully', async () => {
      // Arrange
      const tradeRequest = {
        action: 'sell' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 5
      };
      
      const mockUser = {
        id: mockUserId,
        virtualSolBalance: new Decimal(50)
      };
      
      const mockHolding = {
        id: 'holding-123',
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        quantity: new Decimal(10),
        entryPrice: new Decimal(4)
      };
      
      const mockPrice = '6'; // Selling at profit
      const revenue = new Decimal(30); // 5 * 6
      const realizedPnL = new Decimal(10); // (6-4) * 5
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaMock.holding.findUnique as jest.Mock).mockResolvedValue(mockHolding);
      (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      
      (prismaMock.trade.create as jest.Mock).mockResolvedValue({
        id: 'trade-sell-123',
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        action: 'sell',
        quantity: new Decimal(5),
        price: new Decimal(6),
        totalCost: revenue,
        realizedPnL,
        timestamp: new Date()
      });
      
      (prismaMock.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        virtualSolBalance: new Decimal(80) // 50 + 30
      });
      
      (prismaMock.holding.update as jest.Mock).mockResolvedValue({
        ...mockHolding,
        quantity: new Decimal(5) // 10 - 5
      });
      
      // Act
      const result = await tradeService.executeTradeSerialized(
        tradeRequest,
        mockUserId,
        mockPrice
      );
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.trade.action).toBe('sell');
      expect(result.trade.quantity).toBe(5);
      expect(result.trade.realizedPnL).toBe(10);
      expect(result.newBalance).toBe(80);
    });
    
    it('should throw error when selling more than holdings', async () => {
      // Arrange
      const tradeRequest = {
        action: 'sell' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 20 // Trying to sell 20
      };
      
      const mockHolding = {
        id: 'holding-123',
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        quantity: new Decimal(10) // Only has 10
      };
      
      // Setup mocks
      (prismaMock.holding.findUnique as jest.Mock).mockResolvedValue(mockHolding);
      
      // Act & Assert
      await expect(
        tradeService.executeTradeSerialized(tradeRequest, mockUserId, '5')
      ).rejects.toThrow('Insufficient token balance');
    });
    
    it('should delete holding when selling entire position', async () => {
      // Arrange
      const tradeRequest = {
        action: 'sell' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 10 // Selling all
      };
      
      const mockUser = {
        id: mockUserId,
        virtualSolBalance: new Decimal(50)
      };
      
      const mockHolding = {
        id: 'holding-123',
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        quantity: new Decimal(10),
        entryPrice: new Decimal(4)
      };
      
      const mockPrice = '6';
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaMock.holding.findUnique as jest.Mock).mockResolvedValue(mockHolding);
      (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      
      (prismaMock.holding.delete as jest.Mock).mockResolvedValue(mockHolding);
      
      // Act
      await tradeService.executeTradeSerialized(
        tradeRequest,
        mockUserId,
        mockPrice
      );
      
      // Assert
      expect(prismaMock.holding.delete).toHaveBeenCalledWith({
        where: { userId_tokenAddress: { userId: mockUserId, tokenAddress: mockTokenAddress } }
      });
      expect(prismaMock.holding.update).not.toHaveBeenCalled();
    });
  });
  
  describe('Edge Cases and Error Handling', () => {
    it('should handle zero amount trades', async () => {
      // Arrange
      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 0
      };
      
      // Act & Assert
      await expect(
        tradeService.executeTradeSerialized(tradeRequest, mockUserId, '5')
      ).rejects.toThrow(ValidationError);
    });
    
    it('should handle negative amount trades', async () => {
      // Arrange
      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: mockTokenAddress,
        amountSol: -10
      };
      
      // Act & Assert
      await expect(
        tradeService.executeTradeSerialized(tradeRequest, mockUserId, '5')
      ).rejects.toThrow(ValidationError);
    });
    
    it('should handle invalid token addresses', async () => {
      // Arrange
      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: 'invalid-address',
        amountSol: 10
      };
      
      // Act & Assert
      await expect(
        tradeService.executeTradeSerialized(tradeRequest, mockUserId, '5')
      ).rejects.toThrow(InvalidTokenError);
    });
    
    it('should handle concurrent trades correctly', async () => {
      // This tests race conditions
      const tradeRequest1 = {
        action: 'buy' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 10
      };
      
      const tradeRequest2 = {
        action: 'buy' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 20
      };
      
      const mockUser = {
        id: mockUserId,
        virtualSolBalance: new Decimal(200)
      };
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback) => {
        // Simulate transaction isolation
        return callback(prismaMock);
      });
      
      // Act - Execute trades concurrently
      const [result1, result2] = await Promise.all([
        tradeService.executeTradeSerialized(tradeRequest1, mockUserId, '5'),
        tradeService.executeTradeSerialized(tradeRequest2, mockUserId, '5')
      ]);
      
      // Assert - Both trades should succeed
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    });
    
    it('should rollback transaction on database error', async () => {
      // Arrange
      const tradeRequest = {
        action: 'buy' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 10
      };
      
      const mockUser = {
        id: mockUserId,
        virtualSolBalance: new Decimal(100)
      };
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaMock.$transaction as jest.Mock).mockRejectedValue(
        new Error('Database connection lost')
      );
      
      // Act & Assert
      await expect(
        tradeService.executeTradeSerialized(tradeRequest, mockUserId, '5')
      ).rejects.toThrow('Database connection lost');
      
      // Verify notification was not sent
      expect(notificationServiceMock.notifyTradeExecution).not.toHaveBeenCalled();
    });
  });
  
  describe('P&L Calculations', () => {
    it('should calculate profit correctly', async () => {
      // Arrange
      const sellRequest = {
        action: 'sell' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 5
      };
      
      const mockHolding = {
        quantity: new Decimal(10),
        entryPrice: new Decimal(4) // Bought at 4 SOL
      };
      
      const currentPrice = '8'; // Selling at 8 SOL
      const expectedPnL = new Decimal(20); // (8-4) * 5 = 20 SOL profit
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        virtualSolBalance: new Decimal(50)
      });
      (prismaMock.holding.findUnique as jest.Mock).mockResolvedValue(mockHolding);
      (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      
      (prismaMock.trade.create as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({
          ...data,
          id: 'trade-123',
          timestamp: new Date()
        });
      });
      
      // Act
      const result = await tradeService.executeTradeSerialized(
        sellRequest,
        mockUserId,
        currentPrice
      );
      
      // Assert
      expect(result.trade.realizedPnL).toBe(expectedPnL.toNumber());
    });
    
    it('should calculate loss correctly', async () => {
      // Arrange
      const sellRequest = {
        action: 'sell' as const,
        tokenAddress: mockTokenAddress,
        amountSol: 5
      };
      
      const mockHolding = {
        quantity: new Decimal(10),
        entryPrice: new Decimal(10) // Bought at 10 SOL
      };
      
      const currentPrice = '6'; // Selling at 6 SOL
      const expectedPnL = new Decimal(-20); // (6-10) * 5 = -20 SOL loss
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
        id: mockUserId,
        virtualSolBalance: new Decimal(50)
      });
      (prismaMock.holding.findUnique as jest.Mock).mockResolvedValue(mockHolding);
      (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      
      (prismaMock.trade.create as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({
          ...data,
          id: 'trade-123',
          timestamp: new Date()
        });
      });
      
      // Act
      const result = await tradeService.executeTradeSerialized(
        sellRequest,
        mockUserId,
        currentPrice
      );
      
      // Assert
      expect(result.trade.realizedPnL).toBe(expectedPnL.toNumber());
    });
  });
  
  describe('Balance Updates', () => {
    it('should update balance correctly after buy', async () => {
      // Arrange
      const initialBalance = new Decimal(100);
      const tradeAmount = 10;
      const price = new Decimal(5);
      const expectedBalance = new Decimal(50); // 100 - (10 * 5)
      
      const mockUser = {
        id: mockUserId,
        virtualSolBalance: initialBalance
      };
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      
      (prismaMock.user.update as jest.Mock).mockImplementation(({ data }) => {
        expect(data.virtualSolBalance).toEqual(expectedBalance);
        return Promise.resolve({
          ...mockUser,
          virtualSolBalance: data.virtualSolBalance
        });
      });
      
      // Act
      const result = await tradeService.executeTradeSerialized(
        {
          action: 'buy',
          tokenAddress: mockTokenAddress,
          amountSol: tradeAmount
        },
        mockUserId,
        price.toString()
      );
      
      // Assert
      expect(result.newBalance).toBe(expectedBalance.toNumber());
    });
    
    it('should update balance correctly after sell', async () => {
      // Arrange
      const initialBalance = new Decimal(50);
      const tradeAmount = 5;
      const price = new Decimal(6);
      const expectedBalance = new Decimal(80); // 50 + (5 * 6)
      
      const mockUser = {
        id: mockUserId,
        virtualSolBalance: initialBalance
      };
      
      const mockHolding = {
        quantity: new Decimal(10),
        entryPrice: new Decimal(4)
      };
      
      // Setup mocks
      (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaMock.holding.findUnique as jest.Mock).mockResolvedValue(mockHolding);
      (prismaMock.$transaction as jest.Mock).mockImplementation(async (callback) => {
        return callback(prismaMock);
      });
      
      (prismaMock.user.update as jest.Mock).mockImplementation(({ data }) => {
        expect(data.virtualSolBalance).toEqual(expectedBalance);
        return Promise.resolve({
          ...mockUser,
          virtualSolBalance: data.virtualSolBalance
        });
      });
      
      // Act
      const result = await tradeService.executeTradeSerialized(
        {
          action: 'sell',
          tokenAddress: mockTokenAddress,
          amountSol: tradeAmount
        },
        mockUserId,
        price.toString()
      );
      
      // Assert
      expect(result.newBalance).toBe(expectedBalance.toNumber());
    });
  });
});
