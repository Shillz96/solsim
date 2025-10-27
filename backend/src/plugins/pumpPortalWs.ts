/**
 * PumpPortal WebSocket Client
 *
 * Real-time price streaming for ALL Solana tokens via PumpPortal's free WebSocket API
 *
 * ARCHITECTURE NOTE:
 * - PumpPortal WebSocket provides real-time price updates when trades occur
 * - This is NOT a complete price solution - prices only update when trades happen!
 * - For inactive tokens, prices will go stale without trades
 * - This should be used WITH other price sources (Jupiter, pump.fun API) for complete coverage
 * 
 * Token Support:
 * - pump.fun tokens (native support)
 * - bonk.fun tokens
 * - Raydium tokens
 * - Any Solana token that trades on supported DEXs
 *
 * Features:
 * - Subscribe to new token creation events
 * - Subscribe to trades for specific tokens
 * - Calculate prices from bonding curve reserves (pump.fun)
 * - Calculate prices from trade amounts (DEX swaps)
 * - Automatic reconnection with exponential backoff
 *
 * API Documentation: https://pumpportal.fun/
 */

import { EventEmitter } from "events";
import WebSocket from "ws";
import { loggers } from "../utils/logger.js";

const logger = loggers.priceService;

export interface PumpFunTrade {
  signature: string;
  mint: string;
  traderPublicKey: string;
  txType: "buy" | "sell";
  tokenAmount: number;
  solAmount: number;
  timestamp: number;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  newTokenPrice?: number; // Price calculated from reserves
}

export interface PumpFunPrice {
  mint: string;
  priceUsd: number;
  priceSol: number;
  timestamp: number;
  source: "pumpportal-ws";
  marketCapUsd?: number;
}

/**
 * PumpPortal WebSocket Client for real-time pump.fun price streaming
 */
