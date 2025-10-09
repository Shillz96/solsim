// Snapshot worker for weekly reward distribution
import { Decimal } from "@prisma/client/runtime/library";
import { snapshotRewards } from "../src/services/rewardService.js";
import prisma from "../src/plugins/prisma.js";

// Validate required environment variables
function validateEnvironment() {
  const required = ['SIM_TOKEN_MINT', 'REWARDS_WALLET_SECRET', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function calculatePoolAmount(): Promise<Decimal> {
  try {
    // Get total trading volume for the week to calculate pool size
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyVolume = await prisma.trade.aggregate({
      where: {
        createdAt: { gte: weekAgo }
      },
      _sum: { costUsd: true }
    });
    
    const volumeUsd = parseFloat(weeklyVolume._sum.costUsd?.toString() || "0");
    
    // Pool = 0.1% of weekly volume, minimum 100 SIM, maximum 10,000 SIM
    const poolFromVolume = volumeUsd * 0.001;
    const poolAmount = Math.max(100, Math.min(10000, poolFromVolume));
    
    console.log(`📊 Weekly volume: $${volumeUsd.toFixed(2)} → Pool: ${poolAmount} SIM`);
    
    return new Decimal(poolAmount);
  } catch (error) {
    console.warn("Failed to calculate dynamic pool, using default:", error);
    return new Decimal(1000); // Default fallback
  }
}

async function main() {
  try {
    console.log("🚀 Starting reward snapshot worker...");
    
    // Validate environment
    validateEnvironment();
    
    // Simple epoch calculation: weeks since Unix epoch
    const now = new Date();
    const epoch = Math.floor(now.getTime() / (7 * 24 * 60 * 60 * 1000));
    
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
    
    console.log(`📊 Snapshotting rewards for epoch ${epoch}, pool = ${poolAmount.toString()} SIM`);
    
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
