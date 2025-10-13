import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function createPerformanceIndexes() {
  console.log('🚀 Starting database performance optimization...');

  try {
    // Read the SQL file
    const sqlFilePath = join(__dirname, 'performance-indexes.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf8');

    // Split into individual commands
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('SELECT'));

    console.log(`📊 Applying ${commands.length} performance indexes...`);

    for (const [index, command] of commands.entries()) {
      try {
        const indexName = command.match(/idx_[\w_]+/)?.[0] || `index_${index + 1}`;
        console.log(`  ⏳ Creating ${indexName}...`);
        
        await prisma.$executeRawUnsafe(command + ';');
        
        console.log(`  ✅ ${indexName} created successfully`);
      } catch (error: any) {
        // Skip if index already exists
        if (error.message?.includes('already exists')) {
          console.log(`  ⚠️  Index already exists, skipping...`);
          continue;
        }
        
        console.error(`  ❌ Error creating index:`, error.message);
        // Continue with other indexes even if one fails
      }
    }

    // Analyze the tables to update statistics after index creation
    console.log('📈 Updating table statistics...');
    await prisma.$executeRaw`ANALYZE trades, portfolio, position_lots, user_sessions, user_notes, reward_claims, wallet_tracking;`;

    console.log('✅ Database performance optimization completed!');
    console.log('📊 Query performance should be significantly improved for:');
    console.log('   - Trade history queries');
    console.log('   - Portfolio PnL calculations');
    console.log('   - FIFO position management');
    console.log('   - Leaderboard rankings');
    console.log('   - User session lookups');
    console.log('   - Recent activity feeds');
    
  } catch (error) {
    console.error('❌ Failed to optimize database performance:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createPerformanceIndexes()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createPerformanceIndexes };