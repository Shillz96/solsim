// Script to trigger position rebuild via direct service call
import { rebuildPositions } from "../services/migrationService.js";

async function main() {
  console.log("🔧 Starting position data rebuild...\n");

  const result = await rebuildPositions();

  console.log("\n" + "=".repeat(60));
  console.log("REBUILD SUMMARY");
  console.log("=".repeat(60));
  console.log(`Success: ${result.success ? "✅ YES" : "❌ NO"}`);
  console.log(`Users Processed: ${result.usersProcessed}`);
  console.log(`Positions Fixed: ${result.positionsFixed}`);
  console.log(`Lots Created: ${result.lotsCreated}`);

  if (result.errors.length > 0) {
    console.log(`\n⚠️ Errors: ${result.errors.length}`);
    result.errors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }

  console.log("\n" + "=".repeat(60));

  process.exit(result.success ? 0 : 1);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
