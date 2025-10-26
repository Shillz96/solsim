/**
 * PumpPortal Replay Test Harness
 * 
 * Replays curated token events (launch/bonding/volume spikes) into the local app
 * via mocks or recorded fixtures to test real-world scenarios.
 */

import { EventEmitter } from 'events';
import { Decimal } from '@prisma/client/runtime/library';

// Mock data for testing
const MOCK_TOKEN_EVENTS = [
  {
    type: 'newToken',
    data: {
      mint: 'So11111111111111111111111111111111111111112', // SOL
      name: 'Wrapped SOL',
      symbol: 'SOL',
      decimals: 9,
      bondingCurve: {
        virtualSolReserves: 30000,
        virtualTokenReserves: 1000000000,
        realSolReserves: 30000,
        realTokenReserves: 1000000000
      },
      timestamp: Date.now()
    }
  },
  {
    type: 'swap',
    data: {
      signature: 'mock_signature_1',
      mint: 'So11111111111111111111111111111111111111112',
      traderPublicKey: 'mock_trader_1',
      txType: 'buy',
      tokenAmount: 1000000,
      solAmount: 0.1,
      timestamp: Date.now() - 1000,
      virtualSolReserves: 30000.1,
      virtualTokenReserves: 999000000,
      newTokenPrice: 0.0000003
    }
  },
  {
    type: 'swap',
    data: {
      signature: 'mock_signature_2',
      mint: 'So11111111111111111111111111111111111111112',
      traderPublicKey: 'mock_trader_2',
      txType: 'sell',
      tokenAmount: 500000,
      solAmount: 0.05,
      timestamp: Date.now() - 500,
      virtualSolReserves: 30000.05,
      virtualTokenReserves: 999500000,
      newTokenPrice: 0.000000299
    }
  }
];

const MOCK_PUMP_FUN_TOKENS = [
  {
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    bondingCurve: {
      virtualSolReserves: 50000,
      virtualTokenReserves: 1000000000000,
      realSolReserves: 50000,
      realTokenReserves: 1000000000000
    },
    priceUsd: 1.0,
    priceSol: 0.000004,
    marketCapUsd: 1000000,
    volume24h: 50000,
    change24h: 0.5
  }
];

export class PumpPortalReplayService extends EventEmitter {
  private isReplaying = false;
  private replaySpeed = 1.0; // 1x real-time
  private eventIndex = 0;

  constructor() {
    super();
  }

  /**
   * Start replaying events at specified speed
   */
  async startReplay(speed: number = 1.0): Promise<void> {
    this.isReplaying = true;
    this.replaySpeed = speed;
    this.eventIndex = 0;

    console.log(`🎬 Starting PumpPortal replay at ${speed}x speed`);
    
    // Replay token events
    await this.replayTokenEvents();
    
    // Replay swap events
    await this.replaySwapEvents();
    
    // Replay price updates
    await this.replayPriceUpdates();
  }

  /**
   * Stop replay
   */
  stopReplay(): void {
    this.isReplaying = false;
    console.log('⏹️ PumpPortal replay stopped');
  }

  /**
   * Replay new token creation events
   */
  private async replayTokenEvents(): Promise<void> {
    for (const event of MOCK_TOKEN_EVENTS.filter(e => e.type === 'newToken')) {
      if (!this.isReplaying) break;
      
      console.log(`🆕 Replaying new token event: ${event.data.symbol}`);
      
      // Emit new token event
      this.emit('newToken', event.data);
      
      // Wait based on replay speed
      await this.delay(1000 / this.replaySpeed);
    }
  }

  /**
   * Replay swap events
   */
  private async replaySwapEvents(): Promise<void> {
    for (const event of MOCK_TOKEN_EVENTS.filter(e => e.type === 'swap')) {
      if (!this.isReplaying) break;
      
      console.log(`🔄 Replaying swap event: ${event.data.txType} ${event.data.solAmount} SOL`);
      
      // Emit swap event
      this.emit('swap', event.data);
      
      // Wait based on replay speed
      await this.delay(2000 / this.replaySpeed);
    }
  }

