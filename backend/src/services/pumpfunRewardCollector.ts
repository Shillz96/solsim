/**
 * PumpFun Reward Collector Service
 *
 * Monitors and collects creator fees from pump.fun token launches
 * ALL fees (100%) go to the hourly reward pool for distribution to top traders
 *
 * SETUP REQUIREMENTS:
 * 1. Set PUMPFUN_CREATOR_WALLET in .env (your pump.fun creator wallet address)
 * 2. Set HOURLY_REWARD_WALLET_SECRET in .env (distributes hourly rewards)
 * 3. Ensure the creator wallet has authority over your pump.fun tokens
 */

import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import prisma from "../plugins/prisma.js";

const RPC_URL = process.env.HELIUS_RPC_URL || process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL, "confirmed");

// Configuration
const PUMPFUN_CREATOR_WALLET = process.env.PUMPFUN_CREATOR_WALLET;
const PLATFORM_OWNER_WALLET = process.env.PLATFORM_OWNER_WALLET;
const REWARD_WALLET_SECRET = process.env.HOURLY_REWARD_WALLET_SECRET;

// Fee split percentages
const REWARD_POOL_PERCENTAGE = 1.00;  // 100% to hourly rewards
const PLATFORM_PERCENTAGE = 0.00;      // 0% to platform

interface FeeCollectionResult {
  success: boolean;
  hourlyPoolAmount: number;
  platformAmount: number;
  totalFees: number;
  error?: string;
}

/**
 * Check if the reward collector is properly configured
 */
export function isRewardCollectorEnabled(): boolean {
  if (!PUMPFUN_CREATOR_WALLET) {
    console.warn("⚠️ PUMPFUN_CREATOR_WALLET not configured");
    return false;
  }
  if (!PLATFORM_OWNER_WALLET) {
    console.warn("⚠️ PLATFORM_OWNER_WALLET not configured");
    return false;
  }
  if (!REWARD_WALLET_SECRET) {
    console.warn("⚠️ HOURLY_REWARD_WALLET_SECRET not configured");
    return false;
  }
  return true;
}

/**
 * Get or create the current hour's reward pool
 */
async function getCurrentHourPool() {
  const now = new Date();
  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);

  const hourEnd = new Date(hourStart);
  hourEnd.setHours(hourStart.getHours() + 1);

  // Find existing pool for this hour or create new one
  let pool = await prisma.hourlyRewardPool.findFirst({
    where: {
      hourStart,
      distributed: false
    }
  });

  if (!pool) {
    pool = await prisma.hourlyRewardPool.create({
      data: {
        hourStart,
        hourEnd,
        totalCreatorRewards: 0,
        poolAmount: 0,
        platformAmount: 0,
        distributed: false
      }
    });
    console.log(`✅ Created new hourly reward pool for ${hourStart.toISOString()}`);
  }

  return pool;
}

/**
 * Record creator fees and split them into pool and platform
 *
 * @param creatorFeesSOL - Total creator fees collected (in SOL)
 * @param source - Source description (e.g., "pump.fun trade fees")
 */
export async function recordCreatorFees(
  creatorFeesSOL: number,
  source: string = "pump.fun"
): Promise<FeeCollectionResult> {
  try {
    if (!isRewardCollectorEnabled()) {
      return {
        success: false,
        hourlyPoolAmount: 0,
        platformAmount: 0,
        totalFees: 0,
        error: "Reward collector not configured"
      };
    }

    // Calculate split amounts
    const poolAmount = creatorFeesSOL * REWARD_POOL_PERCENTAGE;
    const platformAmount = creatorFeesSOL * PLATFORM_PERCENTAGE;

    // Get current hour's pool
    const pool = await getCurrentHourPool();

    // Update pool with new fees
    await prisma.hourlyRewardPool.update({
      where: { id: pool.id },
      data: {
        totalCreatorRewards: {
          increment: creatorFeesSOL
        },
        poolAmount: {
          increment: poolAmount
        },
        platformAmount: {
          increment: platformAmount
        }
      }
    });

    console.log(`💰 Recorded ${creatorFeesSOL} SOL creator fees from ${source}`);
    console.log(`   └─ Pool (100%): ${poolAmount.toFixed(6)} SOL`);

    return {
      success: true,
      hourlyPoolAmount: poolAmount,
      platformAmount: platformAmount,
      totalFees: creatorFeesSOL
    };
  } catch (error: any) {
    console.error("❌ Failed to record creator fees:", error);
    return {
      success: false,
      hourlyPoolAmount: 0,
      platformAmount: 0,
      totalFees: 0,
      error: error.message
    };
  }
}

