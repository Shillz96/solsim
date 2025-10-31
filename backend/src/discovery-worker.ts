/**
 * Token Discovery Worker Entry Point
 * 
 * Standalone service that runs the TokenDiscoveryWorker.
 * This listens to PumpPortal WebSocket for new tokens and enriches their metadata.
 * 
 * Deploy this as a separate Railway service using railway-discovery.json
 */

// Import and run the token discovery worker
import './workers/tokenDiscoveryWorker.js';

console.log('🚀 Token Discovery Worker service starting...');
