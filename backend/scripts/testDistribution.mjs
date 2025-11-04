#!/usr/bin/env node
/**
 * Test the hourly reward distribution with detailed logging
 */

import { runHourlyDistribution } from '../src/workers/hourlyRewardWorker.js';

async function testDistribution() {
  console.log('🧪 Testing hourly reward distribution...\n');

  try {
    console.log('📊 Starting distribution process...');
    await runHourlyDistribution();
    console.log('✅ Distribution process completed successfully');
  } catch (error) {
    console.error('❌ Distribution failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testDistribution();