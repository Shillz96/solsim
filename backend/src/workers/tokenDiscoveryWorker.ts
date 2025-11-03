/**
 * Token Discovery Worker - Entry Point
 *
 * This file has been refactored from 1830 lines to use a modular architecture.
 * All logic has been moved to backend/src/workers/tokenDiscovery/
 *
 * CHANGES:
 * ✅ Fixed SQL injection vulnerability (utils/batchUpdate.ts)
 * ✅ Fixed memory leak in txCountMap (utils/txCountManager.ts)
 * ✅ Modular architecture with dependency injection
 * ✅ All components are now testable
 * ✅ Configuration externalized with environment variables
 *
 * See: backend/src/workers/tokenDiscovery/README.md for full documentation
 * Original file backed up as: tokenDiscoveryWorker.ts.backup
 */

import TokenDiscoveryWorker from './tokenDiscovery/index.js';

// Create and start the worker
const worker = new TokenDiscoveryWorker();

worker.start().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

// Shutdown handlers
process.on('SIGTERM', () => worker.stop('SIGTERM'));
process.on('SIGINT', () => worker.stop('SIGINT'));

// Export for use in other modules (if needed)
export default worker;
