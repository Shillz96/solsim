// Snapshot worker for daily reward distribution
import { Decimal } from "@prisma/client/runtime/library";
import { snapshotRewards } from "../src/services/rewardService.js";
import prisma from "../src/plugins/prisma.js";

// Validate required environment variables
function validateEnvironment() {
  const required = ['VSOL_TOKEN_MINT', 'REWARDS_WALLET_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function calculatePoolAmount(): Promise<Decimal> {
  try {
    // Get total trading volume for the day to calculate pool size
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const dailyVolume = await prisma.trade.aggregate({
      where: {
        createdAt: { gte: dayAgo }
      },
      _sum: { costUsd: true }
    });

    const volumeUsd = parseFloat(dailyVolume._sum.costUsd?.toString() || "0");

    // Pool = 0.1% of daily volume, minimum 10 VSOL, maximum 1,000 VSOL
    const poolFromVolume = volumeUsd * 0.001;
    const poolAmount = Math.max(10, Math.min(1000, poolFromVolume));

    console.log(`📊 Daily volume: $${volumeUsd.toFixed(2)} → Pool: ${poolAmount} VSOL`);

    return new Decimal(poolAmount);
  } catch (error) {
    console.warn("Failed to calculate dynamic pool, using default:", error);
    return new Decimal(100); // Default fallback for daily
  }
}

async function main() {
  try {
    console.log("🚀 Starting reward snapshot worker...");
    
    // Validate environment
    validateEnvironment();
    
    // Simple epoch calculation: days since start of year
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const epoch = Math.ceil((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    
    // Check if snapshot already exists for this epoch
    const existingSnapshot = await prisma.rewardSnapshot.findFirst({
      where: { epoch }
    });
    
    if (existingSnapshot) {
      console.log(`📊 Snapshot already exists for epoch ${epoch}, skipping`);
      process.exit(0);
    }
    
    // Calculate dynamic pool amount based on trading activity
    const poolAmount = await calculatePoolAmount();
    
    console.log(`📊 Snapshotting rewards for epoch ${epoch}, pool = ${poolAmount.toString()} VSOL`);
    
    await snapshotRewards(epoch, poolAmount);
    
    console.log("✅ Snapshot complete");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Snapshot worker failed:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('📊 Snapshot worker interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('📊 Snapshot worker terminated');
  process.exit(0);
});

main().catch((err) => {
  console.error("❌ Unhandled error:", err);
  process.exit(1);
});
