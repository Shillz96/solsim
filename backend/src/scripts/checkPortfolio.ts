// Script to check portfolio quantities and data integrity
import prisma from "../plugins/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";

async function checkPortfolioData(userId: string) {
  console.log("\n=== Portfolio Data Check ===");
  console.log(`User ID: ${userId}`);

  // Get user data
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    console.log("❌ User not found!");
    return;
  }

  console.log(`\n📊 User Balance: ${user.virtualSolBalance} SOL`);

  // Get positions
  const positions = await prisma.position.findMany({
    where: { userId },
    include: {
      lots: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  console.log(`\n📈 Found ${positions.length} positions:`);

  for (const position of positions) {
    const qty = position.qty as Decimal;
    const costBasis = position.costBasis as Decimal;
    const avgCost = qty.gt(0) ? costBasis.div(qty) : new Decimal(0);

    console.log(`\n🪙 Token: ${position.mint.substring(0, 8)}...`);
    console.log(`   Quantity: ${qty.toString()} (raw)`);
    console.log(`   Quantity: ${qty.toNumber().toLocaleString()} (formatted)`);
    console.log(`   Cost Basis: $${costBasis.toString()}`);
    console.log(`   Avg Cost: $${avgCost.toString()}`);

    // Check lots
    if (position.lots && position.lots.length > 0) {
      console.log(`   📦 Lots (${position.lots.length}):`);

      let totalLotQty = new Decimal(0);
      let totalLotCost = new Decimal(0);

      for (const lot of position.lots) {
        const lotQty = lot.qtyRemaining as Decimal;
        const unitCost = lot.unitCostUsd as Decimal;
        const lotCost = lotQty.mul(unitCost);

        totalLotQty = totalLotQty.add(lotQty);
        totalLotCost = totalLotCost.add(lotCost);

        console.log(`      Lot ${lot.id}: ${lotQty.toString()} @ $${unitCost.toString()} = $${lotCost.toString()}`);
      }

      console.log(`   📊 Total from lots:`);
      console.log(`      Quantity: ${totalLotQty.toString()}`);
      console.log(`      Cost: $${totalLotCost.toString()}`);

      // Check consistency
      if (!totalLotQty.eq(qty)) {
        console.log(`   ⚠️ WARNING: Lot quantity (${totalLotQty}) doesn't match position quantity (${qty})`);
      }
      if (!totalLotCost.eq(costBasis)) {
        console.log(`   ⚠️ WARNING: Lot cost basis (${totalLotCost}) doesn't match position cost basis (${costBasis})`);
      }
    }
  }

  // Get recent trades
  const recentTrades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(`\n📝 Recent Trades (last 5):`);
  for (const trade of recentTrades) {
    const qty = trade.quantity as Decimal;
    const price = trade.price as Decimal;
    const totalCost = trade.totalCost as Decimal;

    console.log(`\n   ${trade.side} ${qty.toString()} tokens @ $${price.toString()}`);
    console.log(`   Total: ${totalCost.toString()} SOL`);
    console.log(`   Mint: ${trade.mint.substring(0, 8)}...`);
    console.log(`   Time: ${trade.createdAt.toISOString()}`);
  }

  // Check for data issues
  console.log("\n\n=== Data Integrity Check ===");

  // Check for positions with negative quantities
  const negativePositions = await prisma.position.findMany({
    where: { userId, qty: { lt: 0 } }
  });

  if (negativePositions.length > 0) {
    console.log(`❌ Found ${negativePositions.length} positions with negative quantities!`);
    for (const pos of negativePositions) {
      console.log(`   ${pos.mint}: ${pos.qty}`);
    }
  } else {
    console.log("✅ No negative position quantities found");
  }

  // Check for lots with negative quantities
  const negativeLots = await prisma.positionLot.findMany({
    where: { userId, qtyRemaining: { lt: 0 } }
  });

  if (negativeLots.length > 0) {
    console.log(`❌ Found ${negativeLots.length} lots with negative quantities!`);
    for (const lot of negativeLots) {
      console.log(`   Lot ${lot.id}: ${lot.qtyRemaining}`);
    }
  } else {
    console.log("✅ No negative lot quantities found");
  }
}

// Run the check
const userId = process.argv[2];
if (!userId) {
  console.error("Usage: tsx checkPortfolio.ts <userId>");
  console.error("Example: tsx checkPortfolio.ts e072a09b-f94f-42a5-870c-1f9e3135a215");
  process.exit(1);
}

checkPortfolioData(userId)
  .then(() => {
    console.log("\n✅ Check complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });