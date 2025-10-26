/**
 * Test SSE Real-Time Trade Stream
 * 
 * This script connects to the backend SSE endpoint and displays
 * real-time trades as they arrive.
 */

const token = process.argv[2] || '7Xf9mt9JA5WzoGp4XDuuhjt4FZo3xRXQqCCRxZwUpump';
const url = `https://solsim-production.up.railway.app/api/pumpportal/trades/${token}?limit=10`;

console.log('🚀 Testing Real-Time SSE Trade Stream');
console.log('=====================================');
console.log(`Token: ${token}`);
console.log(`URL: ${url}`);
console.log('');
console.log('Connecting to backend...');
console.log('');

async function streamSSE() {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ SSE Connection established!');
    console.log('Waiting for trade data...');
    console.log('');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        console.log('Stream closed by server');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep the last incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6); // Remove "data: " prefix
          
          try {
            const data = JSON.parse(jsonStr);
            
            if (data.type === 'history') {
              console.log(`📜 Initial History: ${data.trades.length} trades`);
              data.trades.forEach((trade, i) => {
                console.log(`  ${i + 1}. ${trade.side.toUpperCase()} - ${trade.amountSol?.toFixed(4) || '?'} SOL`);
              });
              console.log('');
              console.log('📡 Now listening for real-time trades...');
              console.log('');
            } else if (data.type === 'trade') {
              const trade = data.trade;
              const time = new Date(trade.ts).toLocaleTimeString();
              const icon = trade.side === 'buy' ? '🟢' : '🔴';
              console.log(`${icon} [${time}] ${trade.side.toUpperCase()}: ${trade.amountSol?.toFixed(4) || '?'} SOL by ${trade.signer.slice(0, 8)}...`);
            }
          } catch (error) {
            // Silently ignore parse errors for keepalive messages
          }
        } else if (line.startsWith(': keepalive')) {
          console.log('💓 Keepalive received');
        }
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

streamSSE();

// Keep alive for 60 seconds
setTimeout(() => {
  console.log('');
  console.log('⏱️  60 seconds elapsed. Closing...');
  process.exit(0);
}, 60000);

console.log('Press Ctrl+C to stop');
