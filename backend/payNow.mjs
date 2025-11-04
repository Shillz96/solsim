import('./dist/workers/hourlyRewardWorker.js')
  .then(m => m.runHourlyDistribution())
  .then(() => {
    console.log('✅ EMERGENCY DISTRIBUTION COMPLETED!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ EMERGENCY DISTRIBUTION FAILED:', err);
    process.exit(1);
  });