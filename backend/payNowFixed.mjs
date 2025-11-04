import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Set the correct database URL
process.env.DATABASE_URL = 'postgresql://postgres:cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb@metro.proxy.rlwy.net:13936/railway';
process.env.PGPASSWORD = 'cmvCRszpAAfgyvOZaWrHrWJxeEvvYbZb';

// Load other env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env') });

console.log('🔥 EMERGENCY PAYOUT - PAYING WALLETS NOW!');
console.log('⏰ Time:', new Date().toISOString());
console.log('💾 Database:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@'));

import('./dist/workers/hourlyRewardWorker.js')
  .then(m => m.runHourlyDistribution())
  .then(() => {
    console.log('✅ EMERGENCY DISTRIBUTION COMPLETED!');
    console.log('💰 Check the logs above for payout details');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ EMERGENCY DISTRIBUTION FAILED:', err);
    console.error('Stack:', err.stack);
    process.exit(1);
  });