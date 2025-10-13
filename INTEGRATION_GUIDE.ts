/**
 * Complete Integration Guide - Wiring Everything Together
 * 
 * This file shows how to integrate all the new infrastructure components:
 * 1. Backend WS server with Railway-safe heartbeat
 * 2. PnL computation service with FIFO lots
 * 3. UI panel styles for better readability
 * 4. Single source of truth for WebSocket URLs
 */

// =============================================================================
// 1. BACKEND INTEGRATION
// =============================================================================

// In your main server file (e.g., backend/src/index.ts):
/*
import { startWsServer } from "./ws/server.js";
import { computePnL, createFill } from "./services/pnl.js";

// Start your HTTP server first
const server = app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

// Add WebSocket server
const { wss, cleanup, broadcastPrice } = startWsServer(server);

// Broadcast price updates to all connected clients
function broadcastPriceUpdate(mint: string, priceInSol: number) {
  const priceLamports = Math.round(priceInSol * 1_000_000_000).toString();
  
  broadcastPrice({
    mint,
    priceLamports,
    seq: Date.now(),
    ts: Date.now()
  });
}

// Example: broadcast SOL price
broadcastPriceUpdate("So11111111111111111111111111111111111111112", 150.75);
*/

// =============================================================================
// 2. PNL SERVICE INTEGRATION
// =============================================================================

// In your portfolio service:
/*
import { computePnL, createFill, validateFills } from "./services/pnl.js";

// Example: Calculate PnL for a user's position
async function calculateUserPnL(userId: string, mint: string) {
  // Fetch user's fills from database
  const fills = await getUserFills(userId, mint);
  
  // Convert to our PnL format
  const pnlFills = fills.map(fill => createFill(
    fill.side,
    fill.quantity,
    fill.priceInSol,
    fill.feeInSol,
    fill.tokenDecimals,
    fill.timestamp,
    fill.id
  ));
  
  // Validate before processing
  validateFills(pnlFills);
  
  // Get current market price (in SOL)
  const currentPriceInSol = await getCurrentPrice(mint);
  const markPriceLamports = Math.round(currentPriceInSol * 1_000_000_000).toString();
  
  // Compute PnL with integer precision
  const pnl = computePnL(pnlFills, markPriceLamports);
  
  return {
    realizedPnLInSol: Number(pnl.realizedLamports) / 1_000_000_000,
    unrealizedPnLInSol: Number(pnl.unrealizedLamports) / 1_000_000_000,
    openQuantity: Number(pnl.openQuantity),
    averageCostInSol: Number(pnl.averageCostLamports) / 1_000_000_000,
    openLots: pnl.openLots
  };
}
*/

// =============================================================================
// 3. FRONTEND INTEGRATION
// =============================================================================

// Import the CSS in your main layout or globals.css:
// @import '../styles/panel.css';

// Apply panel classes to your components:
/*
// Login card
<div className="panel panel-auth">
  <h2>Sign In</h2>
  <form>...</form>
</div>

// Trading interface
<div className="panel panel-trading">
  <h3>Buy/Sell</h3>
  <div>...</div>
</div>

// Portfolio display
<div className="panel panel-portfolio">
  <h3>Your Positions</h3>
  <div>...</div>
</div>

// Data/charts
<div className="panel panel-data">
  <h3>Price Chart</h3>
  <div>...</div>
</div>
*/

// =============================================================================
// 4. WEBSOCKET CLIENT INTEGRATION
// =============================================================================

// Example React hook for price streaming:
/*
import { useEffect, useState } from 'react';
import { connectPrices } from '@/lib/ws';
import { env } from '@/lib/env';

export function usePriceStream(mints: string[]) {
  const [prices, setPrices] = useState<Map<string, any>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const onPriceTick = (tick) => {
      setPrices(prev => new Map(prev.set(tick.mint, {
        price: Number(tick.priceLamports) / 1_000_000_000, // Convert to SOL
        timestamp: tick.ts,
        sequence: tick.seq
      })));
    };

    try {
      cleanup = connectPrices(onPriceTick, env.NEXT_PUBLIC_WS_URL);
      setConnected(true);
    } catch (error) {
      console.error('Failed to connect to price stream:', error);
      setConnected(false);
    }

    return () => {
      if (cleanup) cleanup();
      setConnected(false);
    };
  }, []);

  return { prices, connected };
}
*/

// =============================================================================
// 5. COMPONENT EXAMPLE WITH ALL FEATURES
// =============================================================================

/*
import { usePriceStream } from '@/hooks/use-price-stream';
import { formatLamportsAsSOL } from '@/lib/format';
import { env } from '@/lib/env';

export function TradingPanel({ mint }: { mint: string }) {
  const { prices, connected } = usePriceStream([mint]);
  const currentPrice = prices.get(mint);

  return (
    <div className="panel panel-trading">
      <div className="header">
        <h3>Trade {mint.slice(0, 8)}...</h3>
        <div className="text-sm text-muted-foreground">
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      </div>

      {currentPrice && (
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {formatLamportsAsSOL((currentPrice.price * 1_000_000_000).toString())}
          </div>
          <div className="text-sm text-muted-foreground">
            Last updated: {new Date(currentPrice.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded">
          Buy
        </button>
        <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded">
          Sell
        </button>
      </div>
    </div>
  );
}
*/

// =============================================================================
// 6. PRODUCTION DEPLOYMENT CHECKLIST
// =============================================================================

/*
Backend Deployment:
1. Set WebSocket path to /prices
2. Enable heartbeat with 25s interval
3. Use the WS server alongside your HTTP server
4. Monitor connection counts and heartbeat logs

Frontend Deployment:
1. Set NEXT_PUBLIC_WS_URL=wss://ws.solsim.fun/prices
2. Avoid routing through Vercel edge proxy
3. Import panel.css in your layout
4. Apply .panel classes to cards/modals
5. Use env.NEXT_PUBLIC_WS_URL everywhere

Database:
1. Store fills with integer amounts (TEXT or NUMERIC columns)
2. Use lamports for SOL amounts
3. Use mint-scaled base units for token amounts
4. Never store floating-point financial data

Monitoring:
1. Check WebSocket connection health
2. Monitor PnL computation performance
3. Verify heartbeat logs in production
4. Watch for connection drops on mobile
*/

export {};  // Make this a module