export class PumpPortalWebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private solPriceUsd = 100; // Updated externally
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private reconnectDelay = 1000;
  private readonly MAX_RECONNECT_DELAY = 60000;
  private isReconnecting = false;
  private shouldReconnect = true;
  private pingInterval: NodeJS.Timeout | null = null;

  // Track subscribed tokens to re-subscribe on reconnect
  private subscribedTokens = new Set<string>();
  private subscribedToNewTokens = false;

  private readonly WS_URL = "wss://pumpportal.fun/api/data";

  constructor(solPriceUsd: number = 100) {
    super();
    this.solPriceUsd = solPriceUsd;
  }

  /**
   * Update SOL price for accurate USD calculations
   */
  updateSolPrice(solPriceUsd: number) {
    this.solPriceUsd = solPriceUsd;
  }

  /**
   * Connect to PumpPortal WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      logger.warn("PumpPortal WebSocket already connected");
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        logger.info("🔌 Connecting to PumpPortal WebSocket...");
        this.ws = new WebSocket(this.WS_URL);

        this.ws.on('open', () => {
          logger.info("✅ PumpPortal WebSocket connected");

          // Reset reconnection state
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.isReconnecting = false;

          // Re-subscribe to previous subscriptions
          this.resubscribe();

          // Start ping/pong health checks
          this.startHealthChecks();

          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error: Error) => {
          logger.error({ error: error.message }, "PumpPortal WebSocket error");
          reject(error);
        });

        this.ws.on('close', (code: number, reason: Buffer) => {
          logger.warn({ code, reason: reason.toString() }, "PumpPortal WebSocket closed");

          if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
          }

          if (this.shouldReconnect) {
            this.reconnect();
          }
        });

        this.ws.on('pong', () => {
          logger.debug("PumpPortal pong received");
        });

      } catch (error) {
        logger.error({ error }, "Failed to create PumpPortal WebSocket connection");
        reject(error);
      }
    });
  }

  /**
   * Start health check pings
   */
  private startHealthChecks() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
        logger.debug("PumpPortal ping sent");
      }
    }, 30000);
  }

  /**
   * Reconnect with exponential backoff
   */
  private reconnect() {
    if (this.isReconnecting) return;

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      logger.error("PumpPortal: Maximum reconnection attempts reached");
      return;
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    logger.info(
      {
        attempt: this.reconnectAttempts,
        maxAttempts: this.MAX_RECONNECT_ATTEMPTS,
        delay: this.reconnectDelay
      },
      "PumpPortal: Attempting to reconnect"
    );

    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        logger.error({ error }, "PumpPortal reconnection failed");
      }

      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.MAX_RECONNECT_DELAY);
      this.isReconnecting = false;
    }, this.reconnectDelay);
  }

  /**
   * Re-subscribe to previous subscriptions after reconnect
   */
  private resubscribe() {
    if (this.subscribedToNewTokens) {
      this.subscribeToNewTokens();
    }

    for (const mint of this.subscribedTokens) {
      this.subscribeToToken(mint);
    }
  }

  /**
   * Subscribe to all new token creation events
   */
  subscribeToNewTokens() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error("PumpPortal: Cannot subscribe - WebSocket not connected");
      return;
    }

    const subscribeMessage = {
      method: "subscribeNewToken"
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    this.subscribedToNewTokens = true;
    logger.info("📡 Subscribed to PumpPortal new token events");
  }

  /**
   * Subscribe to trades for a specific token
   */
  subscribeToToken(mint: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.error({ mint: mint.slice(0, 8) }, "PumpPortal: Cannot subscribe - WebSocket not connected");
      return;
    }

    const subscribeMessage = {
      method: "subscribeTokenTrade",
      keys: [mint]
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    this.subscribedTokens.add(mint);
    logger.debug({ mint: mint.slice(0, 8) }, "Subscribed to PumpPortal token trades");
  }

  /**
   * Unsubscribe from token trades
   */
  unsubscribeFromToken(mint: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const unsubscribeMessage = {
      method: "unsubscribeTokenTrade",
      keys: [mint]
    };

    this.ws.send(JSON.stringify(unsubscribeMessage));
    this.subscribedTokens.delete(mint);
    logger.debug({ mint: mint.slice(0, 8) }, "Unsubscribed from PumpPortal token trades");
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: WebSocket.Data) {
    try {
      const messageStr = data.toString('utf8');
      const message = JSON.parse(messageStr);

      // Handle trade events
      if (message.txType === 'buy' || message.txType === 'sell') {
        this.handleTradeEvent(message);
      }

    } catch (error) {
      logger.error({ error }, "PumpPortal: Failed to parse message");
    }
  }

  /**
   * Handle trade event and emit price update
   */
  private handleTradeEvent(trade: any) {
    try {
      const pumpTrade: PumpFunTrade = {
        signature: trade.signature,
        mint: trade.mint,
        traderPublicKey: trade.traderPublicKey,
        txType: trade.txType,
        tokenAmount: trade.tokenAmount,
        solAmount: trade.solAmount,
        timestamp: trade.timestamp,
        virtualSolReserves: trade.virtualSolReserves,
        virtualTokenReserves: trade.virtualTokenReserves
      };

      // Calculate price from bonding curve reserves
      const virtualSolReservesInSol = pumpTrade.virtualSolReserves / 1e9; // lamports → SOL
      const virtualTokenReservesInTokens = pumpTrade.virtualTokenReserves / 1e6; // Assuming 6 decimals

      if (virtualTokenReservesInTokens > 0) {
        const tokenPriceInSol = virtualSolReservesInSol / virtualTokenReservesInTokens;
        const tokenPriceInUsd = tokenPriceInSol * this.solPriceUsd;

        pumpTrade.newTokenPrice = tokenPriceInUsd;

        const priceUpdate: PumpFunPrice = {
          mint: pumpTrade.mint,
          priceUsd: tokenPriceInUsd,
          priceSol: tokenPriceInSol,
          timestamp: pumpTrade.timestamp,
          source: "pumpportal-ws"
        };

        // Emit price update event
        this.emit("price", priceUpdate);

        logger.debug({
          mint: pumpTrade.mint.slice(0, 8),
          txType: pumpTrade.txType,
          priceUsd: tokenPriceInUsd.toFixed(8)
        }, "PumpPortal trade processed");
      }

      // Emit raw trade event for other listeners
      this.emit("trade", pumpTrade);

    } catch (error) {
      logger.error({ error }, "PumpPortal: Failed to process trade event");
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      subscribedTokens: this.subscribedTokens.size,
      subscribedToNewTokens: this.subscribedToNewTokens
    };
  }

  /**
   * Force reconnect - resets retry counter and attempts fresh connection
   * Useful for recovering from exhausted reconnection attempts
   */
  async forceReconnect(): Promise<void> {
    logger.info("🔄 Force reconnecting PumpPortal WebSocket (resetting retry counter)...");

    // Reset reconnection state
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    this.isReconnecting = false;
    this.shouldReconnect = true;

    // Clean up existing connection
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch (err) {
        logger.warn("Error closing existing WebSocket during force reconnect:", err);
      }
      this.ws = null;
    }

    // Attempt fresh connection
    try {
      await this.connect();
      logger.info("✅ PumpPortal WebSocket force reconnect successful");
    } catch (error) {
      logger.error({ error }, "❌ PumpPortal WebSocket force reconnect failed");
      throw error;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    logger.info("Disconnecting PumpPortal WebSocket");

    this.shouldReconnect = false;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.removeAllListeners();
  }
}
