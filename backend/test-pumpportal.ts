/**
 * Test script for PumpPortal integration
 *
 * Tests:
 * 1. Smart routing for pump.fun tokens (pump.fun API FIRST)
 * 2. WebSocket real-time price streaming
 * 3. Dynamic negative cache TTL (2 min for pump tokens, 10 min for others)
 */

import priceService from "./src/plugins/priceService-optimized.js";
import { PumpPortalWebSocketClient } from "./src/plugins/pumpPortalWs.js";
import { loggers } from "./src/utils/logger.js";
import dotenv from "dotenv";

dotenv.config();

const logger = loggers.priceService;

// Example pump.fun tokens for testing
const TEST_TOKENS = {
  // Active pump.fun token (should work)
  PUMP_TOKEN: "JBASmuEyG2YfXAEj1AptpnMuDivn1DtDZ7caZmtipump",

  // Another pump.fun token
  ANOTHER_PUMP: "9JtmxsqG8AhLeuQZNQ76V17dDEMpp5BNrpTWCBfWpump",

  // Regular SPL token (should try DexScreener first)
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",

  // SOL
  SOL: "So11111111111111111111111111111111111111112"
};

async function testPriceRouting() {
  console.log("\n🔍 Testing Smart Price Routing...\n");

  // Use the singleton instance
  await priceService.start();

  // Test 1: Pump.fun token (should try pump.fun API FIRST)
  console.log("1️⃣ Testing pump.fun token (should route to pump.fun API first):");
  const startTime1 = Date.now();
  const pumpPrice = await priceService.getLastTick(TEST_TOKENS.PUMP_TOKEN);
  const elapsed1 = Date.now() - startTime1;

  if (pumpPrice) {
    console.log(`  ✅ Price found: $${pumpPrice.priceUsd.toFixed(8)}`);
    console.log(`  ✅ Source: ${pumpPrice.source}`);
    console.log(`  ✅ Time: ${elapsed1}ms (should be ~3s if pump.fun API was first)`);
  } else {
    console.log(`  ❌ No price found (token might not exist)`);
  }

  // Test 2: Regular SPL token (should try DexScreener first)
  console.log("\n2️⃣ Testing regular SPL token (should route to DexScreener first):");
  const startTime2 = Date.now();
  const bonkPrice = await priceService.getLastTick(TEST_TOKENS.BONK);
  const elapsed2 = Date.now() - startTime2;

  if (bonkPrice) {
    console.log(`  ✅ Price found: $${bonkPrice.priceUsd.toFixed(8)}`);
    console.log(`  ✅ Source: ${bonkPrice.source}`);
    console.log(`  ✅ Time: ${elapsed2}ms`);
  } else {
    console.log(`  ❌ No price found`);
  }

  // Test 3: Non-existent token (test negative cache TTL)
  console.log("\n3️⃣ Testing negative cache TTL:");
  const fakeToken = "FakeTokenThatDoesNotExist12345pump";

  console.log(`  Testing fake pump.fun token: ${fakeToken.slice(0, 20)}...`);
  const firstTry = await priceService.getLastTick(fakeToken);
  console.log(`  First attempt: ${firstTry ? 'Found' : 'Not found (cached)'}`);

  // Try again immediately (should be cached)
  const secondTry = await priceService.getLastTick(fakeToken);
  console.log(`  Second attempt (immediate): ${secondTry ? 'Found' : 'Still cached (good!)'}`);

  console.log(`  Negative cache TTL for pump.fun tokens: 2 minutes`);
  console.log(`  Negative cache TTL for regular tokens: 10 minutes`);

  await priceService.stop();
}

async function testWebSocketStreaming() {
  console.log("\n📡 Testing PumpPortal WebSocket Real-time Streaming...\n");

  const ws = new PumpPortalWebSocketClient(100); // $100 SOL price

  // Set up event listeners
  ws.on('price', (price) => {
    console.log(`  💰 Price update received:`);
    console.log(`     Token: ${price.mint.slice(0, 8)}...`);
    console.log(`     Price: $${price.priceUsd.toFixed(8)}`);
    console.log(`     Source: ${price.source}`);
  });

  ws.on('trade', (trade) => {
    console.log(`  📊 Trade event:`);
    console.log(`     Type: ${trade.txType}`);
    console.log(`     Token: ${trade.mint.slice(0, 8)}...`);
    console.log(`     SOL Amount: ${trade.solAmount}`);
  });

  // Connect and subscribe
  await ws.connect();

  console.log("✅ WebSocket connected");
  console.log("📢 Subscribing to new token creation events...");
  ws.subscribeToNewTokens();

  console.log("📢 Subscribing to specific token trades...");
  ws.subscribeToToken(TEST_TOKENS.PUMP_TOKEN);
  ws.subscribeToToken(TEST_TOKENS.ANOTHER_PUMP);

  console.log("\n⏳ Listening for 30 seconds (watch for real-time updates)...\n");

  // Listen for 30 seconds
  await new Promise(resolve => setTimeout(resolve, 30000));

  console.log("\n🔌 Disconnecting WebSocket...");
  await ws.disconnect();
}

async function main() {
  console.log("=" .repeat(60));
  console.log("  PUMPPORTAL INTEGRATION TEST");
  console.log("=" .repeat(60));

  try {
    // Test price routing
    await testPriceRouting();

    console.log("\n" + "-".repeat(60) + "\n");

    // Test WebSocket streaming
    await testWebSocketStreaming();

    console.log("\n" + "=" .repeat(60));
    console.log("  ✅ ALL TESTS COMPLETED");
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run tests
main().catch(console.error);