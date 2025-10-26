/**
 * PumpPortal WebSocket Trade Stream
 * 
 * Real-time trade feed for pump.fun tokens via PumpPortal's Data API
 * WebSocket endpoint: wss://pumpportal.fun/api/data
 * 
 * @see https://pumpportal.fun/api-docs
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

export type TradeStreamCallbacks = {
  onTrade: (trade: RecentTrade) => void;
  onStatus?: (status: TradeStreamStatus) => void;
  onError?: (error: Error) => void;
};

export type TokenMetadataCallbacks = {
  onMetadata: (metadata: TokenMetadata) => void;
  onStatus?: (status: TradeStreamStatus) => void;
  onError?: (error: Error) => void;
};

/**
 * Stream real-time trades for a specific token from PumpPortal
 * 
 * IMPORTANT: PumpPortal recommends keeping ONE WebSocket connection
 * and subscribing/unsubscribing to multiple tokens on that connection
 * rather than opening multiple WebSockets (to avoid rate limits/bans).
 * 
 * @param mint - Token mint address to subscribe to
 * @param callbacks - Callback functions for trade events and status updates
 * @returns Cleanup function to unsubscribe and close connection
 */
export function streamTokenTrades(
  mint: string,
  { onTrade, onStatus, onError }: TradeStreamCallbacks
): () => void {
  // Use native WebSocket in browser
  const ws = new WebSocket("wss://pumpportal.fun/api/data");
  let isCleaningUp = false;

  ws.onopen = () => {
    if (isCleaningUp) return;
    
    onStatus?.("connected");
    console.log(`[PumpPortal] Connected, subscribing to ${mint}`);
    
    // Subscribe to token trade events
    ws.send(JSON.stringify({
      method: "subscribeTokenTrade",
      keys: [mint],  // Token contract address
    }));
  };

  ws.onmessage = (event) => {
    if (isCleaningUp) return;
    
    try {
      const msg = JSON.parse(event.data);

      // PumpPortal emits different event types; filter for trades
      // Event structure varies slightly, so we normalize it
      if (msg.txType === "buy" || msg.txType === "sell" || msg.type === "trade") {
        const trade: RecentTrade = {
          // Timestamp (convert to ms if needed)
          ts: msg.timestamp ? msg.timestamp * 1000 : Date.now(),
          
          // Trade direction
          side: msg.txType === "buy" || msg.isBuy ? "buy" : "sell",
          
          // Price info (handle different field names)
          priceSol: msg.solAmount && msg.tokenAmount 
            ? msg.solAmount / msg.tokenAmount 
            : msg.price || msg.solPerToken,
          
          // Amounts
          amountSol: msg.solAmount || msg.sol,
          amountToken: msg.tokenAmount || msg.tokens,
          
          // Transaction info
          signer: msg.traderPublicKey || msg.trader || msg.user || msg.signer,
          sig: msg.signature || msg.sig || msg.txHash || "",
          
          // Token
          mint: msg.mint || mint,
        };

        onTrade(trade);
      }
    } catch (error) {
      console.warn("[PumpPortal] Failed to parse message:", error);
      // Don't propagate parse errors - just log them
    }
  };

  ws.onclose = () => {
    if (isCleaningUp) return;
    onStatus?.("closed");
    console.log(`[PumpPortal] Connection closed for ${mint}`);
  };

  ws.onerror = (event) => {
    if (isCleaningUp) return;
    onStatus?.("error");
    const error = new Error("WebSocket connection error");
    console.error(`[PumpPortal] WebSocket error for ${mint}:`, error);
    onError?.(error);
  };

  // Return cleanup function
  return () => {
    isCleaningUp = true;
    
    // Polite unsubscribe before closing (recommended by PumpPortal docs)
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          method: "unsubscribeTokenTrade",
          keys: [mint],
        }));
      } catch (e) {
        console.warn("[PumpPortal] Failed to unsubscribe:", e);
      }
    }
    
    // Close the WebSocket
    ws.close();
  };
}

/**
 * Create a shared WebSocket connection for multiple token subscriptions
 * (Advanced usage - for apps that need to subscribe to many tokens)
 * 
 * This is more efficient than creating multiple WebSocket connections.
 */
