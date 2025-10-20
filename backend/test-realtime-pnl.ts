/**
 * Test real-time PnL updates for token AKiV3CSF4TDUMxexepYoJ8fxeut11Db1kgTjYyFGr38H
 * Simulates how fast a user's portfolio would update
 */

import WebSocket from 'ws';

const PRODUCTION_WS = 'wss://solsim-production.up.railway.app/ws/prices';
const TEST_TOKEN = 'AKiV3CSF4TDUMxexepYoJ8fxeut11Db1kgTjYyFGr38H';

console.log('🧪 Testing Real-time PnL Speed');
console.log('===============================\n');
console.log(`Token: ${TEST_TOKEN}\n`);

const ws = new WebSocket(PRODUCTION_WS);

let priceUpdateCount = 0;
let firstPriceTime: number | null = null;
let lastPrice: number | null = null;
const startTime = Date.now();

ws.on('open', () => {
  console.log('✅ Connected to production WebSocket\n');
  console.log(`📤 Subscribing to token: ${TEST_TOKEN.slice(0, 8)}...\n`);

  ws.send(JSON.stringify({
    type: 'subscribe',
    mint: TEST_TOKEN
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());

    if (message.type === 'hello') {
      console.log('👋 Connection established\n');
      console.log('⏱️  Waiting for price updates...\n');
      return;
    }

    if (message.type === 'price' && message.mint === TEST_TOKEN) {
      priceUpdateCount++;

      if (!firstPriceTime) {
        firstPriceTime = Date.now();
        const latency = firstPriceTime - startTime;
        console.log(`⚡ First price received in ${latency}ms\n`);
      }

      const now = Date.now();
      const timeSinceStart = ((now - startTime) / 1000).toFixed(2);

      console.log(`💰 Price Update #${priceUpdateCount} (${timeSinceStart}s)`);
      console.log(`   Token: ${message.mint.slice(0, 8)}...${message.mint.slice(-8)}`);
      console.log(`   Price: $${message.price}`);

      if (message.change24h !== undefined) {
        const changeColor = message.change24h >= 0 ? '🟢' : '🔴';
        console.log(`   24h Change: ${changeColor} ${message.change24h > 0 ? '+' : ''}${message.change24h.toFixed(2)}%`);
      }

      // Calculate price change if we have a previous price
      if (lastPrice !== null && lastPrice !== message.price) {
        const priceDiff = message.price - lastPrice;
        const pctChange = ((priceDiff / lastPrice) * 100).toFixed(4);
        const changeSymbol = priceDiff > 0 ? '🟢 ↑' : '🔴 ↓';
        console.log(`   Change: ${changeSymbol} ${pctChange}% from last update`);
      }

      console.log(`   Timestamp: ${new Date(message.timestamp).toISOString()}\n`);

      lastPrice = message.price;

      // Show what this means for PnL
      if (priceUpdateCount === 1) {
        console.log('📊 PnL Impact:');
        console.log('   If you hold 100 tokens:');
        console.log(`   Portfolio Value = 100 × $${message.price} = $${(100 * message.price).toFixed(2)}`);
        console.log('   ✅ This updates automatically without refresh!\n');
      }
    }

  } catch (error: any) {
    console.error('❌ Error parsing message:', error.message);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log('\n⚠️  Connection closed');
  console.log(`Code: ${code}`);
  console.log(`Reason: ${reason.toString() || 'No reason provided'}`);
});

// Show stats every 5 seconds
const statsInterval = setInterval(() => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  console.log(`\n📊 Live Stats (${elapsed}s elapsed):`);
  console.log(`   Price updates received: ${priceUpdateCount}`);
  if (priceUpdateCount > 0 && firstPriceTime) {
    const avgInterval = ((Date.now() - firstPriceTime) / priceUpdateCount / 1000).toFixed(2);
    console.log(`   Average update interval: ${avgInterval}s`);
  }
  if (lastPrice !== null) {
    console.log(`   Current price: $${lastPrice}`);
  }
  console.log('');
}, 5000);

// Auto-close after 30 seconds
setTimeout(() => {
  clearInterval(statsInterval);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n═══════════════════════════════════════');
  console.log('📊 Final Results:');
  console.log('═══════════════════════════════════════\n');
  console.log(`⏱️  Test Duration: ${totalTime}s`);
  console.log(`📈 Price Updates: ${priceUpdateCount}`);

  if (priceUpdateCount > 0 && firstPriceTime) {
    const timeToFirst = ((firstPriceTime - startTime) / 1000).toFixed(2);
    console.log(`⚡ Time to First Price: ${timeToFirst}s`);

    if (priceUpdateCount > 1) {
      const avgInterval = ((Date.now() - firstPriceTime) / (priceUpdateCount - 1) / 1000).toFixed(2);
      console.log(`⏰ Avg Update Interval: ${avgInterval}s`);
    }
  }

  console.log('\n🎯 Real-time Performance:');
  if (priceUpdateCount === 0) {
    console.log('   ⚠️  No price updates received');
    console.log('   Possible reasons:');
    console.log('   - Token not actively trading');
    console.log('   - Token not indexed by price APIs yet');
  } else if (priceUpdateCount === 1) {
    console.log('   ✅ Initial price received successfully');
    console.log('   ⏳ No live updates during test period');
    console.log('   Note: Updates happen when price changes in external APIs');
  } else {
    console.log('   ✅ Real-time updates working!');
    console.log('   ✅ PnL updates automatically');
    console.log('   ✅ No page refresh needed');
  }

  console.log('\n✅ Test completed!\n');

  ws.close();
  process.exit(0);
}, 30000);

console.log('Running 30-second real-time test...\n');
console.log('This simulates how fast your PnL would update in production.\n');
