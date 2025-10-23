/**
 * PumpPortal WebSocket Stream Service
 *
 * Connects to PumpPortal's WebSocket API to stream real-time token events:
 * - subscribeNewToken: Newly created bonded tokens
 * - subscribeMigration: Tokens migrating from bonding curve to AMM
 *
 * Important: PumpPortal requires reusing a single WebSocket connection.
 * Do not open multiple connections.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface NewTokenEvent {
  type: 'newToken';
  token: {
    mint: string;
    name?: string;
    symbol?: string;
    uri?: string; // Metadata URI
    creator?: string;
    bondingCurve?: string;
  };
  timestamp: number;
}

export interface MigrationEvent {
  type: 'migration';
  mint: string;
  data: {
    poolAddress?: string;
    poolType?: 'pumpswap' | 'raydium';
    status?: 'initiated' | 'completed';
  };
  timestamp: number;
}

export type PumpPortalEvent = NewTokenEvent | MigrationEvent;

class PumpPortalStreamService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 60000; // Max 1 minute
  private isConnecting = false;
  private shouldReconnect = true;
  private wsUrl: string;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;

  constructor() {
    super();
    // Add API key to URL if available for PumpSwap stream access
    const apiKey = process.env.PUMPPORTAL_API_KEY;
    this.wsUrl = apiKey
      ? `wss://pumpportal.fun/api/data?api-key=${apiKey}`
      : 'wss://pumpportal.fun/api/data';
  }

  /**
   * Start the WebSocket connection and subscribe to events
   */
  async start(): Promise<void> {
    console.log('[PumpPortal] Starting stream service...');
    this.shouldReconnect = true;
    await this.connect();
  }

  /**
   * Stop the WebSocket connection
   */
  stop(): void {
    console.log('[PumpPortal] Stopping stream service...');
    this.shouldReconnect = false;
    this.cleanup();
  }

  /**
   * Establish WebSocket connection
   */
  private async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;

    try {
      console.log('[PumpPortal] Connecting to WebSocket...');
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on('open', () => this.onOpen());
      this.ws.on('message', (data) => this.onMessage(data));
      this.ws.on('error', (error) => this.onError(error));
      this.ws.on('close', (code, reason) => this.onClose(code, reason));
      this.ws.on('pong', () => this.onPong());
    } catch (error) {
      console.error('[PumpPortal] Connection error:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private onOpen(): void {
    console.log('[PumpPortal] WebSocket connected successfully');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;

    // Subscribe to token events
    this.subscribe();

    // Start keepalive ping
    this.startPingInterval();

    this.emit('connected');
  }

  /**
   * Subscribe to PumpPortal events
   */
  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[PumpPortal] Cannot subscribe: WebSocket not open');
      return;
    }

    console.log('[PumpPortal] Subscribing to events...');

    // Subscribe to new token events (bonded tokens)
    this.ws.send(
      JSON.stringify({
        method: 'subscribeNewToken',
      })
    );

    // Subscribe to migration events (graduating → new)
    this.ws.send(
      JSON.stringify({
        method: 'subscribeMigration',
      })
    );

    console.log('[PumpPortal] Subscribed to newToken and migration events');
  }

  /**
   * Handle incoming WebSocket messages
   */
  private onMessage(data: WebSocket.Data): void {
    try {
      const raw = data.toString();
      const message = JSON.parse(raw);

      // Handle new token events
      if (message.type === 'newToken') {
        const event: NewTokenEvent = {
          type: 'newToken',
          token: {
            mint: message.mint || message.token?.mint,
            name: message.name || message.token?.name,
            symbol: message.symbol || message.token?.symbol,
            uri: message.uri || message.token?.uri,
            creator: message.creator || message.token?.creator,
            bondingCurve: message.bondingCurve || message.token?.bondingCurve,
          },
          timestamp: message.timestamp || Date.now(),
        };

        console.log('[PumpPortal] New token:', event.token.mint, event.token.symbol);
        this.emit('newToken', event);
      }

      // Handle migration events
      else if (message.type === 'migration') {
        const event: MigrationEvent = {
          type: 'migration',
          mint: message.mint,
          data: {
            poolAddress: message.poolAddress || message.data?.poolAddress,
            poolType: message.poolType || message.data?.poolType,
            status: message.status || message.data?.status || 'completed',
          },
          timestamp: message.timestamp || Date.now(),
        };

        console.log('[PumpPortal] Migration event:', event.mint, event.data.status);
        this.emit('migration', event);
      }
    } catch (error) {
      console.error('[PumpPortal] Error parsing message:', error);
    }
  }

  /**
   * Handle WebSocket errors
   */
  private onError(error: Error): void {
    console.error('[PumpPortal] WebSocket error:', error);
    this.emit('error', error);
  }

  /**
   * Handle WebSocket close event
   */
  private onClose(code: number, reason: Buffer): void {
    const reasonStr = reason.toString();
    console.log(`[PumpPortal] WebSocket closed: code=${code}, reason=${reasonStr}`);

    this.cleanup();
    this.emit('disconnected', { code, reason: reasonStr });

    if (this.shouldReconnect) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle pong response
   */
  private onPong(): void {
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPingInterval(): void {
    this.stopPingInterval();

    // Send ping every 30 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();

        // Set timeout for pong response (10 seconds)
        this.pongTimeout = setTimeout(() => {
          console.warn('[PumpPortal] Pong timeout - reconnecting...');
          this.ws?.terminate();
        }, 10000);
      }
    }, 30000);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[PumpPortal] Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);

    console.log(`[PumpPortal] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopPingInterval();

    if (this.ws) {
      this.ws.removeAllListeners();
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.isConnecting = false;
  }

  /**
   * Get current connection status
   */
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
export const pumpPortalStreamService = new PumpPortalStreamService();
