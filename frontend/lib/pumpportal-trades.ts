/**
 * PumpPortal Backend API Client
 * 
 * Frontend client for real-time trade feed via backend SSE (Server-Sent Events).
 * Backend connects to PumpPortal WebSocket and pushes updates to frontend in real-time.
 * 
 * Architecture: Frontend SSE ← Backend API ← Redis Cache ← PumpPortal WebSocket
 * 
 * Benefits:
 * - **True real-time** - Server pushes events to client (no polling)
 * - **Single backend connection** - Scalable to thousands of users
 * - **No CORS issues** - Backend-to-backend communication
 * - **Low latency** - ~50-100ms added (imperceptible)
 * - **Auto-reconnection** - Built into EventSource API
 */

export type RecentTrade = {
  ts: number;               // unix ms timestamp
  side: "buy" | "sell";     // trade direction
  priceSol?: number;        // SOL per token or token per SOL
  amountSol?: number;       // SOL amount in trade
  amountToken?: number;     // token amount in trade
  signer: string;           // trader public key
  sig: string;              // transaction signature
  mint: string;             // token mint address
};

export type TokenMetadata = {
  mint: string;
  name?: string;
  symbol?: string;
  description?: string;
  imageUrl?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  holderCount?: number;     // Real-time holder count from PumpPortal
  marketCapSol?: number;
  vSolInBondingCurve?: number;
  vTokensInBondingCurve?: number;
  bondingCurveProgress?: number;
  timestamp: number;
};

export type TradeStreamStatus = "connecting" | "connected" | "closed" | "error";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export type TradeStreamCallbacks = {
  onTrade: (trade: RecentTrade) => void;
  onHistory?: (trades: RecentTrade[]) => void;
  onStatus?: (status: TradeStreamStatus) => void;
  onError?: (error: Error) => void;
};

export type TokenMetadataCallbacks = {
  onMetadata: (metadata: TokenMetadata) => void;
  onStatus?: (status: TradeStreamStatus) => void;
  onError?: (error: Error) => void;
};

/**
 * Stream real-time trades for a token via backend SSE (Server-Sent Events)
 * 
 * Backend maintains PumpPortal WebSocket and pushes updates to frontend in real-time.
 * No polling - true push from server to client with <100ms latency.
 * 
 * @param mint - Token mint address
 * @param callbacks - Callback functions for trade events
 * @returns Cleanup function to close the SSE connection
 */
export function streamTokenTrades(
  mint: string,
  { onTrade, onHistory, onStatus, onError }: TradeStreamCallbacks
): () => void {
  const url = `${BACKEND_URL}/api/pumpportal/trades/${mint}?limit=50`;
  const eventSource = new EventSource(url);
  let isCleaningUp = false;

  eventSource.onopen = () => {
    if (isCleaningUp) return;
    onStatus?.("connected");
    console.log(`[PumpPortal] SSE connected for ${mint}`);
  };

  eventSource.onmessage = (event) => {
    if (isCleaningUp) return;

    try {
      const data = JSON.parse(event.data);

      if (data.type === 'history' && data.trades) {
        // Initial trade history
        onHistory?.(data.trades);
      } else if (data.type === 'trade' && data.trade) {
        // New real-time trade
        onTrade(data.trade);
      }
    } catch (error) {
      console.warn("[PumpPortal] Failed to parse SSE message:", error);
    }
  };

  eventSource.onerror = (error) => {
    if (isCleaningUp) return;
    onStatus?.("error");
    console.error(`[PumpPortal] SSE error for ${mint}:`, error);
    onError?.(new Error("SSE connection error"));
  };

  // Return cleanup function
  return () => {
    isCleaningUp = true;
    eventSource.close();
  };
}

/**
 * Stream real-time token metadata via backend SSE
 * 
 * @param mint - Token mint address
 * @param callbacks - Callback functions for metadata updates
 * @returns Cleanup function to close the SSE connection
 */
export function streamTokenMetadata(
  mint: string,
  { onMetadata, onStatus, onError }: TokenMetadataCallbacks
): () => void {
  const url = `${BACKEND_URL}/api/pumpportal/metadata/${mint}`;
  const eventSource = new EventSource(url);
  let isCleaningUp = false;

  eventSource.onopen = () => {
    if (isCleaningUp) return;
    onStatus?.("connected");
    console.log(`[PumpPortal] SSE connected for metadata ${mint}`);
  };

  eventSource.onmessage = (event) => {
    if (isCleaningUp) return;

    try {
      const data = JSON.parse(event.data);

      if (data.type === 'metadata' && data.metadata) {
        onMetadata(data.metadata);
      }
    } catch (error) {
      console.warn("[PumpPortal] Failed to parse SSE message:", error);
    }
  };

  eventSource.onerror = (error) => {
    if (isCleaningUp) return;
    onStatus?.("error");
    console.error(`[PumpPortal] SSE error for metadata ${mint}:`, error);
    onError?.(new Error("SSE connection error"));
  };

  // Return cleanup function
  return () => {
    isCleaningUp = true;
    eventSource.close();
  };
}

/**
 * DEPRECATED: Shared connection class - use streamTokenTrades() instead
 * Kept for backwards compatibility
 */
export class PumpPortalTradeStream {
  constructor() {
    console.warn('[PumpPortal] PumpPortalTradeStream class is deprecated. Use streamTokenTrades() instead.');
  }

  subscribe(mint: string, callback: (trade: RecentTrade) => void): () => void {
    return streamTokenTrades(mint, { onTrade: callback });
  }

  unsubscribe(_mint: string): void {
    console.warn('[PumpPortal] Unsubscribe via cleanup function instead');
  }

  close(): void {
    console.warn('[PumpPortal] Close via cleanup function instead');
  }
}
