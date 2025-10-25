#!/usr/bin/env ts-node

/**
 * Chat Message Cleanup Script
 * 
 * This script cleans up old chat messages to prevent database growth.
 * Run this periodically (e.g., daily via cron job) to maintain performance.
 * 
 * Usage:
 *   npm run chat:cleanup
 *   npm run chat:cleanup -- --days=7
 *   npm run chat:cleanup -- --dry-run
 */

import { PrismaClient } from '@prisma/client';
import { cleanupOldMessages, getChatStatistics } from '../src/services/chatService.js';

const prisma = new PrismaClient();

interface CleanupOptions {
  daysToKeep: number;
  dryRun: boolean;
  verbose: boolean;
}

async function parseArgs(): Promise<CleanupOptions> {
  const args = process.argv.slice(2);
  
  let daysToKeep = 30; // Default: keep 30 days
  let dryRun = false;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--days' && i + 1 < args.length) {
      daysToKeep = parseInt(args[i + 1], 10);
      if (isNaN(daysToKeep) || daysToKeep < 1) {
        console.error('❌ --days must be a positive number');
        process.exit(1);
      }
      i++; // Skip next argument
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Chat Message Cleanup Script

Usage: npm run chat:cleanup [options]

Options:
  --days=N        Keep messages from last N days (default: 30)
  --dry-run        Show what would be deleted without actually deleting
  --verbose, -v    Show detailed output
  --help, -h       Show this help message

Examples:
  npm run chat:cleanup                    # Keep 30 days, delete older
  npm run chat:cleanup -- --days=7       # Keep 7 days, delete older
  npm run chat:cleanup -- --dry-run      # Show what would be deleted
  npm run chat:cleanup -- --days=7 -v    # Keep 7 days with verbose output
      `);
      process.exit(0);
    }
  }

  return { daysToKeep, dryRun, verbose };
}

async function main() {
  try {
    const options = await parseArgs();
    
    if (options.verbose) {
      console.log('🔧 Chat Cleanup Configuration:');
      console.log(`   Days to keep: ${options.daysToKeep}`);
      console.log(`   Dry run: ${options.dryRun}`);
      console.log(`   Verbose: ${options.verbose}`);
      console.log('');
    }

    // Get current statistics
    console.log('📊 Getting current chat statistics...');
    const stats = await getChatStatistics();
    
    console.log('📈 Current Chat Statistics:');
    console.log(`   Total messages: ${stats.totalMessages.toLocaleString()}`);
    console.log(`   Messages last 24h: ${stats.messagesLast24h.toLocaleString()}`);
    console.log(`   Messages last 7d: ${stats.messagesLast7d.toLocaleString()}`);
    console.log(`   Active rooms: ${stats.activeRooms}`);
    if (stats.oldestMessage) {
      console.log(`   Oldest message: ${stats.oldestMessage.toISOString()}`);
    }
    console.log('');

    if (options.dryRun) {
      console.log('🔍 DRY RUN - Calculating what would be deleted...');
      
      const cutoffDate = new Date(Date.now() - options.daysToKeep * 24 * 60 * 60 * 1000);
      const messagesToDelete = await prisma.chatMessage.count({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`📅 Messages older than ${options.daysToKeep} days (before ${cutoffDate.toISOString()}):`);
      console.log(`   Would delete: ${messagesToDelete.toLocaleString()} messages`);
      console.log(`   Would keep: ${(stats.totalMessages - messagesToDelete).toLocaleString()} messages`);
      
      if (messagesToDelete > 0) {
        const percentage = ((messagesToDelete / stats.totalMessages) * 100).toFixed(1);
        console.log(`   Reduction: ${percentage}% of total messages`);
      }
      
      console.log('\n✅ Dry run complete - no messages were deleted');
      return;
    }

    // Perform cleanup
    console.log(`🧹 Starting chat message cleanup (keeping ${options.daysToKeep} days)...`);
    const result = await cleanupOldMessages(options.daysToKeep);
    
    if (result.error) {
      console.error(`❌ Cleanup failed: ${result.error}`);
      process.exit(1);
    }

    console.log(`✅ Cleanup completed successfully!`);
    console.log(`   Deleted: ${result.deletedCount.toLocaleString()} messages`);
    
    // Show updated statistics
    if (options.verbose) {
      console.log('\n📊 Updated statistics:');
      const newStats = await getChatStatistics();
      console.log(`   Total messages: ${newStats.totalMessages.toLocaleString()}`);
      console.log(`   Messages last 24h: ${newStats.messagesLast24h.toLocaleString()}`);
      console.log(`   Active rooms: ${newStats.activeRooms}`);
    }

  } catch (error) {
    console.error('❌ Chat cleanup failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}
