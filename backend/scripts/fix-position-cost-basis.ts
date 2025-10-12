#!/usr/bin/env npx tsx
// Script to fix position cost basis calculation
// Converts from average-cost-per-unit to total-cost-basis format

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

async function fixPositionCostBasis() {
  console.log('Starting position cost basis migration...');
  
  try {
    const positions = await prisma.position.findMany({
      where: {
        qty: { gt: 0 }
      }
    });

    console.log(`Found ${positions.length} positions to check`);

    let updatedCount = 0;

    for (const position of positions) {
      const qty = position.qty as Decimal;
      const currentCostBasis = position.costBasis as Decimal;
      
      // If the cost basis is less than qty, it's likely stored as average cost per unit
      // Convert it to total cost basis
      if (currentCostBasis.gt(0) && currentCostBasis.lt(qty)) {
        const newTotalCostBasis = qty.mul(currentCostBasis);
        
        console.log(`Updating position ${position.id}:
          Mint: ${position.mint}
          Qty: ${qty.toString()}
          Old Cost Basis (avg/unit): ${currentCostBasis.toString()}
          New Cost Basis (total): ${newTotalCostBasis.toString()}`);

        await prisma.position.update({
          where: { id: position.id },
          data: { costBasis: newTotalCostBasis }
        });

        updatedCount++;
      }
    }

    console.log(`Migration completed. Updated ${updatedCount} positions.`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Run the migration if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPositionCostBasis();
}