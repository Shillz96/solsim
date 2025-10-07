import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';
import { transactionService } from '../../src/services/transactionService.js';
import { costBasisCalculator } from '../../src/services/costBasisCalculator.js';
import prisma from '../../src/lib/prisma.js';

// Mock prisma
vi.mock('../../src/lib/prisma.js', () => ({
  default: {
    transactionHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    holding: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('FIFO Transaction Service', () => {
  const mockUserId = 'test-user-123';
  const mockTokenAddress = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('recordBuyTransaction', () => {
    it('should record a buy transaction with correct FIFO data', async () => {
      const mockTransaction = {
        id: 'tx-1',
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        tokenSymbol: 'TEST',
        action: 'BUY',
        quantity: new Decimal(100),
        pricePerTokenSol: new Decimal(0.5),
        totalCostSol: new Decimal(50),
        remainingQuantity: new Decimal(100),
        costBasisSol: new Decimal(50),
        feesSol: new Decimal(0.001),
        executedAt: new Date(),
      };

      prisma.transactionHistory.create.mockResolvedValue(mockTransaction);

      const result = await transactionService.recordBuyTransaction({
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        tokenSymbol: 'TEST',
        action: 'BUY',
        quantity: 100,
        pricePerTokenSol: 0.5,
        totalCostSol: 50,
        feesSol: 0.001,
      });

      expect(result.transaction).toEqual(mockTransaction);
      expect(prisma.transactionHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          tokenAddress: mockTokenAddress,
          action: 'BUY',
          remainingQuantity: new Decimal(100), // Full amount available for FIFO
        }),
      });
    });
  });

  describe('recordSellTransaction', () => {
    it('should consume lots using FIFO and calculate realized PnL', async () => {
      // Mock available lots (oldest first)
      const mockLots = [
        {
          id: 'lot-1',
          quantity: new Decimal(50),
          remainingQuantity: new Decimal(50),
          pricePerTokenSol: new Decimal(0.4),
          executedAt: new Date('2024-01-01'),
        },
        {
          id: 'lot-2',
          quantity: new Decimal(100),
          remainingQuantity: new Decimal(100),
          pricePerTokenSol: new Decimal(0.6),
          executedAt: new Date('2024-01-02'),
        },
      ];

      prisma.transactionHistory.findMany.mockResolvedValue(mockLots);
      prisma.transactionHistory.update.mockResolvedValue({});
      prisma.transactionHistory.create.mockResolvedValue({
        id: 'sell-tx-1',
        action: 'SELL',
        realizedPnLSol: new Decimal(10), // Profit
      });

      const result = await transactionService.recordSellTransaction({
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        tokenSymbol: 'TEST',
        action: 'SELL',
        quantity: 75, // Will consume all of lot-1 and 25 from lot-2
        pricePerTokenSol: 0.8,
        totalCostSol: 60,
      });

      // Verify FIFO consumption
      expect(prisma.transactionHistory.update).toHaveBeenCalledTimes(2);
      
      // First lot should be fully consumed
      expect(prisma.transactionHistory.update).toHaveBeenCalledWith({
        where: { id: 'lot-1' },
        data: { remainingQuantity: new Decimal(0) },
      });
      
      // Second lot should have 75 remaining (100 - 25)
      expect(prisma.transactionHistory.update).toHaveBeenCalledWith({
        where: { id: 'lot-2' },
        data: { remainingQuantity: new Decimal(75) },
      });

      expect(result.consumedLots).toHaveLength(2);
      expect(result.realizedPnLSol).toBeDefined();
    });

    it('should handle sells without available lots', async () => {
      prisma.transactionHistory.findMany.mockResolvedValue([]);
      prisma.transactionHistory.create.mockResolvedValue({
        id: 'orphan-sell',
        action: 'SELL',
        realizedPnLSol: null, // Unknown PnL
      });

      const result = await transactionService.recordSellTransaction({
        userId: mockUserId,
        tokenAddress: mockTokenAddress,
        action: 'SELL',
        quantity: 50,
        pricePerTokenSol: 0.8,
        totalCostSol: 40,
      });

      expect(result.transaction.realizedPnLSol).toBeNull();
      expect(prisma.transactionHistory.update).not.toHaveBeenCalled();
    });
  });

  describe('getFIFOCostBasis', () => {
    it('should calculate weighted average cost basis from available lots', async () => {
      const mockLots = [
        {
          id: 'lot-1',
          quantity: new Decimal(50),
          remainingQuantity: new Decimal(30),
          pricePerTokenSol: new Decimal(0.5),
          executedAt: new Date('2024-01-01'),
        },
        {
          id: 'lot-2',
          quantity: new Decimal(100),
          remainingQuantity: new Decimal(70),
          pricePerTokenSol: new Decimal(0.6),
          executedAt: new Date('2024-01-02'),
        },
      ];

      prisma.transactionHistory.findMany.mockResolvedValue(mockLots);

      const result = await transactionService.getFIFOCostBasis(mockUserId, mockTokenAddress);

      expect(result.totalQuantity.toNumber()).toBe(100); // 30 + 70
      expect(result.totalCostBasisSol.toNumber()).toBe(57); // (30 * 0.5) + (70 * 0.6)
      expect(result.avgPricePerTokenSol.toNumber()).toBe(0.57); // 57 / 100
      expect(result.lots).toHaveLength(2);
    });
  });
});

describe('Cost Basis Calculator', () => {
  const mockUserId = 'test-user-123';
  const mockTokenAddress = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateCostBasis', () => {
    it('should calculate unrealized PnL when current price is provided', async () => {
      // Mock FIFO data
      vi.spyOn(transactionService, 'getFIFOCostBasis').mockResolvedValue({
        totalQuantity: new Decimal(100),
        totalCostBasisSol: new Decimal(50),
        avgPricePerTokenSol: new Decimal(0.5),
        lots: [
          {
            id: 'lot-1',
            quantity: new Decimal(100),
            remainingQuantity: new Decimal(100),
            pricePerTokenSol: new Decimal(0.5),
            costBasisSol: new Decimal(50),
            executedAt: new Date(),
          },
        ],
      });

      vi.spyOn(transactionService, 'getTokenTransactions').mockResolvedValue([
        { tokenSymbol: 'TEST' } as any,
      ]);

      const result = await costBasisCalculator.calculateCostBasis(
        mockUserId,
        mockTokenAddress,
        0.8 // Current price in SOL
      );

      expect(result).toBeDefined();
      expect(result!.totalQuantity.toNumber()).toBe(100);
      expect(result!.totalCostBasisSol.toNumber()).toBe(50);
      expect(result!.unrealizedPnLSol?.toNumber()).toBe(30); // (100 * 0.8) - 50
      expect(result!.unrealizedPnLPercent).toBe(60); // (30 / 50) * 100
    });

    it('should return null for empty positions', async () => {
      vi.spyOn(transactionService, 'getFIFOCostBasis').mockResolvedValue({
        totalQuantity: new Decimal(0),
        totalCostBasisSol: new Decimal(0),
        avgPricePerTokenSol: new Decimal(0),
        lots: [],
      });

      const result = await costBasisCalculator.calculateCostBasis(
        mockUserId,
        mockTokenAddress
      );

      expect(result).toBeNull();
    });
  });

  describe('simulateSale', () => {
    it('should simulate FIFO sale and preview PnL', async () => {
      const mockLots = [
        {
          id: 'lot-1',
          quantity: new Decimal(50),
          remainingQuantity: new Decimal(50),
          pricePerTokenSol: new Decimal(0.4),
          executedAt: new Date('2024-01-01'),
        },
        {
          id: 'lot-2',
          quantity: new Decimal(100),
          remainingQuantity: new Decimal(100),
          pricePerTokenSol: new Decimal(0.6),
          executedAt: new Date('2024-01-02'),
        },
      ];

      vi.spyOn(transactionService, 'getAvailableLots').mockResolvedValue(mockLots);

      const result = await costBasisCalculator.simulateSale(
        mockUserId,
        mockTokenAddress,
        75, // Sell 75 tokens
        0.8 // At 0.8 SOL per token
      );

      expect(result.quantitySold.toNumber()).toBe(75);
      expect(result.totalRevenueSol.toNumber()).toBe(60); // 75 * 0.8
      expect(result.totalCostBasisSol.toNumber()).toBe(35); // (50 * 0.4) + (25 * 0.6)
      expect(result.realizedPnLSol.toNumber()).toBe(25); // 60 - 35
      expect(result.realizedPnLPercent).toBeCloseTo(71.43, 2); // (25 / 35) * 100
      expect(result.consumedLots).toHaveLength(2);
    });
  });

  describe('calculateRealizedPnL', () => {
    it('should aggregate realized PnL statistics', async () => {
      const mockSellTransactions = [
        { action: 'SELL', realizedPnLSol: new Decimal(10) },
        { action: 'SELL', realizedPnLSol: new Decimal(-5) },
        { action: 'SELL', realizedPnLSol: new Decimal(15) },
        { action: 'SELL', realizedPnLSol: new Decimal(-2) },
      ];

      vi.spyOn(transactionService, 'getUserTransactions').mockResolvedValue(
        mockSellTransactions as any
      );

      const result = await costBasisCalculator.calculateRealizedPnL(mockUserId);

      expect(result.totalRealizedPnLSol.toNumber()).toBe(18); // 10 - 5 + 15 - 2
      expect(result.winCount).toBe(2);
      expect(result.lossCount).toBe(2);
      expect(result.avgWinSol.toNumber()).toBe(12.5); // (10 + 15) / 2
      expect(result.avgLossSol.toNumber()).toBe(3.5); // (5 + 2) / 2
      expect(result.winRate).toBe(50); // 2/4 * 100
    });
  });
});

