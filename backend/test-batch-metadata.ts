/**
 * Test batch metadata fetching with the new getAssetBatch implementation
 */
import dotenv from 'dotenv';

// Load environment variables FIRST (before importing the service)
dotenv.config();

// Enable debug logging
process.env.LOG_LEVEL = 'debug';

async function testBatchMetadata() {
  // Dynamic import AFTER env vars are loaded
  const { solanaTokenMetadataService } = await import('./src/services/solanaTokenMetadataService.js');
  console.log('🧪 Testing Batch Metadata Fetching with getAssetBatch...\n');
  console.log(`🔧 SOLANA_RPC: ${process.env.SOLANA_RPC?.slice(0, 50)}...`);
  console.log(`🔧 HELIUS_RPC_URL: ${process.env.HELIUS_RPC_URL || 'NOT SET'}\n`);

  // Test with multiple tokens (mix of tokens with and without metadata)
  const testTokens = [
    'H1R9HvnBsTnAAxAtUr7RHRYRrv3Sq5wVRTH3pbzKCkxG', // Opta
    '77SDHo2kgfNiYbR4bCPLLaDtjZ22ucTPsD3zFRB5c3Gu', // TRANSFORMATION AI
    'btdmkYKN8tiaAwfjut1roziX1HTDPhKPAXnQukD7ACN',  // Arcan402
    '4m7guKQVFESRsBJbECvCP1dT7PtJrwBE1B4Qys9jw81d', // Token without metadata
  ];

  console.log(`📦 Fetching metadata for ${testTokens.length} tokens in batch...\n`);

  const startTime = Date.now();
  const results = await solanaTokenMetadataService.batchFetchMetadata(testTokens);
  const duration = Date.now() - startTime;

  console.log(`✅ Batch fetch completed in ${duration}ms\n`);
  console.log(`📊 Results (${results.size} tokens):\n`);

  if (results.size === 0) {
    console.log('⚠️ No results returned from batch fetch!');
    process.exit(1);
  }

  for (const [mint, metadata] of results.entries()) {
    const shortMint = mint.slice(0, 8) + '...' + mint.slice(-8);
    console.log(`📍 Token: ${shortMint}`);
    console.log(`  Name: ${metadata.name || 'N/A'}`);
    console.log(`  Symbol: ${metadata.symbol || 'N/A'}`);
    console.log(`  Description: ${metadata.description ? metadata.description.slice(0, 80) + '...' : 'N/A'}`);
    console.log(`  Image: ${metadata.imageUrl ? '✅' : '❌'}`);
    console.log('');
  }

  console.log(`✅ Batch metadata test completed!`);
  console.log(`📊 Performance: ${duration}ms for ${testTokens.length} tokens (~${Math.round(duration / testTokens.length)}ms per token)`);

  process.exit(0);
}

testBatchMetadata();
