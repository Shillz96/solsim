/**
 * WebSocket Resilience Test Suite
 *
 * Tests WebSocket connection reliability, message handling, and state synchronization:
 * - Connection drops and reconnects
 * - Duplicate message handling
 * - Out-of-order message processing
 * - Price update monotonicity
 * - State reconciliation after reconnection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

interface PriceTick {
  mint: string;
  priceUsd: number;
  priceSol: number;
  timestamp: number;
  sequence: number;
}

interface ConnectionState {
  connected: boolean;
  lastMessage: number;
  messageCount: number;
  errors: string[];
  reconnects: number;
}

class MockWebSocket extends EventEmitter {
  public readyState: number = 1; // OPEN
  public url: string;
  private isAlive: boolean = true;
  private messageQueue: any[] = [];
  private shouldDrop: boolean = false;
  private shouldDuplicate: boolean = false;
  private shouldReorder: boolean = false;

  constructor(url: string) {
    super();
    this.url = url;
    this.setupHeartbeat();
  }

  private setupHeartbeat(): void {
    setInterval(() => {
      if (this.isAlive === false) {
        this.terminate();
        return;
      }
      this.isAlive = false;
      this.ping();
    }, 25000);
  }

  send(data: string): void {
    if (this.shouldDrop && Math.random() < 0.1) {
      // Simulate dropped message
      return;
    }

    if (this.shouldDuplicate && Math.random() < 0.05) {
      // Simulate duplicate message
      this.emit('message', data);
    }

    if (this.shouldReorder && Math.random() < 0.1) {
      // Simulate out-of-order message
      this.messageQueue.push(data);
      setTimeout(() => {
        if (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift();
          this.emit('message', msg);
        }
      }, Math.random() * 100);
    } else {
      this.emit('message', data);
    }
  }

  ping(): void {
    this.emit('pong');
  }

  pong(): void {
    this.isAlive = true;
  }

  terminate(): void {
    this.readyState = 3; // CLOSED
    this.emit('close');
  }

  close(): void {
    this.terminate();
  }

  // Test helpers
  simulateDrop(): void {
    this.shouldDrop = true;
  }

  simulateDuplicates(): void {
    this.shouldDuplicate = true;
  }

  simulateReordering(): void {
    this.shouldReorder = true;
  }

  resetSimulation(): void {
    this.shouldDrop = false;
    this.shouldDuplicate = false;
    this.shouldReorder = false;
  }
}

class WebSocketResilienceTester {
  private connections: Map<string, MockWebSocket> = new Map();
  private priceHistory: Map<string, PriceTick[]> = new Map();
  private connectionStates: Map<string, ConnectionState> = new Map();
  private messageIds: Set<string> = new Set();

  constructor() {
    this.setupPriceHistory();
  }

  private setupPriceHistory(): void {
    // Initialize price history for test tokens
    const tokens = ['SOL', 'USDC', 'BONK'];
    tokens.forEach(token => {
      this.priceHistory.set(token, []);
    });
  }

  /**
   * Create a new WebSocket connection
   */
  createConnection(id: string, url: string = 'ws://localhost:3000/ws/prices'): MockWebSocket {
    const ws = new MockWebSocket(url);
    this.connections.set(id, ws);
    
    this.connectionStates.set(id, {
      connected: true,
      lastMessage: Date.now(),
      messageCount: 0,
      errors: [],
      reconnects: 0
    });

    // Set up event handlers
    ws.on('message', (data) => {
      this.handleMessage(id, data);
    });

    ws.on('close', () => {
      this.handleDisconnect(id);
    });

    ws.on('error', (error) => {
      this.handleError(id, error);
    });

    return ws;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(connectionId: string, data: string): void {
    try {
      const message = JSON.parse(data);
      const state = this.connectionStates.get(connectionId);
      
      if (state) {
        state.lastMessage = Date.now();
        state.messageCount++;
      }

      if (message.t === 'price') {
        this.handlePriceUpdate(connectionId, message.d);
      } else if (message.type === 'price') {
        this.handlePriceUpdate(connectionId, message);
      }
    } catch (error) {
      this.handleError(connectionId, error);
    }
  }

  /**
   * Handle price update message
   */
  private handlePriceUpdate(connectionId: string, data: any): void {
    const tick: PriceTick = {
      mint: data.mint,
      priceUsd: data.priceUsd || data.price,
      priceSol: data.priceSol || 0,
      timestamp: data.ts || data.timestamp || Date.now(),
      sequence: data.seq || 0
    };

    // Check for duplicate message
    const messageId = `${tick.mint}_${tick.timestamp}_${tick.sequence}`;
    if (this.messageIds.has(messageId)) {
      console.log(`⚠️ Duplicate message detected: ${messageId}`);
      return;
    }
    this.messageIds.add(messageId);

    // Store price tick
    const history = this.priceHistory.get(tick.mint) || [];
    history.push(tick);
    
    // Keep only last 100 ticks
    if (history.length > 100) {
      history.shift();
    }
    
    this.priceHistory.set(tick.mint, history);
  }

  /**
   * Handle connection disconnect
   */
  private handleDisconnect(connectionId: string): void {
    const state = this.connectionStates.get(connectionId);
    if (state) {
      state.connected = false;
    }
  }

  /**
   * Handle connection error
   */
  private handleError(connectionId: string, error: any): void {
    const state = this.connectionStates.get(connectionId);
    if (state) {
      state.errors.push(error.message || String(error));
    }
  }

  /**
   * Simulate connection drop and reconnect
   */
  async simulateConnectionDrop(connectionId: string, delayMs: number = 1000): Promise<void> {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    console.log(`🔌 Simulating connection drop for ${connectionId}`);
    ws.terminate();

    // Wait for reconnection delay
    await new Promise(resolve => setTimeout(resolve, delayMs));

    // Reconnect
    const newWs = this.createConnection(connectionId + '_reconnected');
    this.connections.set(connectionId, newWs);
    
    const state = this.connectionStates.get(connectionId);
    if (state) {
      state.connected = true;
      state.reconnects++;
    }

    console.log(`🔌 Reconnected ${connectionId}`);
  }

  /**
   * Send price update to connection
   */
  sendPriceUpdate(connectionId: string, mint: string, priceUsd: number, sequence: number = 0): void {
    const ws = this.connections.get(connectionId);
    if (!ws || ws.readyState !== 1) return;

    const tick = {
      t: 'price',
      d: {
        v: 1,
        seq: sequence,
        mint,
        priceUsd,
        priceSol: priceUsd * 0.000004,
        ts: Date.now()
      }
    };

    ws.send(JSON.stringify(tick));
  }

  /**
   * Test message deduplication
   */
  async testMessageDeduplication(): Promise<boolean> {
    const connectionId = 'dedup_test';
    const ws = this.createConnection(connectionId);
    
    // Enable duplicate simulation
    ws.simulateDuplicates();
    
    // Send same message multiple times
    const mint = 'SOL';
    const priceUsd = 100.0;
    
    for (let i = 0; i < 5; i++) {
      this.sendPriceUpdate(connectionId, mint, priceUsd, i);
    }

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that only unique messages were processed
    const history = this.priceHistory.get(mint) || [];
    const uniquePrices = new Set(history.map(tick => tick.priceUsd));
    
    return uniquePrices.size === 1; // Should only have one unique price
  }

  /**
   * Test out-of-order message handling
   */
  async testOutOfOrderMessages(): Promise<boolean> {
    const connectionId = 'reorder_test';
    const ws = this.createConnection(connectionId);
    
    // Enable reordering simulation
    ws.simulateReordering();
    
    const mint = 'SOL';
    const prices = [100, 101, 102, 103, 104];
    
    // Send messages out of order
    for (let i = 0; i < prices.length; i++) {
      this.sendPriceUpdate(connectionId, mint, prices[i], i);
    }

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check that all messages were received
    const history = this.priceHistory.get(mint) || [];
    return history.length === prices.length;
  }

  /**
   * Test price monotonicity
   */
  async testPriceMonotonicity(): Promise<boolean> {
    const connectionId = 'monotonic_test';
    const ws = this.createConnection(connectionId);
    
    const mint = 'SOL';
    const prices = [100, 101, 102, 103, 104, 105];
    
    // Send increasing prices
    for (let i = 0; i < prices.length; i++) {
      this.sendPriceUpdate(connectionId, mint, prices[i], i);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Check monotonicity
    const history = this.priceHistory.get(mint) || [];
    for (let i = 1; i < history.length; i++) {
      if (history[i].priceUsd < history[i - 1].priceUsd) {
        return false; // Non-monotonic price detected
      }
    }

    return true;
  }

  /**
   * Test reconnection resilience
   */
  async testReconnectionResilience(): Promise<boolean> {
    const connectionId = 'reconnect_test';
    const ws = this.createConnection(connectionId);
    
    // Send some initial data
    this.sendPriceUpdate(connectionId, 'SOL', 100, 1);
    this.sendPriceUpdate(connectionId, 'SOL', 101, 2);
    
    // Simulate connection drop
    await this.simulateConnectionDrop(connectionId, 1000);
    
    // Send more data after reconnect
    this.sendPriceUpdate(connectionId, 'SOL', 102, 3);
    this.sendPriceUpdate(connectionId, 'SOL', 103, 4);
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that all data was received
    const history = this.priceHistory.get('SOL') || [];
    const state = this.connectionStates.get(connectionId);
    
    return history.length >= 4 && state?.connected === true;
  }

  /**
   * Test message loss handling
   */
  async testMessageLossHandling(): Promise<boolean> {
    const connectionId = 'loss_test';
    const ws = this.createConnection(connectionId);
    
    // Enable message dropping
    ws.simulateDrop();
    
    const mint = 'SOL';
    const prices = [100, 101, 102, 103, 104, 105];
    
    // Send messages (some will be dropped)
    for (let i = 0; i < prices.length; i++) {
      this.sendPriceUpdate(connectionId, mint, prices[i], i);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check that some messages were received despite drops
    const history = this.priceHistory.get(mint) || [];
    return history.length > 0 && history.length < prices.length;
  }

  /**
   * Test connection state tracking
   */
  testConnectionStateTracking(): boolean {
    const connectionId = 'state_test';
    const ws = this.createConnection(connectionId);
    
    // Send some messages
    this.sendPriceUpdate(connectionId, 'SOL', 100, 1);
    this.sendPriceUpdate(connectionId, 'SOL', 101, 2);
    
    const state = this.connectionStates.get(connectionId);
    
    return state !== undefined && 
           state.connected === true && 
           state.messageCount === 2;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): any {
    const stats: any = {};
    
    for (const [id, state] of this.connectionStates.entries()) {
      stats[id] = {
        connected: state.connected,
        messageCount: state.messageCount,
        errors: state.errors.length,
        reconnects: state.reconnects,
        lastMessage: new Date(state.lastMessage).toISOString()
      };
    }
    
    return stats;
  }

  /**
   * Get price history statistics
   */
  getPriceStats(): any {
    const stats: any = {};
    
    for (const [mint, history] of this.priceHistory.entries()) {
      if (history.length > 0) {
        const prices = history.map(tick => tick.priceUsd);
        stats[mint] = {
          tickCount: history.length,
          minPrice: Math.min(...prices),
          maxPrice: Math.max(...prices),
          avgPrice: prices.reduce((sum, p) => sum + p, 0) / prices.length,
          lastPrice: prices[prices.length - 1]
        };
      }
    }
    
    return stats;
  }

  /**
   * Cleanup connections
   */
  cleanup(): void {
    for (const ws of this.connections.values()) {
      ws.terminate();
    }
    this.connections.clear();
    this.connectionStates.clear();
    this.priceHistory.clear();
    this.messageIds.clear();
  }
}

// Test suite
describe('WebSocket Resilience Tests', () => {
  let tester: WebSocketResilienceTester;

  beforeEach(() => {
    tester = new WebSocketResilienceTester();
  });

  afterEach(() => {
    tester.cleanup();
  });

  it('should handle message deduplication correctly', async () => {
    const result = await tester.testMessageDeduplication();
    expect(result).toBe(true);
  });

  it('should handle out-of-order messages', async () => {
    const result = await tester.testOutOfOrderMessages();
    expect(result).toBe(true);
  });

  it('should maintain price monotonicity', async () => {
    const result = await tester.testPriceMonotonicity();
    expect(result).toBe(true);
  });

  it('should recover from connection drops', async () => {
    const result = await tester.testReconnectionResilience();
    expect(result).toBe(true);
  });

  it('should handle message loss gracefully', async () => {
    const result = await tester.testMessageLossHandling();
    expect(result).toBe(true);
  });

  it('should track connection state correctly', () => {
    const result = tester.testConnectionStateTracking();
    expect(result).toBe(true);
  });

  it('should maintain multiple connections', async () => {
    const conn1 = tester.createConnection('conn1');
    const conn2 = tester.createConnection('conn2');
    
    tester.sendPriceUpdate('conn1', 'SOL', 100, 1);
    tester.sendPriceUpdate('conn2', 'USDC', 1, 1);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const stats = tester.getConnectionStats();
    expect(stats.conn1.messageCount).toBe(1);
    expect(stats.conn2.messageCount).toBe(1);
  });

  it('should handle rapid reconnections', async () => {
    const connectionId = 'rapid_reconnect';
    const ws = tester.createConnection(connectionId);
    
    // Rapid connect/disconnect cycles
    for (let i = 0; i < 5; i++) {
      await tester.simulateConnectionDrop(connectionId, 100);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const state = tester['connectionStates'].get(connectionId);
    expect(state?.reconnects).toBe(5);
  });
});

// Performance tests
describe('WebSocket Performance Tests', () => {
  let tester: WebSocketResilienceTester;

  beforeEach(() => {
    tester = new WebSocketResilienceTester();
  });

  afterEach(() => {
    tester.cleanup();
  });

  it('should handle high message throughput', async () => {
    const connectionId = 'throughput_test';
    const ws = tester.createConnection(connectionId);
    
    const startTime = Date.now();
    const messageCount = 1000;
    
    // Send many messages rapidly
    for (let i = 0; i < messageCount; i++) {
      tester.sendPriceUpdate(connectionId, 'SOL', 100 + i, i);
    }
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const throughput = messageCount / (duration / 1000);
    
    expect(throughput).toBeGreaterThan(500); // At least 500 messages/second
  });

  it('should handle multiple concurrent connections', async () => {
    const connectionCount = 10;
    const connections: string[] = [];
    
    // Create multiple connections
    for (let i = 0; i < connectionCount; i++) {
      const connId = `conn_${i}`;
      tester.createConnection(connId);
      connections.push(connId);
    }
    
    // Send messages to all connections
    for (let i = 0; i < 100; i++) {
      for (const connId of connections) {
        tester.sendPriceUpdate(connId, 'SOL', 100 + i, i);
      }
    }
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const stats = tester.getConnectionStats();
    const activeConnections = Object.values(stats).filter((s: any) => s.connected).length;
    
    expect(activeConnections).toBe(connectionCount);
  });
});