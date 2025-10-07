#!/usr/bin/env node
/**
 * Migration Script: Convert existing holdings to transaction history for FIFO tracking
 * 
 * This script:
 * 1. Creates initial TransactionHistory records from existing holdings
 * 2. Marks them as 'MIGRATED' type for identification
 * 3. Sets up the foundation for FIFO cost basis tracking
 * 
 * Run with: npx tsx scripts/migrate-to-fifo.ts
 */

import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { transactionService } from '../src/services/transactionService.js';
import { logger } from '../src/utils/logger.js';
import chalk from 'chalk';

const prisma = new PrismaClient();

async function migrateToFIFO() {
  console.log(chalk.bold.cyan('\n📦 FIFO Migration Script\n'));
  console.log(chalk.yellow('This script will migrate existing holdings to transaction history for FIFO tracking.\n'));

  try {
    // Step 1: Get all users with holdings
    console.log(chalk.blue('Step 1: Fetching users with holdings...'));
    const usersWithHoldings = await prisma.user.findMany({
      where: {
        holdings: {
          some: {
            quantity: { gt: 0 }
          }
        }
      },
      include: {
        holdings: {
          where: {
            quantity: { gt: 0 }
          }
        }
      }
    });

    console.log(chalk.green(`Found ${usersWithHoldings.length} users with active holdings\n`));

    // Step 2: Migrate each user's holdings
    let totalMigrated = 0;
    let totalSkipped = 0;
    
    for (const user of usersWithHoldings) {
      console.log(chalk.blue(`\nProcessing user: ${user.username} (${user.id})`));
      console.log(chalk.gray(`  Holdings to migrate: ${user.holdings.length}`));

      for (const holding of user.holdings) {
        try {
          // Check if transactions already exist for this token
          const existingTxCount = await prisma.transactionHistory.count({
            where: {
              userId: user.id,
              tokenAddress: holding.tokenAddress,
            }
          });

          if (existingTxCount > 0) {
            console.log(chalk.yellow(`  ⚠️  Skipping ${holding.tokenSymbol || holding.tokenAddress.slice(0, 8)} - already has transaction history`));
            totalSkipped++;
            continue;
          }

          // Get current SOL price for conversion (or use estimate)
          const SOL_PRICE_ESTIMATE = 240; // Default estimate for migration
          
          // Convert USD entry price to SOL
          // Note: entryPrice in holdings is stored as USD per token
          const entryPriceUsd = new Decimal(holding.entryPrice);
          const pricePerTokenSol = entryPriceUsd.div(SOL_PRICE_ESTIMATE);
          const quantity = new Decimal(holding.quantity);
          const totalCostSol = quantity.mul(pricePerTokenSol);

          // Create MIGRATED transaction
          await prisma.transactionHistory.create({
            data: {
              userId: user.id,
              tokenAddress: holding.tokenAddress,
              tokenSymbol: holding.tokenSymbol,
              tokenName: holding.tokenName,
              action: 'MIGRATED',
              quantity: quantity,
              pricePerTokenSol: pricePerTokenSol,
              totalCostSol: totalCostSol,
              feesSol: new Decimal(0),
              remainingQuantity: quantity, // Full quantity available for FIFO
              costBasisSol: totalCostSol,
              realizedPnLSol: null,
              tradeId: null,
              executedAt: holding.updatedAt, // Use holding's last update as execution time
            }
          });

          console.log(chalk.green(`  ✅ Migrated ${holding.tokenSymbol || holding.tokenAddress.slice(0, 8)}: ${quantity} tokens at ${pricePerTokenSol.toFixed(6)} SOL/token`));
          totalMigrated++;

        } catch (error: any) {
          console.log(chalk.red(`  ❌ Failed to migrate ${holding.tokenSymbol}: ${error.message}`));
        }
      }
    }

    // Step 3: Verify migration
    console.log(chalk.blue('\n\nStep 3: Verifying migration...'));
    
    const migratedCount = await prisma.transactionHistory.count({
      where: { action: 'MIGRATED' }
    });

    const totalTransactions = await prisma.transactionHistory.count();
    
    console.log(chalk.cyan('\n📊 Migration Summary:'));
    console.log(chalk.white('  Total holdings migrated:     '), chalk.green(totalMigrated));
    console.log(chalk.white('  Holdings skipped (existing): '), chalk.yellow(totalSkipped));
    console.log(chalk.white('  Total MIGRATED transactions: '), chalk.green(migratedCount));
    console.log(chalk.white('  Total transactions in DB:    '), chalk.cyan(totalTransactions));

    // Step 4: Check for any holdings without transactions
    const orphanedHoldings = await prisma.holding.findMany({
      where: {
        quantity: { gt: 0 },
        NOT: {
          tokenAddress: {
            in: await prisma.transactionHistory.findMany({
              select: { tokenAddress: true },
              distinct: ['tokenAddress'],
            }).then(txs => txs.map(tx => tx.tokenAddress))
          }
        }
      }
    });

    if (orphanedHoldings.length > 0) {
      console.log(chalk.yellow(`\n⚠️  Warning: ${orphanedHoldings.length} holdings still without transaction history`));
      orphanedHoldings.forEach(h => {
        console.log(chalk.gray(`  - ${h.tokenSymbol || h.tokenAddress.slice(0, 8)} (User: ${h.userId})`));
      });
    } else {
      console.log(chalk.green('\n✅ All holdings have corresponding transaction history!'));
    }

    console.log(chalk.bold.green('\n🎉 Migration completed successfully!\n'));

  } catch (error: any) {
    console.error(chalk.red('\n❌ Migration failed:'), error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Add command to clear migration if needed
async function clearMigration() {
  console.log(chalk.bold.red('\n⚠️  Clearing MIGRATED transactions\n'));
  
  const result = await prisma.transactionHistory.deleteMany({
    where: { action: 'MIGRATED' }
  });
  
  console.log(chalk.yellow(`Deleted ${result.count} MIGRATED transactions\n`));
}

// Main execution
const command = process.argv[2];

if (command === 'clear') {
  clearMigration().catch(console.error);
} else if (command === 'help') {
  console.log(chalk.cyan('\nUsage:'));
  console.log('  npx tsx scripts/migrate-to-fifo.ts        # Run migration');
  console.log('  npx tsx scripts/migrate-to-fifo.ts clear  # Clear MIGRATED transactions');
  console.log('  npx tsx scripts/migrate-to-fifo.ts help   # Show this help\n');
} else {
  migrateToFIFO().catch(console.error);
}
