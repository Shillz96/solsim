/**
 * Test script for the new Solana Token Metadata Service
 * Tests fetching metadata for tokens that are currently missing data
 */

import dotenv from 'dotenv';
import { solanaTokenMetadataService } from './src/services/solanaTokenMetadataService.js';

dotenv.config();

async function testTokenMetadata() {
  console.log('🧪 Testing Solana Token Metadata Service...\n');

  // Test with some real tokens from the production API that are missing metadata
  const testTokens = [
    '4m7guKQVFESRsBJbECvCP1dT7PtJrwBE1B4Qys9jw81d', // Token with missing metadata
    'H1R9HvnBsTnAAxAtUr7RHRYRrv3Sq5wVRTH3pbzKCkxG', // Opta - has some metadata
    '77SDHo2kgfNiYbR4bCPLLaDtjZ22ucTPsD3zFRB5c3Gu', // TRANSFORMATION AI - has metadata
    'btdmkYKN8tiaAwfjut1roziX1HTDPhKPAXnQukD7ACN', // Arcan402 - new token with metadata
  ];

  for (const mint of testTokens) {
    console.log(`\n📍 Testing token: ${mint}`);
    
    try {
      const metadata = await solanaTokenMetadataService.getCompleteTokenMetadata(mint);
      
      console.log('✅ Results:');
      console.log(`  Name: ${metadata.name || 'N/A'}`);
      console.log(`  Symbol: ${metadata.symbol || 'N/A'}`);
      console.log(`  Description: ${metadata.description ? metadata.description.slice(0, 100) + '...' : 'N/A'}`);
      console.log(`  Image URL: ${metadata.imageUrl || 'N/A'}`);
      console.log(`  URI: ${metadata.uri || 'N/A'}`);
      
      // Test if metadata account exists
      const hasMetadata = await solanaTokenMetadataService.hasMetadataAccount(mint);
      console.log(`  Has Metadata Account: ${hasMetadata}`);
      
    } catch (error) {
      console.error(`❌ Error testing ${mint}:`, error);
    }
  }
}

testTokenMetadata()
  .then(() => {
    console.log('\n✅ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });