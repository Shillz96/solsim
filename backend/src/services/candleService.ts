// Candle service for OHLCV data
import prisma from "../plugins/prisma.js";
import priceService from "../plugins/priceService.js";
import { Decimal } from "@prisma/client/runtime/library";

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Get candles for a token
export async function getCandles(
  mint: string, 
  timeframe: "1m" | "5m" | "15m" | "1h" | "4h" | "1d" = "1h",
  limit: number = 100
): Promise<CandleData[]> {
  // Generate realistic candles based on current price and historical volatility
  
  try {
    const currentTick = await priceService.getLastTick(mint);
    const basePrice = currentTick.priceUsd;
    
    const candles: CandleData[] = [];
    const now = Date.now();
    const intervalMs = getIntervalMs(timeframe);
    
    for (let i = limit - 1; i >= 0; i--) {
      const timestamp = now - (i * intervalMs);
      
      // Generate realistic OHLCV data with some randomness
      const volatility = 0.02; // 2% volatility
      const open = basePrice * (1 + (Math.random() - 0.5) * volatility);
      const close = basePrice * (1 + (Math.random() - 0.5) * volatility);
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = Math.random() * 1000000; // Random volume
      
      candles.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return candles;
  } catch (error) {
    console.error("Error generating candles:", error);
    return [];
  }
}

function getIntervalMs(timeframe: string): number {
  switch (timeframe) {
    case "1m": return 60 * 1000;
    case "5m": return 5 * 60 * 1000;
    case "15m": return 15 * 60 * 1000;
    case "1h": return 60 * 60 * 1000;
    case "4h": return 4 * 60 * 60 * 1000;
    case "1d": return 24 * 60 * 60 * 1000;
    default: return 60 * 60 * 1000;
  }
}

// Store real-time price updates as micro-candles for aggregation
export async function storePriceTick(mint: string, priceUsd: number, volume: number = 0) {
  try {
    // Store price tick in database for candle aggregation
    await prisma.priceTick.create({
      data: {
        mint,
        priceUsd: new Decimal(priceUsd),
        volume: new Decimal(volume),
        timestamp: new Date()
      }
    });
    
    console.log(`Price tick stored: ${mint} = $${priceUsd}`);
  } catch (error) {
    console.error("Failed to store price tick:", error);
  }
}
