/**
 * Utility script to clean up old wallet activities without images
 * Run this once to remove legacy data from before image filtering was implemented
 *
 * Usage: npx tsx src/utils/cleanupWalletActivities.ts
 */

import prisma from "../plugins/prisma.js";

async function cleanupActivitiesWithoutImages() {
  console.log("🧹 Starting cleanup of wallet activities without images...\n");

  try {
    // Find activities without images
    const activitiesWithoutImages = await prisma.walletActivity.findMany({
      where: {
        OR: [
          {
            type: "BUY",
            tokenOutLogoURI: null,
          },
          {
            type: "SELL",
            tokenInLogoURI: null,
          },
          {
            type: "SWAP",
            AND: [
              { tokenInLogoURI: null },
              { tokenOutLogoURI: null },
            ],
          },
        ],
      },
      select: {
        id: true,
        signature: true,
        type: true,
        walletAddress: true,
        timestamp: true,
      },
    });

    console.log(`Found ${activitiesWithoutImages.length} activities without images`);

    if (activitiesWithoutImages.length === 0) {
      console.log("✅ No cleanup needed - all activities have images!");
      return;
    }

    // Show sample of what will be deleted
    console.log("\nSample of activities to be deleted:");
    activitiesWithoutImages.slice(0, 5).forEach((activity) => {
      console.log(`  - ${activity.type} | ${activity.signature.slice(0, 8)}... | ${activity.timestamp}`);
    });

    // Confirm deletion
    console.log(`\n⚠️  This will DELETE ${activitiesWithoutImages.length} activities from the database.`);
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n");

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Delete activities
    const result = await prisma.walletActivity.deleteMany({
      where: {
        OR: [
          {
            type: "BUY",
            tokenOutLogoURI: null,
          },
          {
            type: "SELL",
            tokenInLogoURI: null,
          },
          {
            type: "SWAP",
            AND: [
              { tokenInLogoURI: null },
              { tokenOutLogoURI: null },
            ],
          },
        ],
      },
    });

    console.log(`✅ Successfully deleted ${result.count} activities without images`);
    console.log("\n🎉 Cleanup complete! Your wallet tracker will now only show activities with images.");
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run cleanup
cleanupActivitiesWithoutImages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
