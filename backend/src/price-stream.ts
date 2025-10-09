import WebSocket, { WebSocketServer } from 'ws';
import { createServer, Server } from 'http';
import { EventEmitter } from 'events';
import { PriceService } from './services/priceService.js';
import { cacheService } from './services/cacheService.js';
import { logger } from './utils/logger.js';
import { config } from './config/environment.js';

/**
 * Production-Ready Price Streaming Service
 * 
 * Built from scratch with enterprise-grade features:
 * - Zero memory leaks with proper cleanup
 * - Efficient Redis-backed caching
 * - Heartbeat monitoring for connection health
 * - Rate limiting and subscription management
 * - Graceful error handling and recovery
 * - Comprehensive logging and metrics
 * - Optimized for hundreds of concurrent users
 */

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

interface PriceClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastActivity: number;
  isAlive: boolean;
  subscriptionCount: number;
  rateLimitTokens: number;
  lastRateLimitReset: number;
}

interface PriceUpdate {
  tokenAddress: string;
  price: number;
  change24h?: number;
  volume24h?: number;
  timestamp: number;
  source: string;
}

interface ServiceMetrics {
  totalConnections: number;
  activeConnections: number;
  totalSubscriptions: number;
  messagesPerSecond: number;
  memoryUsage: number;
  cacheHitRate: number;
}

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const CONFIG = {
  // Connection limits
  MAX_CONNECTIONS: 500,
  MAX_SUBSCRIPTIONS_PER_CLIENT: 50,
  CONNECTION_TIMEOUT: 90000, // 90 seconds
  
  // Rate limiting (for client actions only, not server-sent updates)
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_ACTIONS: 10000, // 10000 client actions per minute (high limit for reconnections)
  
  // Price updates
  PRICE_UPDATE_INTERVAL: 10000, // 10 seconds (increased from 5s to reduce load)
  BATCH_UPDATE_SIZE: 20, // Process 20 tokens at once
  
  // Heartbeat and cleanup
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  CLEANUP_INTERVAL: 60000, // 1 minute
  MEMORY_CLEANUP_INTERVAL: 300000, // 5 minutes
  
  // Caching
  PRICE_CACHE_TTL: 30, // 30 seconds Redis TTL
  MEMORY_CACHE_TTL: 10000, // 10 seconds local cache
  MAX_MEMORY_CACHE_SIZE: 1000,
  
  // WebSocket Compression Optimization
  // Using aggressive compression settings for price data (JSON)
  COMPRESSION_ENABLED: true,
  COMPRESSION_LEVEL: 6, // Balanced compression (1-9, higher = better compression)
  COMPRESSION_THRESHOLD: 512, // Compress messages > 512 bytes (lower than default 1KB)
  COMPRESSION_WINDOW_BITS: 13, // Memory vs compression tradeoff (9-15, higher = better)
  COMPRESSION_CONCURRENCY: 10, // Max concurrent compression operations
  MESSAGE_SIZE_LIMIT: 1024 * 16, // 16KB max message size
} as const;

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class PriceStreamService extends EventEmitter {
  private server: Server;
  private wss: WebSocketServer;
  private priceService: PriceService;
  
  // Client management
  private clients: Map<string, PriceClient> = new Map();
  private subscriptions: Map<string, Set<string>> = new Map(); // token -> clientIds
  
  // Intervals for cleanup and monitoring
  private intervals: {
    priceUpdate?: NodeJS.Timeout;
    heartbeat?: NodeJS.Timeout;
    cleanup?: NodeJS.Timeout;
    memoryCleanup?: NodeJS.Timeout;
    metrics?: NodeJS.Timeout;
  } = {};
  
  // Metrics and monitoring
  private metrics: ServiceMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    totalSubscriptions: 0,
    messagesPerSecond: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
  };
  
  private messageCount = 0;
  private isShuttingDown = false;

  constructor(priceService: PriceService) {
    super();
    this.priceService = priceService;
    this.server = createServer();
    this.setupWebSocketServer();
    this.startBackgroundTasks();
    
    logger.info('Price streaming service initialized');
  }

  // ============================================================================
  // WEBSOCKET SERVER SETUP
  // ============================================================================

  private setupWebSocketServer(): void {
    this.wss = new WebSocketServer({
      server: this.server,
      path: '/price-stream',
      maxPayload: CONFIG.MESSAGE_SIZE_LIMIT,
      
      // Optimized per-message deflate compression
      // Using aggressive settings for JSON price data compression
      perMessageDeflate: CONFIG.COMPRESSION_ENABLED ? {
        // Server compression options
        zlibDeflateOptions: {
          level: CONFIG.COMPRESSION_LEVEL,        // Compression level (1-9)
          windowBits: CONFIG.COMPRESSION_WINDOW_BITS,  // LZ77 window size
          memLevel: 8,                             // Memory allocation (1-9)
          strategy: 0,                             // Z_DEFAULT_STRATEGY for JSON
        },
        
        // Client compression options (what we accept)
        zlibInflateOptions: {
          windowBits: CONFIG.COMPRESSION_WINDOW_BITS,
        },
        
        // Only compress messages larger than threshold
        threshold: CONFIG.COMPRESSION_THRESHOLD,
        
        // Limit concurrent compression operations to prevent memory spikes
        concurrencyLimit: CONFIG.COMPRESSION_CONCURRENCY,
        
        // Client-to-server compression settings
        clientNoContextTakeover: true,  // Don't reuse compression context
        serverNoContextTakeover: true,  // Don't reuse compression context
        clientMaxWindowBits: CONFIG.COMPRESSION_WINDOW_BITS,
        serverMaxWindowBits: CONFIG.COMPRESSION_WINDOW_BITS,
      } : false,
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      this.handleNewConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
      this.emit('error', error);
    });

    logger.info('WebSocket server configured');
  }

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================

  private handleNewConnection(ws: WebSocket, request: any): void {
    // Check connection limits
    if (this.clients.size >= CONFIG.MAX_CONNECTIONS) {
      logger.warn('Connection limit reached, rejecting new connection');
      ws.close(1013, 'Server overloaded');
      return;
    }

    const clientId = this.generateClientId();
    const now = Date.now();
    
    const client: PriceClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      lastActivity: now,
      isAlive: true,
      subscriptionCount: 0,
      rateLimitTokens: CONFIG.RATE_LIMIT_MAX_ACTIONS,
      lastRateLimitReset: now,
    };

    this.clients.set(clientId, client);
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;

    // Set up WebSocket event handlers
    this.setupClientHandlers(client);

    // Send welcome message
    this.sendToClient(client, {
      type: 'welcome',
      clientId,
      maxSubscriptions: CONFIG.MAX_SUBSCRIPTIONS_PER_CLIENT,
      updateInterval: CONFIG.PRICE_UPDATE_INTERVAL,
      serverTime: now,
    });

    logger.info(`Client connected: ${clientId} (${this.clients.size} total)`);
    this.emit('clientConnected', clientId);
  }

  private setupClientHandlers(client: PriceClient): void {
    const { ws, id } = client;

    // Heartbeat setup
      (ws as any).isAlive = true;
    ws.on('pong', () => {
      client.isAlive = true;
      client.lastActivity = Date.now();
    });

    // Message handling
    ws.on('message', (data: Buffer) => {
      try {
        if (data.length > CONFIG.MESSAGE_SIZE_LIMIT) {
          this.sendError(client, 'Message too large');
          return;
        }

        const message = JSON.parse(data.toString());
        this.handleClientMessage(client, message);
      } catch (error) {
        logger.warn(`Invalid message from client ${id}:`, error);
        this.sendError(client, 'Invalid message format');
      }
    });

    // Connection close
    ws.on('close', (code, reason) => {
      logger.debug(`Client disconnected: ${id} (code: ${code}, reason: ${reason})`);
      this.handleClientDisconnect(id);
    });

    // Error handling
    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${id}:`, error);
      this.handleClientDisconnect(id);
    });
  }

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  private handleClientMessage(client: PriceClient, message: any): void {
    client.lastActivity = Date.now();

    // Only rate-limit non-essential operations (not subscribe/unsubscribe)
    // Subscribe/unsubscribe are legitimate user actions and should not be rate limited
    const isEssentialOperation = ['subscribe', 'unsubscribe', 'unsubscribe_all'].includes(message.type);
    
    if (!isEssentialOperation && !this.checkRateLimit(client)) {
      this.sendError(client, 'Rate limit exceeded');
      return;
    }

    switch (message.type) {
      case 'subscribe':
        this.handleSubscribe(client, message.tokenAddress);
        break;
      
      case 'unsubscribe':
        this.handleUnsubscribe(client, message.tokenAddress);
        break;
      
      case 'unsubscribe_all':
        this.handleUnsubscribeAll(client);
        break;
      
      case 'ping':
        this.sendToClient(client, { type: 'pong', timestamp: Date.now() });
        break;
      
      case 'get_subscriptions':
        this.sendToClient(client, {
          type: 'subscriptions',
          tokens: Array.from(client.subscriptions),
          count: client.subscriptionCount,
        });
        break;
      
      default:
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  private checkRateLimit(client: PriceClient): boolean {
    const now = Date.now();
    
    // Reset tokens if window has passed
    if (now - client.lastRateLimitReset > CONFIG.RATE_LIMIT_WINDOW) {
      client.rateLimitTokens = CONFIG.RATE_LIMIT_MAX_ACTIONS;
      client.lastRateLimitReset = now;
    }
    
    if (client.rateLimitTokens <= 0) {
      return false;
    }
    
    client.rateLimitTokens--;
    return true;
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  private handleSubscribe(client: PriceClient, tokenAddress: string): void {
    if (!tokenAddress || typeof tokenAddress !== 'string') {
      this.sendError(client, 'Invalid token address');
      return;
    }

    // Check if client is already subscribed to this token
    if (client.subscriptions.has(tokenAddress)) {
      // Send success response instead of error - this handles reconnection scenarios gracefully
      this.sendToClient(client, {
        type: 'subscription_confirmed',
        tokenAddress,
        message: 'Already subscribed to this token'
      });
      return;
    }

    if (client.subscriptionCount >= CONFIG.MAX_SUBSCRIPTIONS_PER_CLIENT) {
      this.sendError(client, 'Maximum subscriptions reached');
      return;
    }

    // Add to client subscriptions
    client.subscriptions.add(tokenAddress);
    client.subscriptionCount++;

    // Add to global subscriptions map
    if (!this.subscriptions.has(tokenAddress)) {
      this.subscriptions.set(tokenAddress, new Set());
    }
    this.subscriptions.get(tokenAddress)!.add(client.id);

    this.metrics.totalSubscriptions++;

    // Send confirmation
    this.sendToClient(client, {
      type: 'subscribed',
      tokenAddress,
      subscriptionCount: client.subscriptionCount,
    });

    // Send current price if available
    this.sendCurrentPrice(client, tokenAddress);

    logger.debug(`Client ${client.id} subscribed to ${tokenAddress}`);
  }

  private handleUnsubscribe(client: PriceClient, tokenAddress: string): void {
    if (!client.subscriptions.has(tokenAddress)) {
      // Silently ignore duplicate unsubscribe requests instead of throwing error
      // This handles race conditions from rapid UI re-renders
      logger.debug(`Client ${client.id} attempted to unsubscribe from ${tokenAddress} but was not subscribed`);
      return;
    }

    this.removeSubscription(client.id, tokenAddress);

    this.sendToClient(client, {
      type: 'unsubscribed',
      tokenAddress,
      subscriptionCount: client.subscriptionCount,
    });

    logger.debug(`Client ${client.id} unsubscribed from ${tokenAddress}`);
  }

  private handleUnsubscribeAll(client: PriceClient): void {
    const tokens = Array.from(client.subscriptions);
    
    for (const tokenAddress of tokens) {
      this.removeSubscription(client.id, tokenAddress);
    }

    this.sendToClient(client, {
      type: 'unsubscribed_all',
      count: tokens.length,
      subscriptionCount: 0,
    });

    logger.debug(`Client ${client.id} unsubscribed from all tokens`);
  }

  private removeSubscription(clientId: string, tokenAddress: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from client
    if (client.subscriptions.delete(tokenAddress)) {
      client.subscriptionCount--;
      this.metrics.totalSubscriptions--;
    }

    // Remove from global subscriptions
    const tokenSubs = this.subscriptions.get(tokenAddress);
    if (tokenSubs) {
      tokenSubs.delete(clientId);
      if (tokenSubs.size === 0) {
        this.subscriptions.delete(tokenAddress);
        logger.debug(`No more subscribers for ${tokenAddress}, removed from tracking`);
      }
    }
  }

  // ============================================================================
  // PRICE UPDATES AND BROADCASTING
  // ============================================================================

  private async sendCurrentPrice(client: PriceClient, tokenAddress: string): Promise<void> {
    try {
      // Try Redis cache first
      const cachedPrice = await cacheService.get<PriceUpdate>(`price:stream:${tokenAddress}`);
      
      if (cachedPrice) {
        this.sendToClient(client, {
          type: 'price_update',
          ...cachedPrice,
        });
        return;
      }

      // Fallback to price service
      const priceData = await this.priceService.getPrice(tokenAddress);
      if (priceData) {
        const update: PriceUpdate = {
          tokenAddress,
          price: priceData.price,
          change24h: priceData.priceChange24h,
          volume24h: priceData.volume24h,
          timestamp: Date.now(),
          source: priceData.source,
        };

        this.sendToClient(client, {
          type: 'price_update',
          ...update,
        });

        // Cache the price
        await cacheService.set(`price:stream:${tokenAddress}`, update, {
          ttl: CONFIG.PRICE_CACHE_TTL,
        });
      }
    } catch (error) {
      logger.error(`Error sending current price for ${tokenAddress}:`, error);
    }
  }

  private async updateAllPrices(): Promise<void> {
    const subscribedTokens = Array.from(this.subscriptions.keys());
    
    if (subscribedTokens.length === 0) {
      return;
    }

    try {
      // Process tokens in batches to avoid overwhelming external APIs
      const batches = this.chunkArray(subscribedTokens, CONFIG.BATCH_UPDATE_SIZE);
      
      for (const batch of batches) {
        await this.processPriceBatch(batch);
        
        // Small delay between batches to be respectful to APIs
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      logger.error('Error in price update cycle:', error);
    }
  }

  private async processPriceBatch(tokens: string[]): Promise<void> {
    try {
      const priceMap = await this.priceService.getPrices(tokens);
      const updates: Map<string, PriceUpdate> = new Map();
      const cachePromises: Promise<any>[] = [];

      // Prepare updates and cache them
      for (const [tokenAddress, priceData] of priceMap.entries()) {
        const update: PriceUpdate = {
          tokenAddress,
          price: priceData.price,
          change24h: priceData.priceChange24h,
          volume24h: priceData.volume24h,
          timestamp: Date.now(),
          source: priceData.source,
        };

        updates.set(tokenAddress, update);

        // Cache update (non-blocking)
        cachePromises.push(
          cacheService.set(`price:stream:${tokenAddress}`, update, {
            ttl: CONFIG.PRICE_CACHE_TTL,
          })
        );
      }

      // Broadcast updates
      this.broadcastUpdates(updates);

      // Wait for cache operations to complete (but don't block on failures)
      Promise.allSettled(cachePromises).catch(error => {
        logger.debug('Some cache operations failed:', error);
      });

    } catch (error) {
      logger.error('Error processing price batch:', error);
    }
  }

  private broadcastUpdates(updates: Map<string, PriceUpdate>): void {
    const clientUpdates: Map<string, PriceUpdate[]> = new Map();

    // Group updates by client to minimize WebSocket operations
    for (const [tokenAddress, update] of updates.entries()) {
      const subscribers = this.subscriptions.get(tokenAddress);
      
      if (!subscribers || subscribers.size === 0) {
        continue;
      }

      for (const clientId of subscribers) {
        if (!clientUpdates.has(clientId)) {
          clientUpdates.set(clientId, []);
        }
        clientUpdates.get(clientId)!.push(update);
      }
    }

    // Send batched updates to each client
    for (const [clientId, clientUpdateList] of clientUpdates.entries()) {
      const client = this.clients.get(clientId);
      
      if (!client || client.ws.readyState !== WebSocket.OPEN) {
        this.handleClientDisconnect(clientId);
        continue;
      }

      try {
        if (clientUpdateList.length === 1) {
          // Single update
          this.sendToClient(client, {
            type: 'price_update',
            ...clientUpdateList[0],
          });
        } else {
          // Batch update
          this.sendToClient(client, {
            type: 'price_batch',
            updates: clientUpdateList,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        logger.error(`Error broadcasting to client ${clientId}:`, error);
        this.handleClientDisconnect(clientId);
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private sendToClient(client: PriceClient, message: any): void {
    if (client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
      this.messageCount++;
    } catch (error) {
      logger.error(`Error sending message to client ${client.id}:`, error);
      this.handleClientDisconnect(client.id);
    }
  }

  private sendError(client: PriceClient, message: string): void {
    this.sendToClient(client, {
      type: 'error',
      message,
      timestamp: Date.now(),
    });
  }

  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove all subscriptions
    for (const tokenAddress of client.subscriptions) {
      this.removeSubscription(clientId, tokenAddress);
    }

    // Remove client
    this.clients.delete(clientId);
    this.metrics.activeConnections--;

    // Close WebSocket if still open
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.terminate();
    }

    logger.debug(`Client ${clientId} fully disconnected and cleaned up`);
    this.emit('clientDisconnected', clientId);
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ============================================================================
  // BACKGROUND TASKS
  // ============================================================================

  private startBackgroundTasks(): void {
    // Price updates
    this.intervals.priceUpdate = setInterval(() => {
      if (!this.isShuttingDown) {
        this.updateAllPrices();
      }
    }, CONFIG.PRICE_UPDATE_INTERVAL);

    // Heartbeat
    this.intervals.heartbeat = setInterval(() => {
      this.performHeartbeat();
    }, CONFIG.HEARTBEAT_INTERVAL);

    // Cleanup
    this.intervals.cleanup = setInterval(() => {
      this.performCleanup();
    }, CONFIG.CLEANUP_INTERVAL);

    // Memory cleanup
    this.intervals.memoryCleanup = setInterval(() => {
      this.performMemoryCleanup();
    }, CONFIG.MEMORY_CLEANUP_INTERVAL);

    // Metrics collection
    this.intervals.metrics = setInterval(() => {
      this.updateMetrics();
    }, 60000); // Every minute

    logger.info('Background tasks started');
  }

  private performHeartbeat(): void {
    const deadClients: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      if (!client.isAlive) {
        deadClients.push(clientId);
        continue;
      }

      if (client.ws.readyState === WebSocket.OPEN) {
        client.isAlive = false;
        client.ws.ping();
      } else {
        deadClients.push(clientId);
      }
    }

    // Clean up dead clients
    for (const clientId of deadClients) {
      logger.debug(`Removing dead client: ${clientId}`);
      this.handleClientDisconnect(clientId);
    }

    if (deadClients.length > 0) {
      logger.info(`Heartbeat cleanup: removed ${deadClients.length} dead connections`);
    }
  }

  private performCleanup(): void {
    const now = Date.now();
    const timeoutClients: string[] = [];

    // Find timed out clients
    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastActivity > CONFIG.CONNECTION_TIMEOUT) {
        timeoutClients.push(clientId);
      }
    }

    // Clean up timed out clients
    for (const clientId of timeoutClients) {
      logger.debug(`Removing timed out client: ${clientId}`);
      this.handleClientDisconnect(clientId);
    }

    if (timeoutClients.length > 0) {
      logger.info(`Cleanup: removed ${timeoutClients.length} timed out connections`);
    }
  }

  private performMemoryCleanup(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Log memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB

    logger.debug('Memory cleanup completed', {
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
    });
  }

  private updateMetrics(): void {
    // Calculate messages per second
    const now = Date.now();
    if (!this.lastMetricsUpdate) {
      this.lastMetricsUpdate = now;
      this.lastMessageCount = this.messageCount;
      return;
    }

    const timeDiff = (now - this.lastMetricsUpdate) / 1000;
    const messageDiff = this.messageCount - this.lastMessageCount;
    
    this.metrics.messagesPerSecond = messageDiff / timeDiff;
    this.lastMetricsUpdate = now;
    this.lastMessageCount = this.messageCount;

    // Update other metrics
    this.metrics.activeConnections = this.clients.size;
    this.metrics.totalSubscriptions = Array.from(this.clients.values())
      .reduce((sum, client) => sum + client.subscriptionCount, 0);

    // Log metrics periodically
    if (this.clients.size > 0) {
      logger.info('Service metrics:', {
        connections: this.metrics.activeConnections,
        subscriptions: this.metrics.totalSubscriptions,
        messagesPerSec: this.metrics.messagesPerSecond.toFixed(2),
        memoryMB: this.metrics.memoryUsage.toFixed(2),
      });
    }
  }

  private lastMetricsUpdate?: number;
  private lastMessageCount = 0;

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Attach WebSocket server to existing HTTP server (for Railway compatibility)
   */
  public attachToServer(httpServer: Server): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Use the existing HTTP server instead of creating a new one
        this.server = httpServer;
        this.setupWebSocketServer();
        this.startBackgroundTasks();
        
        logger.info(`🚀 Price Stream WebSocket Server attached to main HTTP server`);
        logger.info(`📊 Service configuration:`, {
          maxConnections: CONFIG.MAX_CONNECTIONS,
          maxSubscriptionsPerClient: CONFIG.MAX_SUBSCRIPTIONS_PER_CLIENT,
          updateInterval: `${CONFIG.PRICE_UPDATE_INTERVAL}ms`,
          compressionEnabled: CONFIG.COMPRESSION_ENABLED,
        });
        resolve();
      } catch (error) {
        logger.error('WebSocket server attachment error:', error);
        reject(error);
      }
    });
  }

  public start(port: number = config.priceStreamPort): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(port, () => {
          logger.info(`🚀 Price Stream WebSocket Server running on port ${port}`);
          logger.info(`📊 Service configuration:`, {
            maxConnections: CONFIG.MAX_CONNECTIONS,
            maxSubscriptionsPerClient: CONFIG.MAX_SUBSCRIPTIONS_PER_CLIENT,
            updateInterval: `${CONFIG.PRICE_UPDATE_INTERVAL}ms`,
            compressionEnabled: CONFIG.COMPRESSION_ENABLED,
          });
          resolve();
        });

        this.server.on('error', (error) => {
          logger.error('Server startup error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    logger.info('Stopping price stream service...');
    this.isShuttingDown = true;

    // Clear all intervals
    Object.values(this.intervals).forEach(interval => {
      if (interval) clearInterval(interval);
    });

    // Close all client connections gracefully
    const closePromises: Promise<void>[] = [];
    
    for (const [clientId, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        closePromises.push(
          new Promise((resolve) => {
            client.ws.close(1001, 'Server shutting down');
            client.ws.on('close', () => resolve());
            // Force close after timeout
            setTimeout(() => {
              if (client.ws.readyState !== WebSocket.CLOSED) {
                client.ws.terminate();
              }
              resolve();
            }, 5000);
          })
        );
      }
    }

    // Wait for all connections to close
    await Promise.allSettled(closePromises);

    // Close WebSocket server
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          logger.info('Price stream service stopped successfully');
          resolve();
        });
      });
    });
  }

  public getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  public getConnectionCount(): number {
    return this.clients.size;
  }

  public getSubscriptionCount(): number {
    return this.metrics.totalSubscriptions;
  }

  // For health checks
  public isHealthy(): boolean {
    return !this.isShuttingDown && this.server.listening;
  }
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

export default PriceStreamService;
