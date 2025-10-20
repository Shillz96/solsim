/**
 * Test production WebSocket connection
 * Tests: wss://solsim-production.up.railway.app/ws/prices
 */

import WebSocket from 'ws';

console.log('🧪 Testing Production WebSocket');
console.log('================================\n');

const WS_URL = 'wss://solsim-production.up.railway.app/ws/prices';

console.log(`📡 Connecting to: ${WS_URL}\n`);

const ws = new WebSocket(WS_URL);

let messageCount = 0;
const startTime = Date.now();

ws.on('open', () => {
  console.log('✅ Connected to production WebSocket!\n');

  // Subscribe to SOL
  console.log('📤 Subscribing to SOL price updates...');
  ws.send(JSON.stringify({
    type: 'subscribe',
    mint: 'So11111111111111111111111111111111111111112'
  }));

  // Subscribe to USDC
  console.log('📤 Subscribing to USDC price updates...\n');
  ws.send(JSON.stringify({
    type: 'subscribe',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    messageCount++;

    if (message.type === 'hello') {
      console.log('👋 Received hello message');
      console.log(`   Message: "${message.message}"\n`);
    } else if (message.type === 'price') {
      console.log(`💰 Price Update #${messageCount}`);
      console.log(`   Token: ${message.mint?.slice(0, 8)}...`);
      console.log(`   Price: $${message.price}`);
      if (message.change24h) {
        console.log(`   24h Change: ${message.change24h > 0 ? '+' : ''}${message.change24h.toFixed(2)}%`);
      }
      console.log('');
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

// Auto-close after 15 seconds
setTimeout(() => {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  console.log('\n📊 Test Summary:');
  console.log(`   Messages received: ${messageCount}`);
  console.log(`   Duration: ${elapsed}s`);
  console.log('\n✅ Production WebSocket test completed!\n');
  ws.close();
  process.exit(0);
}, 15000);

console.log('Waiting for messages (15 second test)...\n');
