/**
 * Standalone test script for Helius Enhanced WebSocket connection
 *
 * This script tests the WebSocket connection without affecting the main service.
 * Run with: npx tsx test-helius-ws.ts
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

const HELIUS_WS_URL = `wss://atlas-mainnet.helius-rpc.com/?api-key=${HELIUS_API}`;

// DEX programs to monitor
const DEX_PROGRAMS = [
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium V4
  "CAMMCzo5YL8w4VFF8KVHrK22GGUQpMpTFb6xRmpLFGNnSm", // Raydium CLMM
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",  // Pump.fun
];

console.log('🧪 Testing Helius Enhanced WebSocket Connection');
console.log('================================================\n');

let ws: WebSocket | null = null;
let pingInterval: NodeJS.Timeout | null = null;
let messageCount = 0;
let startTime = Date.now();

function connect() {
  console.log('📡 Connecting to Helius WebSocket...');
  console.log(`URL: ${HELIUS_WS_URL.replace(/api-key=[^&]+/, 'api-key=***')}\n`);

  ws = new WebSocket(HELIUS_WS_URL);

  ws.on('open', () => {
    console.log('✅ WebSocket connected successfully!\n');

    // Subscribe to DEX transactions
    const subscribeRequest = {
      jsonrpc: "2.0",
      id: 1,
      method: "transactionSubscribe",
      params: [
        {
          accountInclude: DEX_PROGRAMS,
          vote: false,
          failed: false,
        },
        {
          commitment: "confirmed",
          encoding: "jsonParsed",
          transactionDetails: "full",
          showRewards: false,
          maxSupportedTransactionVersion: 0,
        }
      ]
    };

    console.log('📤 Sending subscription request...');
    console.log('Monitoring DEX programs:', DEX_PROGRAMS.map(p => p.slice(0, 8) + '...').join(', '));
    console.log('');

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
      console.log(`\n📊 Stats: ${messageCount} transactions received in ${elapsed}s`);
    }, 10000);
  });

  ws.on('message', (data: WebSocket.Data) => {
    try {
      const messageStr = data.toString('utf8');
      const message = JSON.parse(messageStr);

      // Handle subscription confirmation
      if (message.result !== undefined && message.id === 1) {
        console.log('✅ Subscription confirmed!');
        console.log(`Subscription ID: ${message.result}\n`);
        console.log('🎧 Listening for DEX transactions...\n');
        return;
      }

      // Handle transaction notifications
      if (message.method === "transactionNotification" && message.params?.result) {
        messageCount++;
        const txData = message.params.result;
        const signature = txData.signature;
        const slot = txData.slot;

        console.log(`\n🔔 Transaction #${messageCount}`);
        console.log(`  Signature: ${signature?.slice(0, 16)}...`);
        console.log(`  Slot: ${slot}`);

        // Show transaction details if available
        if (txData.transaction?.transaction) {
          const tx = txData.transaction.transaction;
          console.log(`  Fee: ${tx.meta?.fee || 0} lamports`);
          console.log(`  Compute Units: ${tx.meta?.computeUnitsConsumed || 0}`);

          // Show account keys involved
          const accountKeys = tx.message?.accountKeys;
          if (accountKeys && accountKeys.length > 0) {
            console.log(`  Accounts involved: ${accountKeys.length}`);
          }

          // Check for token balance changes (indicates swaps)
          const preTokenBalances = tx.meta?.preTokenBalances || [];
          const postTokenBalances = tx.meta?.postTokenBalances || [];

          if (preTokenBalances.length > 0) {
            console.log(`  Token transfers detected: ${preTokenBalances.length} tokens`);

            // Show balance changes
            preTokenBalances.forEach((preBalance: any, index: number) => {
              const postBalance = postTokenBalances[index];
              if (preBalance && postBalance && preBalance.uiTokenAmount && postBalance.uiTokenAmount) {
                const change = postBalance.uiTokenAmount.uiAmount - preBalance.uiTokenAmount.uiAmount;
                if (change !== 0) {
                  const mint = preBalance.mint || 'unknown';
                  console.log(`    ${mint.slice(0, 8)}...: ${change > 0 ? '+' : ''}${change.toFixed(4)}`);
                }
              }
            });
          }
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
  console.log(`  Total transactions: ${messageCount}`);
  console.log(`  Runtime: ${elapsed}s`);
  console.log(`  Rate: ${messageCount > 0 ? (messageCount / elapsed).toFixed(2) : 0} tx/s`);
  console.log('\n✅ Test completed\n');

  process.exit(0);
});

console.log('Press Ctrl+C to stop the test\n');
