// EMERGENCY DISTRIBUTION - Pay the wallets NOW!
import prisma from './src/plugins/prisma.js';
import { runHourlyDistribution } from './src/workers/hourlyRewardWorker.js';

async function emergencyDistribution() {
  try {
    console.log('🚨 EMERGENCY DISTRIBUTION STARTING NOW!');
    console.log('⏰ Time:', new Date().toISOString());
    
    // Run the distribution immediately
    await runHourlyDistribution();
    
    console.log('✅ EMERGENCY DISTRIBUTION COMPLETED!');
    
  } catch (error) {
    console.error('❌ EMERGENCY DISTRIBUTION FAILED:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

emergencyDistribution();