export class PumpPortalTradeStream {
  private ws: WebSocket | null = null;
  private subscriptions = new Map<string, Set<(trade: RecentTrade) => void>>();
  private statusCallbacks = new Set<(status: TradeStreamStatus) => void>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor() {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket("wss://pumpportal.fun/api/data");

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.notifyStatus("connected");
      console.log("[PumpPortal] Shared connection established");

      // Re-subscribe to all active tokens
      const tokens = Array.from(this.subscriptions.keys());
      if (tokens.length > 0) {
        this.ws?.send(JSON.stringify({
          method: "subscribeTokenTrade",
          keys: tokens,
        }));
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.txType === "buy" || msg.txType === "sell" || msg.type === "trade") {
          const mint = msg.mint;
          const callbacks = this.subscriptions.get(mint);

          if (callbacks) {
            const trade: RecentTrade = {
              ts: msg.timestamp ? msg.timestamp * 1000 : Date.now(),
              side: msg.txType === "buy" || msg.isBuy ? "buy" : "sell",
              priceSol: msg.solAmount && msg.tokenAmount 
                ? msg.solAmount / msg.tokenAmount 
                : msg.price || msg.solPerToken,
              amountSol: msg.solAmount || msg.sol,
              amountToken: msg.tokenAmount || msg.tokens,
              signer: msg.traderPublicKey || msg.trader || msg.user || msg.signer,
              sig: msg.signature || msg.sig || msg.txHash || "",
              mint,
            };

            callbacks.forEach(cb => cb(trade));
          }
        }
      } catch (error) {
        console.warn("[PumpPortal] Failed to parse message:", error);
      }
    };

    this.ws.onclose = () => {
      this.notifyStatus("closed");
      this.attemptReconnect();
    };

    this.ws.onerror = () => {
      this.notifyStatus("error");
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[PumpPortal] Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[PumpPortal] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private notifyStatus(status: TradeStreamStatus) {
    this.statusCallbacks.forEach(cb => cb(status));
  }

  /**
   * Subscribe to trades for a specific token
   */
  subscribe(mint: string, onTrade: (trade: RecentTrade) => void) {
    if (!this.subscriptions.has(mint)) {
      this.subscriptions.set(mint, new Set());
      
      // Subscribe via WebSocket if connected
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          method: "subscribeTokenTrade",
          keys: [mint],
        }));
      }
    }

    this.subscriptions.get(mint)!.add(onTrade);
  }

  /**
   * Unsubscribe from trades for a specific token
   */
  unsubscribe(mint: string, onTrade: (trade: RecentTrade) => void) {
    const callbacks = this.subscriptions.get(mint);
    if (!callbacks) return;

    callbacks.delete(onTrade);

    // If no more callbacks for this token, unsubscribe from WebSocket
    if (callbacks.size === 0) {
      this.subscriptions.delete(mint);
      
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          method: "unsubscribeTokenTrade",
          keys: [mint],
        }));
      }
    }
  }

  /**
   * Register a status callback
   */
  onStatus(callback: (status: TradeStreamStatus) => void) {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Close all connections and cleanup
   */
  destroy() {
    this.subscriptions.clear();
    this.statusCallbacks.clear();
    this.ws?.close();
    this.ws = null;
  }
}

/**
 * Stream token metadata updates (including holder count) from PumpPortal
 * 
 * This subscribes to the token's data feed which includes updates like:
 * - Holder count changes
 * - Market cap updates
 * - Bonding curve progress
 * - Social links
 * 
 * Note: This is different from trade events - it's for token-level metadata updates.
 * 
 * @param mint - Token mint address to subscribe to
 * @param callbacks - Callback functions for metadata events and status updates
 * @returns Cleanup function to unsubscribe and close connection
 */
export function streamTokenMetadata(
  mint: string,
  { onMetadata, onStatus, onError }: TokenMetadataCallbacks
): () => void {
  const ws = new WebSocket("wss://pumpportal.fun/api/data");
  let isCleaningUp = false;

  ws.onopen = () => {
    if (isCleaningUp) return;
    
    onStatus?.("connected");
    console.log(`[PumpPortal Metadata] Connected, subscribing to ${mint}`);
    
    // Subscribe to token metadata/updates
    // PumpPortal provides various subscription methods - this captures token updates
    ws.send(JSON.stringify({
      method: "subscribeTokenTrade", // This also includes metadata updates
      keys: [mint],
    }));
  };

  ws.onmessage = (event) => {
    if (isCleaningUp) return;
    
    try {
      const msg = JSON.parse(event.data);

      // Look for messages that contain token metadata
      // PumpPortal may send this as part of trade events or as separate updates
      if (msg.mint === mint && (msg.holderCount !== undefined || msg.marketCapSol !== undefined)) {
        const metadata: TokenMetadata = {
          mint: msg.mint || mint,
          name: msg.name || msg.tokenName,
          symbol: msg.symbol || msg.tokenSymbol,
          description: msg.description,
          imageUrl: msg.image || msg.imageUrl,
          twitter: msg.twitter,
          telegram: msg.telegram,
          website: msg.website,
          holderCount: msg.holderCount,
          marketCapSol: msg.marketCapSol,
          vSolInBondingCurve: msg.vSolInBondingCurve,
          vTokensInBondingCurve: msg.vTokensInBondingCurve,
          bondingCurveProgress: msg.bondingCurveProgress,
          timestamp: msg.timestamp ? msg.timestamp * 1000 : Date.now(),
        };

        onMetadata(metadata);
      }
    } catch (error) {
      console.warn("[PumpPortal Metadata] Failed to parse message:", error);
    }
  };

  ws.onclose = () => {
    if (isCleaningUp) return;
    onStatus?.("closed");
    console.log(`[PumpPortal Metadata] Connection closed for ${mint}`);
  };

  ws.onerror = (event) => {
    if (isCleaningUp) return;
    onStatus?.("error");
    const error = new Error("WebSocket connection error");
    console.error(`[PumpPortal Metadata] WebSocket error for ${mint}:`, error);
    onError?.(error);
  };

  // Return cleanup function
  return () => {
    isCleaningUp = true;
    
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          method: "unsubscribeTokenTrade",
          keys: [mint],
        }));
      } catch (e) {
        console.warn("[PumpPortal Metadata] Failed to unsubscribe:", e);
      }
    }
    
    ws.close();
  };
}
