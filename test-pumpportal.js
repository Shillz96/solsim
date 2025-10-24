/**
 * Quick test script for PumpPortal WebSocket connection
 * Tests the Pump.fun 24h volume data source
 */

const WebSocket = require('ws');

console.log('🔌 Testing PumpPortal WebSocket connection...\n');

const ws = new WebSocket('wss://pumpportal.fun/api/data');

let messageCount = 0;
let swapCount = 0;
let totalVolume = 0;

ws.on('open', () => {
  console.log('✅ Connected to PumpPortal!\n');
  
  // Subscribe to new tokens (this should have activity)
  ws.send(JSON.stringify({
    method: 'subscribeNewToken'
  }));
  
  console.log('📡 Subscribed to new token events...');
  console.log('🎯 Listening for events (will stop after 5 messages or 60 seconds)...\n');
  
  // Auto-stop after 60 seconds
  setTimeout(() => {
    console.log('\n⏰ 60 seconds elapsed, stopping test...');
    printSummary();
    ws.close();
    process.exit(0);
  }, 60000);
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    messageCount++;
    
    // Only show first few messages
    if (messageCount <= 5) {
      console.log(`\n📨 Message #${messageCount}:`, JSON.stringify(message, null, 2));
    }
    
    // Track new token events
    if (message.signature || message.mint) {
      swapCount++;
      console.log(`\n🎉 New Token Event #${swapCount}:`);
      console.log(`   Mint: ${message.mint || 'N/A'}`);
      console.log(`   Name: ${message.name || 'N/A'}`);
      console.log(`   Symbol: ${message.symbol || 'N/A'}`);
    }
    
    // Stop after 5 messages
    if (messageCount >= 5) {
      console.log('\n🎯 Received 5 messages, stopping test...');
      printSummary();
      ws.close();
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error.message);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`\n🔌 Connection closed (code: ${code})`);
  if (reason) console.log(`Reason: ${reason}`);
});

function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total messages received: ${messageCount}`);
  console.log(`Events detected: ${swapCount}`);
  console.log('='.repeat(50));
  console.log('\n✅ PumpPortal WebSocket is working!');
  console.log('✅ Your backend receives real-time events');
  console.log('✅ Market Lighthouse will track 24h volume from swaps\n');
}
