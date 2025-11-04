// Quick test distribution script
const axios = require('axios');

async function testDistribution() {
  try {
    console.log('Testing reward distribution...');
    
    // Test the debug leaderboard first
    console.log('\n1. Checking leaderboard...');
    const leaderboard = await axios.get('https://solsim-production.up.railway.app/api/rewards/admin/debug-leaderboard');
    console.log(`Found ${leaderboard.data.usersWithWallets} users with wallets`);
    
    // Check system status
    console.log('\n2. Checking system status...');
    const status = await axios.get('https://solsim-production.up.railway.app/api/rewards/admin/system-status');
    console.log(`Wallet balance: ${status.data.configuration.walletBalance}`);
    console.log(`Status: ${status.data.status}`);
    
    // Check last distribution
    console.log('\n3. Checking last distribution...');
    const lastDist = await axios.get('https://solsim-production.up.railway.app/api/rewards/hourly/last-distribution');
    console.log(`Last distribution: ${lastDist.data.distributedAt || 'None'}`);
    console.log(`Winners: ${lastDist.data.winnersCount}`);
    
    if (lastDist.data.winners && lastDist.data.winners.length > 0) {
      console.log('\nRecent winners:');
      lastDist.data.winners.forEach((w, i) => {
        console.log(`  ${i + 1}. ${w.handle}: ${w.rewardAmount} SOL (${w.status})`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testDistribution();