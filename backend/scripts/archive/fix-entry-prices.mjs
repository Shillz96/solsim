/**
 * Fix incorrect entry prices in the database
 * Entry prices should be in SOL but some old data has USD values
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixEntryPrices() {
  try {
    console.log('🔧 Starting entry price fix...');
    
    // Get current SOL price (you can update this)
    const SOL_PRICE_USD = 240;
    
    // Find all holdings
    const holdings = await prisma.holding.findMany({
      select: {
        id: true,
        tokenSymbol: true,
        tokenAddress: true,
        entryPrice: true,
        quantity: true
      }
    });
    
    console.log(`📊 Found ${holdings.length} holdings to check`);
    
    let fixed = 0;
    let skipped = 0;
    
    for (const holding of holdings) {
      const entryPrice = parseFloat(holding.entryPrice.toString());
      
      // If entry price > 1 SOL, it's likely in USD and needs conversion
      // Most memecoins cost much less than 1 SOL per token
      if (entryPrice > 1.0) {
        const correctedPrice = entryPrice / SOL_PRICE_USD;
        
        console.log(`  Fixing ${holding.tokenSymbol}: ${entryPrice} → ${correctedPrice} SOL`);
        
        await prisma.holding.update({
          where: { id: holding.id },
          data: { entryPrice: correctedPrice }
        });
        
        fixed++;
      } else {
        skipped++;
      }
    }
    
    console.log(`\n✅ Fixed ${fixed} holdings`);
    console.log(`⏭️  Skipped ${skipped} holdings (already correct)`);
    console.log('\n🎉 Database fix complete!');
    
  } catch (error) {
    console.error('❌ Error fixing entry prices:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixEntryPrices()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