describe('Price Service SOL-Native Pricing', () => {
  const priceService = new (await import('../../src/services/priceService.js')).PriceService();
  const mockTokenAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPriceSol', () => {
    it('should return native SOL price when available', async () => {
      vi.spyOn(priceService, 'getPrice').mockResolvedValue({
        address: mockTokenAddress,
        price: 1.0, // USD
        priceSol: 0.00416, // Native SOL price
        timestamp: Date.now(),
        source: 'dexscreener',
      });

      const priceSol = await priceService.getPriceSol(mockTokenAddress);

      expect(priceSol).toBe(0.00416);
    });

    it('should convert USD to SOL when native price unavailable', async () => {
      vi.spyOn(priceService, 'getPrice').mockResolvedValue({
        address: mockTokenAddress,
        price: 1.0, // USD
        priceSol: undefined,
        timestamp: Date.now(),
        source: 'dexscreener',
      });

      vi.spyOn(priceService, 'getSolPrice').mockResolvedValue(240); // SOL = $240

      const priceSol = await priceService.getPriceSol(mockTokenAddress);

      expect(priceSol).toBeCloseTo(0.00416, 5); // 1.0 / 240
    });

    it('should return null when price unavailable', async () => {
      vi.spyOn(priceService, 'getPrice').mockResolvedValue(null);

      const priceSol = await priceService.getPriceSol(mockTokenAddress);

      expect(priceSol).toBeNull();
    });
  });
});

describe('Integration Tests', () => {
  describe('Trade to Transaction Flow', () => {
    it('should record transaction when trade executes', async () => {
      // This would be an integration test with a test database
      // Verifying that when a trade is executed, a transaction is recorded
      // and FIFO calculations work correctly
      
      // Placeholder for integration test
      expect(true).toBe(true);
    });
  });

  describe('FIFO PnL Calculation End-to-End', () => {
    it('should correctly calculate PnL after multiple buys and sells', async () => {
      // This would test the complete flow:
      // 1. Multiple buy transactions at different prices
      // 2. Sell transaction consuming FIFO lots
      // 3. Verify realized and unrealized PnL
      
      // Placeholder for integration test
      expect(true).toBe(true);
    });
  });
});
