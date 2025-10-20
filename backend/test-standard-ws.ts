/**
 * Standalone test script for Helius Standard WebSocket connection (logsSubscribe)
 *
 * This uses the standard Solana WebSocket API which is available on all plans
 * Run with: npx tsx test-standard-ws.ts
 */

import WebSocket from 'ws';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const HELIUS_API = process.env.HELIUS_API;

if (!HELIUS_API) {
  console.error('❌ HELIUS_API environment variable not found');
  process.exit(1);
}

// Standard WebSocket endpoint (available on all plans)
const HELIUS_WS_URL = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API}`;

// DEX programs to monitor (let's start with just Raydium V4)
const DEX_PROGRAM = "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"; // Raydium V4

console.log('🧪 Testing Helius Standard WebSocket Connection (logsSubscribe)');
console.log('================================================================\n');

let ws: WebSocket | null = null;
let pingInterval: NodeJS.Timeout | null = null;
let messageCount = 0;
let startTime = Date.now();

function connect() {
  console.log('📡 Connecting to Helius WebSocket (Standard API)...');
  console.log(`URL: ${HELIUS_WS_URL.replace(/api-key=[^&]+/, 'api-key=***')}\n`);

  ws = new WebSocket(HELIUS_WS_URL);

  ws.on('open', () => {
    console.log('✅ WebSocket connected successfully!\n');

    // Subscribe to Raydium V4 program using logsSubscribe
    const subscribeRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "logsSubscribe",
      params: [
        {
          mentions: [DEX_PROGRAM]
        },
        {
          commitment: "confirmed"
        }
      ]
    };

    console.log('📤 Subscribing to Raydium V4 program logs...');
    console.log(`   Program: ${DEX_PROGRAM}\n`);
    ws!.send(JSON.stringify(subscribeRequest));

    // Start periodic pings (every 30 seconds)
    pingInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.ping();
        console.log('🏓 Ping sent (keepalive)');
      }
    }, 30000);

    // Show stats every 10 seconds
    setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`\n📊 Stats: ${messageCount} log events received in ${elapsed}s`);
    }, 10000);
  });

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const messageStr = data.toString('utf8');
      const message = JSON.parse(messageStr);

      // Handle subscription confirmation
      if (message.result !== undefined && message.id === 1) {
        console.log(`✅ Subscription confirmed! (ID: ${message.result})`);
        console.log(`\n🎧 Listening for Raydium V4 DEX activity...\n`);
        return;
      }

      // Handle log notifications
      if (message.method === "logsNotification" && message.params?.result) {
        messageCount++;
        const logData = message.params.result;
        const signature = logData.value?.signature;
        const logs = logData.value?.logs || [];
        const err = logData.value?.err;

        console.log(`\n🔔 DEX Activity #${messageCount}`);
        console.log(`  Signature: ${signature?.slice(0, 16)}...${signature?.slice(-8)}`);
        console.log(`  Status: ${err ? '❌ Failed' : '✅ Success'}`);
        console.log(`  Logs: ${logs.length} lines`);

        // Show first few log lines to identify the operation
        if (logs.length > 0) {
          console.log('  First logs:');
          logs.slice(0, 3).forEach((log: string) => {
            console.log(`    ${log.slice(0, 80)}${log.length > 80 ? '...' : ''}`);
          });
        }

        // Check for specific operations
        const logString = logs.join(' ');
        if (logString.includes('swap') || logString.includes('Swap')) {
          console.log('  🔄 Detected: SWAP operation');
        }
        if (logString.includes('initialize') || logString.includes('Initialize')) {
          console.log('  🆕 Detected: Pool initialization');
        }
        if (logString.includes('add_liquidity') || logString.includes('AddLiquidity')) {
          console.log('  💧 Detected: Liquidity addition');
        }
      }

    } catch (error: any) {
      console.error('❌ Error parsing message:', error.message);
    }
  });

  ws.on('error', (error: Error) => {
    console.error('\n❌ WebSocket error:', error.message);
  });

  ws.on('close', (code: number, reason: Buffer) => {
    console.log('\n⚠️  WebSocket closed');
    console.log(`Code: ${code}`);
    console.log(`Reason: ${reason.toString() || 'No reason provided'}`);

    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  });

  ws.on('pong', () => {
    console.log('🏓 Pong received');
  });
}

// Start the test
connect();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down test...');

  if (pingInterval) {
    clearInterval(pingInterval);
  }

  if (ws) {
    ws.close();
  }

  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  console.log(`\n📊 Final Stats:`);
  console.log(`  Total log events: ${messageCount}`);
  console.log(`  Runtime: ${elapsed}s`);
  console.log(`  Rate: ${messageCount > 0 ? (messageCount / elapsed).toFixed(2) : 0} events/s`);
  console.log('\n✅ Test completed\n');

  process.exit(0);
});

console.log('Press Ctrl+C to stop the test\n');
