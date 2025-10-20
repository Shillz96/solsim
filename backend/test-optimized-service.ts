/**
 * Test script for the optimized price service
 * Run with: npx tsx test-optimized-service.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import optimizedPriceService from './src/plugins/priceService-optimized.js';

console.log('🧪 Testing Optimized Price Service (Developer Plan)');
console.log('====================================================\n');

let messageCount = 0;
const startTime = Date.now();

async function main() {
  // Subscribe to price updates
  const unsubscribe = optimizedPriceService.onPriceUpdate((tick) => {
    messageCount++;
    console.log(`\n💰 Price Update #${messageCount}`);
    console.log(`   Token: ${tick.mint.slice(0, 8)}...`);
    console.log(`   Price: $${tick.priceUsd.toFixed(6)}`);
    console.log(`   Source: ${tick.source}`);
  });

  // Start the service
  console.log('🚀 Starting optimized price service...\n');
  await optimizedPriceService.start();

  // Wait a moment for connection
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check stats
  console.log('\n📊 Service Stats:');
  const stats = optimizedPriceService.getStats();
  console.log(`   WebSocket Connected: ${stats.wsConnected ? '✅' : '❌'}`);
  console.log(`   SOL Price: $${stats.solPrice}`);
  console.log(`   Cached Prices: ${stats.cachedPrices}`);
  console.log(`   Subscribers: ${stats.priceSubscribers}`);
  console.log(`   Plan: ${stats.plan}\n`);

  // Test fetching a price (should use cache or external API)
  console.log('🔍 Testing price fetch for USDC...');
  const usdcMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const usdcPrice = await optimizedPriceService.getPrice(usdcMint);
  console.log(`   USDC Price: $${usdcPrice}\n`);

  // Show periodic stats
  setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const stats = optimizedPriceService.getStats();
    console.log(`\n⏱️  Runtime: ${elapsed}s`);
    console.log(`   WebSocket: ${stats.wsConnected ? '✅ Connected' : '❌ Disconnected'}`);
    console.log(`   Price Updates: ${messageCount}`);
    console.log(`   Cache Size: ${stats.cachedPrices}`);
  }, 15000);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutting down...');

  await optimizedPriceService.stop();

  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  console.log(`\n📊 Final Stats:`);
  console.log(`   Runtime: ${elapsed}s`);
  console.log(`   Price Updates Received: ${messageCount}`);
  console.log('\n✅ Test completed\n');

  process.exit(0);
});

console.log('Press Ctrl+C to stop the test\n');
