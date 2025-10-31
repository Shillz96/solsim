// Quick test script to verify PumpPortal WebSocket availability
import WebSocket from 'ws';

console.log('Testing PumpPortal WebSocket connection...');
console.log('URL: wss://pumpportal.fun/api/data');

const ws = new WebSocket('wss://pumpportal.fun/api/data');

ws.on('open', () => {
  console.log('✅ Connected successfully!');
  
  // Subscribe to new tokens
  ws.send(JSON.stringify({ method: 'subscribeNewToken' }));
  console.log('📡 Subscribed to new token events');
  
  // Close after 10 seconds
  setTimeout(() => {
    console.log('🛑 Test complete, closing connection');
    ws.close();
  }, 10000);
});

ws.on('message', (data) => {
  console.log('📨 Received message:', data.toString().substring(0, 200));
});

ws.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: code=${code}, reason=${reason.toString()}`);
  process.exit(code === 1000 ? 0 : 1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('⏱️ Connection timeout after 30 seconds');
  ws.terminate();
  process.exit(1);
}, 30000);
