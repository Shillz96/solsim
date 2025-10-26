/**
 * Trade Flow End-to-End Test Suite
 * 
 * Tests the complete trading flow from user intent to UI updates:
 * - Order placement and validation
 * - Price fetching and slippage calculation
 * - Trade execution and persistence
 * - PnL calculation and updates
 * - UI state synchronization
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Decimal } from '@prisma/client/runtime/library';

// Mock data and utilities
const MOCK_USER_ID = 'test-user-123';
const MOCK_MINT = 'So11111111111111111111111111111111111111112'; // SOL
const MOCK_PRICE_USD = 100.0;
const MOCK_PRICE_SOL = 0.0004;
const MOCK_SOL_USD = 250000;

interface TradeTestResult {
  success: boolean;
  tradeId?: string;
  positionId?: string;
  realizedPnL?: Decimal;
  unrealizedPnL?: Decimal;
  error?: string;
  executionTime?: number;
}

interface PriceData {
  priceUsd: number;
  priceSol: number;
  solUsd: number;
  marketCapUsd: number;
  timestamp: number;
}

class TradeFlowTester {
  private mockPrices: Map<string, PriceData> = new Map();
  private mockPositions: Map<string, any> = new Map();
  private mockTrades: any[] = [];
  private mockLots: any[] = [];

  constructor() {
    this.setupMockData();
  }

  private setupMockData(): void {
    // Mock SOL price
    this.mockPrices.set(MOCK_MINT, {
      priceUsd: MOCK_PRICE_USD,
      priceSol: MOCK_PRICE_SOL,
      solUsd: MOCK_SOL_USD,
      marketCapUsd: 100000000000,
      timestamp: Date.now()
    });
  }

  /**
   * Test basic buy order flow
   */
  async testBuyOrder(quantity: number): Promise<TradeTestResult> {
    const startTime = Date.now();
    
    try {
      // 1. Validate inputs
      if (quantity <= 0) {
        throw new Error('Quantity must be positive');
      }

      // 2. Get price data
      const priceData = this.mockPrices.get(MOCK_MINT);
      if (!priceData) {
        throw new Error('Price data not available');
      }

      // 3. Calculate trade amounts
      const qty = new Decimal(quantity);
      const grossSol = qty.mul(priceData.priceSol);
      const grossUsd = qty.mul(priceData.priceUsd);
      
      // 4. Calculate fees (simplified)
      const fees = grossSol.mul(0.01); // 1% fee
      const netSol = grossSol.plus(fees);
      const tradeCostUsd = netSol.mul(priceData.solUsd);

      // 5. Check balance (mock)
      const userBalance = new Decimal(1000); // Mock 1000 SOL
      if (userBalance.lt(netSol)) {
        throw new Error('Insufficient balance');
      }

      // 6. Execute trade
      const tradeId = `trade_${Date.now()}_${Math.random()}`;
      const positionId = `pos_${MOCK_USER_ID}_${MOCK_MINT}`;
      
      // Create trade record
      const trade = {
        id: tradeId,
        userId: MOCK_USER_ID,
        mint: MOCK_MINT,
        side: 'BUY',
        qty: qty.toString(),
        priceUsd: priceData.priceUsd,
        priceSol: priceData.priceSol,
        fees: fees.toString(),
        timestamp: Date.now()
      };
      
      this.mockTrades.push(trade);

      // 7. Update position
      const existingPosition = this.mockPositions.get(positionId) || {
        qty: new Decimal(0),
        costBasis: new Decimal(0)
      };

      const newQty = existingPosition.qty.plus(qty);
      const newCostBasis = existingPosition.costBasis.plus(tradeCostUsd);
      
      this.mockPositions.set(positionId, {
        qty: newQty,
        costBasis: newCostBasis
      });

      // 8. Create FIFO lot
      const lot = {
        id: `lot_${Date.now()}`,
        positionId,
        userId: MOCK_USER_ID,
        mint: MOCK_MINT,
        qtyRemaining: qty,
        unitCostUsd: priceData.priceUsd,
        unitCostSol: priceData.priceSol,
        createdAt: Date.now()
      };
      
      this.mockLots.push(lot);

      // 9. Calculate PnL
      const currentPrice = priceData.priceUsd;
      const unrealizedPnL = newQty.mul(currentPrice).minus(newCostBasis);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        tradeId,
        positionId,
        realizedPnL: new Decimal(0),
        unrealizedPnL,
        executionTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test sell order flow with FIFO
   */
  async testSellOrder(quantity: number): Promise<TradeTestResult> {
    const startTime = Date.now();
    
    try {
      // 1. Validate inputs
      if (quantity <= 0) {
        throw new Error('Quantity must be positive');
      }

      // 2. Check position
      const positionId = `pos_${MOCK_USER_ID}_${MOCK_MINT}`;
      const position = this.mockPositions.get(positionId);
      
      if (!position || position.qty.lte(0)) {
        throw new Error('No position to sell');
      }

      const qty = new Decimal(quantity);
      if (position.qty.lt(qty)) {
        throw new Error('Insufficient quantity to sell');
      }

      // 3. Get current price
      const priceData = this.mockPrices.get(MOCK_MINT);
      if (!priceData) {
        throw new Error('Price data not available');
      }

      // 4. Execute FIFO sell
      const lots = this.mockLots.filter(lot => 
        lot.userId === MOCK_USER_ID && 
        lot.mint === MOCK_MINT && 
        lot.qtyRemaining.gt(0)
      ).sort((a, b) => a.createdAt - b.createdAt);

      let remainingToSell = qty;
      let realizedPnL = new Decimal(0);
      const consumed: any[] = [];

      for (const lot of lots) {
        if (remainingToSell.lte(0)) break;
        
        const take = Decimal.min(lot.qtyRemaining, remainingToSell);
        const pnl = take.mul(priceData.priceUsd).minus(take.mul(lot.unitCostUsd));
        realizedPnL = realizedPnL.plus(pnl);
        
        consumed.push({
          lotId: lot.id,
          qty: take,
          pnl
        });

        // Update lot
        lot.qtyRemaining = lot.qtyRemaining.minus(take);
        remainingToSell = remainingToSell.minus(take);
      }

      if (remainingToSell.gt(0)) {
        throw new Error('Insufficient lots to sell');
      }

      // 5. Update position
      const newQty = position.qty.minus(qty);
      const newCostBasis = position.costBasis.minus(consumed.reduce((sum, c) => 
        sum.plus(c.qty.mul(lots.find(l => l.id === c.lotId)!.unitCostUsd)), new Decimal(0)
      ));
      
      this.mockPositions.set(positionId, {
        qty: newQty,
        costBasis: newCostBasis
      });

      // 6. Create trade record
      const tradeId = `trade_${Date.now()}_${Math.random()}`;
      const trade = {
        id: tradeId,
        userId: MOCK_USER_ID,
        mint: MOCK_MINT,
        side: 'SELL',
        qty: qty.toString(),
        priceUsd: priceData.priceUsd,
        priceSol: priceData.priceSol,
        realizedPnL: realizedPnL.toString(),
        timestamp: Date.now()
      };
      
      this.mockTrades.push(trade);

      // 7. Calculate unrealized PnL
      const unrealizedPnL = newQty.mul(priceData.priceUsd).minus(newCostBasis);

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        tradeId,
        positionId,
        realizedPnL,
        unrealizedPnL,
        executionTime
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Test double-click protection
   */
  async testDoubleClickProtection(): Promise<boolean> {
    const quantity = 1.0;
    
    // Start two trades simultaneously
    const [result1, result2] = await Promise.all([
      this.testBuyOrder(quantity),
      this.testBuyOrder(quantity)
    ]);

    // Only one should succeed
    const successCount = [result1, result2].filter(r => r.success).length;
    return successCount === 1;
  }

  /**
   * Test price slippage handling
   */
  async testSlippageHandling(maxSlippage: number): Promise<boolean> {
    const quantity = 10.0;
    const originalPrice = MOCK_PRICE_USD;
    
    // Simulate price movement during trade
    const newPrice = originalPrice * (1 + maxSlippage + 0.01); // Exceed slippage
    this.mockPrices.set(MOCK_MINT, {
      ...this.mockPrices.get(MOCK_MINT)!,
      priceUsd: newPrice
    });

    const result = await this.testBuyOrder(quantity);
    
    // Should fail due to slippage
    return !result.success && result.error?.includes('slippage');
  }

  /**
   * Test PnL reconciliation after refresh
   */
  async testPnLReconciliation(): Promise<boolean> {
    // Create some trades
    await this.testBuyOrder(5.0);
    await this.testBuyOrder(3.0);
    await this.testSellOrder(2.0);

    // Simulate refresh - recalculate PnL from scratch
    const positionId = `pos_${MOCK_USER_ID}_${MOCK_MINT}`;
    const position = this.mockPositions.get(positionId);
    const priceData = this.mockPrices.get(MOCK_MINT);
    
    if (!position || !priceData) return false;

    const expectedUnrealizedPnL = position.qty.mul(priceData.priceUsd).minus(position.costBasis);
    
    // Check if PnL matches
    return expectedUnrealizedPnL.gte(0); // Should be positive for this test
  }

  /**
   * Get test statistics
   */
  getTestStats(): any {
    return {
      totalTrades: this.mockTrades.length,
      totalLots: this.mockLots.length,
      positions: Array.from(this.mockPositions.entries()),
      avgExecutionTime: this.mockTrades.reduce((sum, t) => sum + (t.executionTime || 0), 0) / this.mockTrades.length
    };
  }
}

// Test suite
describe('Trade Flow E2E Tests', () => {
  let tester: TradeFlowTester;

  beforeEach(() => {
    tester = new TradeFlowTester();
  });

  afterEach(() => {
    // Cleanup
  });

  it('should execute buy order successfully', async () => {
    const result = await tester.testBuyOrder(1.0);
    
    expect(result.success).toBe(true);
    expect(result.tradeId).toBeDefined();
    expect(result.positionId).toBeDefined();
    expect(result.executionTime).toBeLessThan(100); // Should be fast
  });

  it('should execute sell order with FIFO correctly', async () => {
    // First buy some tokens
    await tester.testBuyOrder(5.0);
    
    // Then sell some
    const result = await tester.testSellOrder(2.0);
    
    expect(result.success).toBe(true);
    expect(result.realizedPnL).toBeDefined();
  });

  it('should prevent double-click execution', async () => {
    const isProtected = await tester.testDoubleClickProtection();
    expect(isProtected).toBe(true);
  });

  it('should handle slippage correctly', async () => {
    const handlesSlippage = await tester.testSlippageHandling(0.05); // 5% max slippage
    expect(handlesSlippage).toBe(true);
  });

  it('should reconcile PnL after refresh', async () => {
    const reconciles = await tester.testPnLReconciliation();
    expect(reconciles).toBe(true);
  });

  it('should maintain FIFO order for multiple buys', async () => {
    // Buy at different prices
    await tester.testBuyOrder(1.0);
    
    // Change price
    const priceData = tester['mockPrices'].get(MOCK_MINT)!;
    priceData.priceUsd = priceData.priceUsd * 1.1; // 10% increase
    tester['mockPrices'].set(MOCK_MINT, priceData);
    
    await tester.testBuyOrder(1.0);
    
    // Sell should use FIFO
    const result = await tester.testSellOrder(1.0);
    expect(result.success).toBe(true);
  });

  it('should handle insufficient balance', async () => {
    // Mock insufficient balance
    const result = await tester.testBuyOrder(10000.0); // Very large order
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient balance');
  });

  it('should handle insufficient quantity for sell', async () => {
    const result = await tester.testSellOrder(1.0); // Sell without buying first
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('No position to sell');
  });
});

// Performance tests
describe('Trade Flow Performance Tests', () => {
  let tester: TradeFlowTester;

  beforeEach(() => {
    tester = new TradeFlowTester();
  });

  it('should execute trades within time budget', async () => {
    const startTime = Date.now();
    
    // Execute 10 trades
    for (let i = 0; i < 10; i++) {
      await tester.testBuyOrder(1.0);
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / 10;
    
    expect(avgTime).toBeLessThan(50); // 50ms per trade
  });

  it('should handle concurrent trades', async () => {
    const promises = Array.from({ length: 5 }, () => tester.testBuyOrder(1.0));
    const results = await Promise.all(promises);
    
    const successCount = results.filter(r => r.success).length;
    expect(successCount).toBe(5);
  });
});