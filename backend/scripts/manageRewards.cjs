#!/usr/bin/env node
/**
 * Reward Management Helper Script
 *
 * Usage:
 *   node manageRewards.cjs status        - Check system status
 *   node manageRewards.cjs pool          - Check current hour pool
 *   node manageRewards.cjs inject 0.5    - Inject 0.5 SOL worth of fees
 *   node manageRewards.cjs distribute    - Manually trigger distribution (testing)
 *   node manageRewards.cjs last          - View last distribution results
 */

const ADMIN_KEY = process.env.ADMIN_KEY || 'f6886eebce5b82094c7dc49c83f678f1c21accfc921b13af67bb0d89649299c3';
const API_URL = process.env.API_URL || 'https://solsim-production.up.railway.app';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function checkStatus() {
  console.log('🔍 Checking system status...\n');
  const data = await fetchAPI('/api/rewards/admin/system-status');

  console.log('Configuration:');
  console.log(`  Wallet: ${data.configuration.walletAddress}`);
  console.log(`  Balance: ${data.configuration.walletBalance}`);
  console.log(`  Can Sign: ${data.configuration.canSignTransactions}`);
  console.log(`  Min Trades: ${data.configuration.minTradesRequired}`);
  console.log(`  Status: ${data.status}\n`);

  if (data.configuration.walletBalance === '0.000000 SOL') {
    console.log('⚠️  WARNING: Wallet has no balance!');
    console.log('   Fund it: https://solscan.io/account/' + data.configuration.walletAddress + '\n');
  }
}

async function checkPool() {
  console.log('💰 Checking current hour pool...\n');
  const data = await fetchAPI('/api/rewards/hourly/current-pool');

  console.log(`  Pool Amount: ${data.poolAmount} SOL (will be distributed to top 10)`);
  console.log(`  Platform Amount: ${data.platformAmount || '0'} SOL (tracked for accounting)`);
  console.log(`  Total Fees: ${data.totalCreatorRewards || '0'} SOL\n`);

  if (parseFloat(data.poolAmount) === 0) {
    console.log('ℹ️  Pool is empty. Use "inject" command to add fees.\n');
  }
}

async function injectFees(amountSOL) {
  const amount = parseFloat(amountSOL);

  if (isNaN(amount) || amount <= 0) {
    console.error('❌ Invalid amount. Must be a positive number.');
    console.log('   Example: node manageRewards.cjs inject 0.5\n');
    return;
  }

  console.log(`💉 Injecting ${amount} SOL worth of fees...\n`);
  console.log('   This will:');
  console.log(`   - Add ${(amount * 0.10).toFixed(4)} SOL to reward pool (10%)`);
  console.log(`   - Track ${(amount * 0.90).toFixed(4)} SOL as platform fees (90%)`);
  console.log('');

  const data = await fetchAPI('/api/rewards/admin/inject-fees', {
    method: 'POST',
    body: JSON.stringify({
      adminKey: ADMIN_KEY,
      amountSOL: amount
    })
  });

  console.log('✅ Fees injected successfully!');
  console.log(`   Pool Amount: ${data.poolAmount} SOL`);
  console.log(`   Platform Amount: ${data.platformAmount} SOL`);
  console.log(`   Total Fees: ${data.totalFees} SOL\n`);
}

async function triggerDistribution() {
  console.log('🎰 Triggering manual distribution...\n');
  console.log('⚠️  This will distribute the current pool to top 10 traders!');

  const data = await fetchAPI('/api/rewards/admin/test-distribution', {
    method: 'POST',
    body: JSON.stringify({
      adminKey: ADMIN_KEY
    })
  });

  console.log('✅ Distribution completed!');
  console.log(`   Time: ${data.timestamp}\n`);
}

async function viewLastDistribution() {
  console.log('🏆 Fetching last distribution...\n');
  const data = await fetchAPI('/api/rewards/hourly/last-distribution');

  if (!data.poolId) {
    console.log('ℹ️  No distributions have occurred yet.\n');
    return;
  }

  console.log(`Pool Amount: ${data.totalPoolAmount} SOL`);
  console.log(`Distributed: ${data.distributedAt}`);
  console.log(`Winners: ${data.winnersCount}\n`);

  if (data.winners.length > 0) {
    console.log('Top 10:');
    data.winners.forEach(w => {
      const status = w.status === 'COMPLETED' ? '✅' : '❌';
      console.log(`  ${status} ${w.rank}. ${w.handle}: ${parseFloat(w.rewardAmount).toFixed(6)} SOL (${parseFloat(w.profitPercent).toFixed(2)}%)`);
      if (w.txSignature) {
        console.log(`     Tx: https://solscan.io/tx/${w.txSignature}`);
      }
    });
  }
  console.log('');
}

async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];

  try {
    switch (command) {
      case 'status':
        await checkStatus();
        break;

      case 'pool':
        await checkPool();
        break;

      case 'inject':
        await injectFees(arg);
        break;

      case 'distribute':
        await triggerDistribution();
        break;

      case 'last':
        await viewLastDistribution();
        break;

      default:
        console.log('Reward Management Helper\n');
        console.log('Usage:');
        console.log('  node manageRewards.cjs status          - Check system status');
        console.log('  node manageRewards.cjs pool            - Check current hour pool');
        console.log('  node manageRewards.cjs inject <amount> - Inject fees (e.g., inject 0.5)');
        console.log('  node manageRewards.cjs distribute      - Manually trigger distribution');
        console.log('  node manageRewards.cjs last            - View last distribution\n');
        console.log('Examples:');
        console.log('  node manageRewards.cjs inject 0.5      - Record 0.5 SOL of creator fees');
        console.log('                                           (0.05 SOL to pool, 0.45 SOL to platform)\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