/**
 * Monitor pump.fun creator wallet for incoming fee transactions
 *
 * NOTE: This is a simplified version. In production, you should:
 * 1. Use Helius webhooks to track transactions
 * 2. Parse transaction logs to identify creator fee payments
 * 3. Run this as a continuous background service
 *
 * For now, this can be called manually when you detect creator fees
 */
export async function monitorCreatorWallet() {
  if (!isRewardCollectorEnabled()) {
    console.warn("⚠️ Creator wallet monitoring disabled - missing configuration");
    return;
  }

  try {
    const creatorPubkey = new PublicKey(PUMPFUN_CREATOR_WALLET!);

    // Get recent signatures for the creator wallet
    const signatures = await connection.getSignaturesForAddress(creatorPubkey, {
      limit: 10
    });

    console.log(`📡 Monitoring ${signatures.length} recent transactions for creator wallet`);

    for (const sigInfo of signatures) {
      // In production, you would:
      // 1. Parse each transaction to identify creator fee payments
      // 2. Extract the fee amount
      // 3. Call recordCreatorFees() with the amount
      // 4. Mark the transaction as processed to avoid duplicates

      // Example (pseudo-code):
      // const tx = await connection.getParsedTransaction(sigInfo.signature);
      // const creatorFee = extractCreatorFeeFromTransaction(tx);
      // if (creatorFee > 0) {
      //   await recordCreatorFees(creatorFee / LAMPORTS_PER_SOL, "pump.fun");
      // }
    }

    console.log("✅ Creator wallet monitoring cycle complete");
  } catch (error: any) {
    console.error("❌ Failed to monitor creator wallet:", error);
  }
}

/**
 * Manual fee recording endpoint (for testing or manual fee injection)
 *
 * This can be called from an admin API endpoint to manually record fees
 */
export async function manuallyRecordFees(amountSOL: number, adminKey?: string) {
  // Verify admin key in production
  const expectedAdminKey = process.env.ADMIN_KEY;
  if (expectedAdminKey && adminKey !== expectedAdminKey) {
    throw new Error("Unauthorized: Invalid admin key");
  }

  return await recordCreatorFees(amountSOL, "manual");
}

/**
 * Get current pool balance and stats
 */
export async function getPoolStats() {
  const pool = await getCurrentHourPool();

  return {
    poolId: pool.id,
    hourStart: pool.hourStart,
    hourEnd: pool.hourEnd,
    totalCreatorRewards: parseFloat(pool.totalCreatorRewards.toString()),
    poolAmount: parseFloat(pool.poolAmount.toString()),
    platformAmount: parseFloat(pool.platformAmount.toString()),
    distributed: pool.distributed
  };
}

// ============================================================
// INTEGRATION INSTRUCTIONS
// ============================================================

/*

## How to integrate with pump.fun creator fees:

### Option 1: Helius Webhooks (Recommended)
1. Set up Helius webhook for your PUMPFUN_CREATOR_WALLET address
2. Configure webhook to notify your backend on incoming SOL transfers
3. In webhook handler, call recordCreatorFees() with the received amount

### Option 2: Polling (Simple)
1. Run monitorCreatorWallet() on a cron schedule (e.g., every 5 minutes)
2. Enhance it to parse transactions and extract creator fee amounts
3. Automatically record fees when detected

### Option 3: PumpPortal Integration
Since you're already using PumpPortal for trading:
1. Calculate creator fees from your own trade executions
2. Call recordCreatorFees() after each trade that generates creator fees
3. Creator fee = 1% of trade volume (or whatever pump.fun charges)

Example for Option 3:
```typescript
// In your pumpPortalTradeService.ts after executing a trade:
const creatorFee = tradeVolume * 0.01; // 1% creator fee
await recordCreatorFees(creatorFee, "pumpportal-trade");
```

### Testing locally:
```bash
# Manually inject test fees (development only)
curl -X POST http://localhost:8000/api/rewards/admin/record-fees \
  -H "Content-Type: application/json" \
  -d '{"amountSOL": 0.5, "adminKey": "your-admin-key"}'
```

*/
