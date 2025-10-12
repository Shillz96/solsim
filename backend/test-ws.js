// Test WebSocket connection and SOL price
import WebSocket from 'ws';

const ws = new WebSocket('wss://solsim-production.up.railway.app/ws/prices');

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket');
  
  // Subscribe to SOL price
  ws.send(JSON.stringify({ 
    type: 'subscribe', 
    mint: 'So11111111111111111111111111111111111111112' 
  }));
  
  console.log('📡 Subscribed to SOL price');
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data);
    console.log('📨 Received:', parsed);
    
    if (parsed.type === 'price' && parsed.mint === 'So11111111111111111111111111111111111111112') {
      console.log(`💰 SOL Price: $${parsed.price}`);
    }
  } catch (e) {
    console.log('Raw message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close(code, reason) {
  console.log(`❌ WebSocket closed: ${code} ${reason}`);
});

// Keep alive for 10 seconds
setTimeout(() => {
  console.log('🔌 Closing connection...');
  ws.close();
}, 10000);