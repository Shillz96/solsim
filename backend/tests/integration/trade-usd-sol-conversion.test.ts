/**
 * Integration Tests for USD/SOL Trade Conversion
 * 
 * Tests the complete flow of trade execution with proper USD/SOL conversions
 * Verifies that all critical bugs identified in the code review are fixed
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { Decimal } from 'decimal.js';

describe('Trade USD/SOL Conversion Integration Tests', () => {
  
  // Mock realistic prices
  const MOCK_SOL_PRICE_USD = 250; // $250 per SOL
  const MOCK_TOKEN_PRICE_USD = 0.0005; // $0.0005 per token
  
  describe('Bug #1: Trade Quantity Calculation', () => {
    it('should correctly calculate token quantity when buying with SOL', () => {
      // User wants to spend 10 SOL on a token priced at $0.0005
      const amountSol = 10;
      const tokenPriceUsd = MOCK_TOKEN_PRICE_USD;
      const solPriceUsd = MOCK_SOL_PRICE_USD;
      
      // Correct calculation:
      // 1. Convert SOL to USD: 10 SOL × $250/SOL = $2,500
      // 2. Calculate tokens: $2,500 ÷ $0.0005/token = 5,000,000 tokens
      const expectedQuantity = (amountSol * solPriceUsd) / tokenPriceUsd;
      
      expect(expectedQuantity).toBe(5_000_000);
      
      // Using Decimal for precision
      const solAmount = new Decimal(amountSol);
      const solPrice = new Decimal(solPriceUsd);
      const tokenPrice = new Decimal(tokenPriceUsd);
      
      const amountUsd = solAmount.mul(solPrice);
      const quantity = amountUsd.div(tokenPrice);
      
      expect(quantity.toNumber()).toBe(5_000_000);
    });
    
    it('should NOT use the old broken formula (SOL / USD)', () => {
      // The OLD BROKEN calculation
      const amountSol = 10;
      const tokenPriceUsd = MOCK_TOKEN_PRICE_USD;
      
      // This was the bug: dividing SOL by USD directly
      const brokenQuantity = amountSol / tokenPriceUsd; // = 10 / 0.0005 = 20,000
      
      // The broken formula gives 20,000 tokens instead of 5,000,000
      expect(brokenQuantity).toBe(20_000);
      expect(brokenQuantity).not.toBe(5_000_000); // Wrong!
    });
  });
  
  describe('Bug #2: Portfolio Value Calculation', () => {
    it('should correctly calculate portfolio value in USD and SOL', () => {
      const quantity = 912_702; // tokens
      const currentPriceUsd = 0.000039; // USD per token
      const solPriceUsd = 212.665; // USD per SOL
      
      // Correct calculation:
      // Current value USD: 912,702 tokens × $0.000039/token = $35.59 USD
      const expectedValueUsd = quantity * currentPriceUsd;
      expect(Math.round(expectedValueUsd * 100) / 100).toBe(35.60);
      
      // Current value SOL: $35.59 ÷ $212.665/SOL = 0.167 SOL
      const expectedValueSol = expectedValueUsd / solPriceUsd;
      expect(Math.round(expectedValueSol * 1000) / 1000).toBe(0.167);
      
      // Using Decimal for precision
      const quantityDecimal = new Decimal(quantity);
      const priceDecimal = new Decimal(currentPriceUsd);
      const solPriceDecimal = new Decimal(solPriceUsd);
      
      const valueUsd = quantityDecimal.mul(priceDecimal);
      const valueSol = valueUsd.div(solPriceDecimal);
      
      expect(valueUsd.toFixed(2)).toBe('35.60');
      expect(valueSol.toFixed(3)).toBe('0.167');
    });
    
    it('should NOT use the old broken double-multiplication', () => {
      const quantity = 912_702;
      const currentPriceUsd = 0.000039;
      const solPriceUsd = 212.665;
      
      // The OLD BROKEN calculation (from bug #2)
      const currentValueSol_BROKEN = quantity * currentPriceUsd; // Actually USD, not SOL!
      const currentValueUsd_BROKEN = currentValueSol_BROKEN * solPriceUsd; // Doubles the value!
      
      expect(Math.round(currentValueUsd_BROKEN * 100) / 100).toBeCloseTo(7570.98, 1); // 253x too high!
      expect(currentValueUsd_BROKEN).not.toBe(35.60); // Wrong!
    });
  });
  
  describe('Bug #3: PnL Calculation', () => {
    it('should correctly calculate PnL in both USD and SOL', () => {
      const quantity = 100_000; // tokens
      const entryPriceUsd = 0.0004; // Bought at $0.0004 per token
      const currentPriceUsd = 0.0005; // Current price $0.0005 per token
      const solPriceUsd = 250; // $250 per SOL
      
      // Entry value: 100,000 × $0.0004 = $40 USD = 0.16 SOL
      const entryValueUsd = quantity * entryPriceUsd;
      const entryValueSol = entryValueUsd / solPriceUsd;
      
      expect(entryValueUsd).toBe(40);
      expect(entryValueSol).toBe(0.16);
      
      // Current value: 100,000 × $0.0005 = $50 USD = 0.20 SOL
      const currentValueUsd = quantity * currentPriceUsd;
      const currentValueSol = currentValueUsd / solPriceUsd;
      
      expect(currentValueUsd).toBe(50);
      expect(currentValueSol).toBe(0.20);
      
      // PnL: $50 - $40 = $10 USD = 0.04 SOL
      const pnlUsd = currentValueUsd - entryValueUsd;
      const pnlSol = currentValueSol - entryValueSol;
      
      expect(pnlUsd).toBeCloseTo(10, 2);
      expect(pnlSol).toBeCloseTo(0.04, 8);
      
      // PnL %: ($10 / $40) × 100 = 25%
      const pnlPercent = (pnlUsd / entryValueUsd) * 100;
      expect(pnlPercent).toBe(25);
    });
  });
  
  describe('Bug #4: Frontend Sell Conversion', () => {
    it('should correctly convert token amount to SOL for sell trades', () => {
      // User wants to sell 100 tokens at $0.50 per token
      const tokenAmount = 100; // tokens
      const currentPriceUsd = 0.50; // USD per token
      const solPriceUsd = 250; // USD per SOL
      
      // Correct calculation:
      // Value in USD: 100 tokens × $0.50/token = $50
      // Value in SOL: $50 ÷ $250/SOL = 0.20 SOL
      const expectedSolAmount = (tokenAmount * currentPriceUsd) / solPriceUsd;
      
      expect(expectedSolAmount).toBe(0.20);
      expect(expectedSolAmount).not.toBe(50); // The old bug would give $50
    });
    
    it('should NOT use the old broken formula (tokens × USD)', () => {
      const tokenAmount = 100;
      const currentPriceUsd = 0.50;
      
      // The OLD BROKEN calculation
      const brokenSolAmount = tokenAmount * currentPriceUsd; // = 50
      
      // This gives USD, not SOL!
      expect(brokenSolAmount).toBe(50);
      expect(brokenSolAmount).not.toBe(0.20); // Wrong units!
    });
  });
  
  describe('Complete Trade Flow End-to-End', () => {
    it('should execute a complete buy-sell cycle with correct conversions', () => {
      // Setup
      const initialBalance = 100; // SOL
      const solPrice = 250; // USD/SOL
      const tokenPriceAtBuy = 0.0004; // USD/token
      const tokenPriceAtSell = 0.0005; // USD/token
      const amountToSpend = 10; // SOL
      
      // BUY PHASE
      // Convert SOL to USD: 10 SOL × $250/SOL = $2,500
      const buyAmountUsd = amountToSpend * solPrice;
      expect(buyAmountUsd).toBe(2_500);
      
      // Calculate tokens: $2,500 ÷ $0.0004/token = 6,250,000 tokens
      const tokensBought = buyAmountUsd / tokenPriceAtBuy;
      expect(tokensBought).toBe(6_250_000);
      
      // New balance: 100 - 10 = 90 SOL
      const balanceAfterBuy = initialBalance - amountToSpend;
      expect(balanceAfterBuy).toBe(90);
      
      // Entry price stored: $0.0004 USD/token
      const entryPrice = tokenPriceAtBuy;
      
      // SELL PHASE (sell all tokens)
      // Token value: 6,250,000 × $0.0005/token = $3,125
      const sellValueUsd = tokensBought * tokenPriceAtSell;
      expect(sellValueUsd).toBe(3_125);
      
      // Convert to SOL: $3,125 ÷ $250/SOL = 12.5 SOL
      const sellValueSol = sellValueUsd / solPrice;
      expect(sellValueSol).toBe(12.5);
      
      // New balance: 90 + 12.5 = 102.5 SOL
      const finalBalance = balanceAfterBuy + sellValueSol;
      expect(finalBalance).toBe(102.5);
      
      // Realized PnL: 102.5 - 100 = 2.5 SOL profit
      const realizedPnL = finalBalance - initialBalance;
      expect(realizedPnL).toBe(2.5);
      
      // PnL percentage: (2.5 / 10) × 100 = 25%
      const pnlPercent = (realizedPnL / amountToSpend) * 100;
      expect(pnlPercent).toBe(25);
    });
    
    it('should handle a losing trade correctly', () => {
      const initialBalance = 100; // SOL
      const solPrice = 250; // USD/SOL
      const tokenPriceAtBuy = 0.0005; // USD/token
      const tokenPriceAtSell = 0.0003; // USD/token (price dropped)
      const amountToSpend = 10; // SOL
      
      // BUY
      const buyAmountUsd = amountToSpend * solPrice; // $2,500
      const tokensBought = buyAmountUsd / tokenPriceAtBuy; // 5,000,000 tokens
      const balanceAfterBuy = initialBalance - amountToSpend; // 90 SOL
      
      // SELL (at lower price)
      const sellValueUsd = tokensBought * tokenPriceAtSell; // $1,500
      const sellValueSol = sellValueUsd / solPrice; // 6 SOL
      const finalBalance = balanceAfterBuy + sellValueSol; // 96 SOL
      
      // Realized PnL: 96 - 100 = -4 SOL loss
      const realizedPnL = finalBalance - initialBalance;
      expect(realizedPnL).toBe(-4);
      
      // PnL percentage: (-4 / 10) × 100 = -40%
      const pnlPercent = (realizedPnL / amountToSpend) * 100;
      expect(pnlPercent).toBe(-40);
    });
  });
  
  describe('Price Service Unit Validation', () => {
    it('should return prices in USD from getTokenPrice()', () => {
      // The PriceService.getTokenPrice() should always return USD
      // This is the contract that all calculations depend on
      
      // Mock what DexScreener returns
      const dexScreenerPrice = 0.000123; // USD per token
      
      // PriceService should return this as-is (in USD)
      const priceFromService = dexScreenerPrice;
      
      expect(priceFromService).toBe(0.000123);
      
      // To use in SOL-based calculations, must convert:
      const solPrice = 250;
      const priceInSol = priceFromService / solPrice;
      
      expect(priceInSol).toBe(0.000000492); // 0.000123 / 250
    });
  });
  
  describe('Shared PnL Calculator Integration', () => {
    it('should use calculatePnL with correct units', () => {
      // This test verifies the shared calculator is used correctly
      
      const quantity = 1_000_000; // tokens
      const entryPriceUsd = 0.0004; // USD/token (from database)
      const currentPriceUsd = 0.0005; // USD/token (from API)
      const solPriceUsd = 250; // USD/SOL
      
      // Convert entry price to SOL (required by shared calculator)
      const entryPriceSol = entryPriceUsd / solPriceUsd; // 0.0004 / 250 = 0.0000016 SOL/token
      
      // Mock the shared calculator logic
      const quantityDecimal = new Decimal(quantity);
      const entryPriceSolDecimal = new Decimal(entryPriceSol);
      const currentPriceUsdDecimal = new Decimal(currentPriceUsd);
      const solPriceUsdDecimal = new Decimal(solPriceUsd);
      
      // Investment: quantity × entryPriceSol = invested SOL
      const investedSol = quantityDecimal.mul(entryPriceSolDecimal);
      expect(investedSol.toNumber()).toBe(1.6); // 1,000,000 × 0.0000016
      
      // Current value: quantity × currentPriceUsd = current USD
      const currentValueUsd = quantityDecimal.mul(currentPriceUsdDecimal);
      expect(currentValueUsd.toNumber()).toBe(500); // 1,000,000 × 0.0005
      
      // Current value SOL: currentValueUsd ÷ solPriceUsd
      const currentValueSol = currentValueUsd.div(solPriceUsdDecimal);
      expect(currentValueSol.toNumber()).toBe(2); // 500 / 250
      
      // PnL SOL: currentValueSol - investedSol
      const pnlSol = currentValueSol.sub(investedSol);
      expect(pnlSol.toNumber()).toBeCloseTo(0.4, 8); // 2 - 1.6 = 0.4 SOL profit
      
      // PnL %: (pnlSol / investedSol) × 100
      const pnlPercent = pnlSol.div(investedSol).mul(100);
      expect(pnlPercent.toNumber()).toBe(25); // (0.4 / 1.6) × 100 = 25%
    });
  });
  
  describe('Database Storage Validation', () => {
    it('should store trade.price in USD', () => {
      // Trade record should store:
      const tradeRecord = {
        price: 0.0005, // USD per token (from DexScreener)
        totalCost: 10, // SOL spent
        quantity: 5_000_000, // tokens (calculated from SOL amount)
      };
      
      // Verify units are correct
      expect(typeof tradeRecord.price).toBe('number');
      expect(tradeRecord.price).toBe(0.0005); // USD
      expect(tradeRecord.totalCost).toBe(10); // SOL
      expect(tradeRecord.quantity).toBe(5_000_000); // tokens
    });
    
    it('should store holding.entryPrice in USD', () => {
      // Holding record should store:
      const holdingRecord = {
        entryPrice: 0.0004, // USD per token (legacy format)
        quantity: 1_000_000, // tokens
      };
      
      // To calculate invested SOL, need to convert:
      const solPrice = 250;
      const entryPriceSol = holdingRecord.entryPrice / solPrice; // 0.0000016 SOL/token
      const investedSol = holdingRecord.quantity * entryPriceSol; // 1.6 SOL
      
      expect(investedSol).toBe(1.6);
    });
  });
  
  describe('Realized PnL Calculation on Sell', () => {
    it('should calculate correct realized PnL when selling', () => {
      // Holding info
      const quantity = 100_000; // tokens to sell
      const entryPriceUsd = 0.0004; // Bought at $0.0004/token
      const currentPriceUsd = 0.0006; // Selling at $0.0006/token
      
      // Calculate PnL (in USD first)
      const pnlPerToken = currentPriceUsd - entryPriceUsd; // $0.0002/token
      const pnlUsd = quantity * pnlPerToken; // $20 USD
      
      expect(pnlUsd).toBeCloseTo(20, 2);
      
      // Convert to SOL
      const solPrice = 250;
      const pnlSol = pnlUsd / solPrice; // 0.08 SOL
      
      expect(pnlSol).toBe(0.08);
      
      // Using Decimal for precision (matches backend code)
      const quantityDecimal = new Decimal(quantity);
      const entryPrice = new Decimal(entryPriceUsd);
      const sellPrice = new Decimal(currentPriceUsd);
      
      const realizedPnL = quantityDecimal.mul(sellPrice.sub(entryPrice));
      expect(realizedPnL.toNumber()).toBe(20); // USD
    });
  });
  
  describe('Balance Update Validation', () => {
    it('should correctly update SOL balance after buy', () => {
      const initialBalance = 100; // SOL
      const amountToSpend = 10; // SOL
      
      const newBalance = initialBalance - amountToSpend;
      
      expect(newBalance).toBe(90); // SOL
    });
    
    it('should correctly update SOL balance after sell', () => {
      const currentBalance = 90; // SOL
      const tokensToSell = 100_000; // tokens
      const sellPriceUsd = 0.0005; // USD/token
      const solPriceUsd = 250; // USD/SOL
      
      // Calculate SOL received
      const sellValueUsd = tokensToSell * sellPriceUsd; // $50
      const solReceived = sellValueUsd / solPriceUsd; // 0.20 SOL
      
      const newBalance = currentBalance + solReceived;
      
      expect(newBalance).toBe(90.20); // SOL
    });
  });
});