  /**
   * Replay price updates
   */
  private async replayPriceUpdates(): Promise<void> {
    const tokens = MOCK_PUMP_FUN_TOKENS;
    
    for (let i = 0; i < 10 && this.isReplaying; i++) {
      for (const token of tokens) {
        if (!this.isReplaying) break;
        
        // Simulate price movement
        const priceChange = (Math.random() - 0.5) * 0.1; // ±5% change
        const newPriceUsd = token.priceUsd * (1 + priceChange);
        const newPriceSol = newPriceUsd * 0.000004; // Mock SOL rate
        
        console.log(`💰 Price update: ${token.symbol} $${newPriceUsd.toFixed(6)}`);
        
        // Emit price update
        this.emit('price', {
          mint: token.mint,
          priceUsd: newPriceUsd,
          priceSol: newPriceSol,
          marketCapUsd: token.marketCapUsd,
          volume24h: token.volume24h,
          change24h: priceChange * 100,
          timestamp: Date.now()
        });
        
        // Wait based on replay speed
        await this.delay(500 / this.replaySpeed);
      }
    }
  }

  /**
   * Generate realistic trading volume spike
   */
  async simulateVolumeSpike(mint: string, durationMs: number = 30000): Promise<void> {
    console.log(`📈 Simulating volume spike for ${mint} (${durationMs}ms)`);
    
    const startTime = Date.now();
    const endTime = startTime + durationMs;
    
    while (Date.now() < endTime && this.isReplaying) {
      // Generate random trade
      const txType = Math.random() > 0.5 ? 'buy' : 'sell';
      const solAmount = Math.random() * 10; // 0-10 SOL
      const tokenAmount = solAmount * 1000000; // Mock conversion
      
      this.emit('swap', {
        signature: `spike_${Date.now()}_${Math.random()}`,
        mint,
        traderPublicKey: `spike_trader_${Math.floor(Math.random() * 1000)}`,
        txType,
        tokenAmount,
        solAmount,
        timestamp: Date.now(),
        virtualSolReserves: 30000 + Math.random() * 1000,
        virtualTokenReserves: 1000000000 - Math.random() * 100000,
        newTokenPrice: 0.0000003 + Math.random() * 0.0000001
      });
      
      // High frequency during spike
      await this.delay(100 / this.replaySpeed);
    }
  }

  /**
   * Test bonding curve migration
   */
  async simulateBondingCurveMigration(mint: string): Promise<void> {
    console.log(`🔄 Simulating bonding curve migration for ${mint}`);
    
    // Simulate migration event
    this.emit('migration', {
      mint,
      fromBondingCurve: {
        virtualSolReserves: 30000,
        virtualTokenReserves: 1000000000
      },
      toRaydium: {
        poolAddress: 'mock_raydium_pool',
        liquidity: 50000
      },
      timestamp: Date.now()
    });
  }

  /**
   * Test error scenarios
   */
  async simulateErrorScenarios(): Promise<void> {
    console.log('🚨 Simulating error scenarios');
    
    // Simulate WebSocket disconnection
    this.emit('error', new Error('WebSocket connection lost'));
    await this.delay(2000);
    
    // Simulate malformed data
    this.emit('swap', {
      signature: 'malformed',
      mint: 'invalid_mint',
      traderPublicKey: null, // Invalid data
      txType: 'invalid_type',
      tokenAmount: 'not_a_number',
      solAmount: -1, // Negative amount
      timestamp: 'invalid_timestamp'
    });
    
    // Simulate rate limiting
    this.emit('rateLimit', {
      retryAfter: 60,
      message: 'Rate limit exceeded'
    });
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get replay status
   */
  getStatus(): { isReplaying: boolean; speed: number; eventIndex: number } {
    return {
      isReplaying: this.isReplaying,
      speed: this.replaySpeed,
      eventIndex: this.eventIndex
    };
  }
}

// Export singleton instance
export const pumpPortalReplay = new PumpPortalReplayService();

// CLI interface for testing
if (require.main === module) {
  const replay = new PumpPortalReplayService();
  
  // Set up event listeners
  replay.on('newToken', (data) => {
    console.log('📢 New token event:', data.symbol);
  });
  
  replay.on('swap', (data) => {
    console.log('📢 Swap event:', data.txType, data.solAmount, 'SOL');
  });
  
  replay.on('price', (data) => {
    console.log('📢 Price update:', data.mint, '$' + data.priceUsd.toFixed(6));
  });
  
  replay.on('error', (error) => {
    console.error('📢 Error event:', error.message);
  });
  
  // Start replay
  replay.startReplay(2.0).then(() => {
    console.log('✅ Replay completed');
  }).catch(console.error);
}