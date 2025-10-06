/**
 * Metadata Backfill Migration Script
 * 
 * This script identifies and fixes missing token metadata in existing trades
 * Ensures all trades have proper tokenSymbol and tokenName populated
 */

import prisma from '../lib/prisma.js';
import { MetadataService } from '../services/metadataService.js';

async function backfillMissingMetadata() {
  console.log('🔍 Starting metadata backfill migration...');
  const metadataService = new MetadataService();
  
  try {
    // Find all trades missing metadata
    const tradesWithMissingMetadata = await prisma.trade.findMany({
      where: {
        OR: [
          { tokenSymbol: null },
          { tokenName: null },
          { tokenSymbol: '' },
          { tokenName: '' }
        ]
      },
      select: {
        id: true,
        tokenAddress: true,
        tokenSymbol: true,
        tokenName: true,
        timestamp: true
      },
      orderBy: { timestamp: 'desc' }
    });
    
    if (tradesWithMissingMetadata.length === 0) {
      console.log('✅ No trades with missing metadata found. Migration complete.');
      return;
    }
    
    console.log(`📊 Found ${tradesWithMissingMetadata.length} trades with missing metadata`);
    
    // Group by token address to avoid duplicate API calls
    const uniqueTokens = [...new Set(tradesWithMissingMetadata.map(t => t.tokenAddress))];
    console.log(`🔄 Processing ${uniqueTokens.length} unique tokens...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Process each unique token
    for (let i = 0; i < uniqueTokens.length; i++) {
      const tokenAddress = uniqueTokens[i];
      
      try {
        console.log(`[${i + 1}/${uniqueTokens.length}] Fetching metadata for ${tokenAddress.substring(0, 8)}...`);
        
        // Get metadata using simple metadata service
        const metadata = await metadataService.getMetadata(tokenAddress);
        
        // Update all trades for this token
        const tradesForToken = tradesWithMissingMetadata.filter(t => t.tokenAddress === tokenAddress);
        
        const updateResult = await prisma.trade.updateMany({
          where: {
            tokenAddress: tokenAddress,
            OR: [
              { tokenSymbol: null },
              { tokenName: null },
              { tokenSymbol: '' },
              { tokenName: '' }
            ]
          },
          data: {
            tokenSymbol: metadata.symbol,
            tokenName: metadata.name
          }
        });
        
        console.log(`✅ Updated ${updateResult.count} trades for ${metadata.symbol} (${metadata.name})`);
        successCount += updateResult.count;
        
        // Small delay to avoid overwhelming APIs
        if (i < uniqueTokens.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`❌ Failed to update metadata for ${tokenAddress.substring(0, 8)}:`, error);
        
        // Use fallback metadata even on error
        try {
          const fallbackSymbol = tokenAddress.substring(0, 8).toUpperCase();
          const fallbackName = `Token ${tokenAddress.substring(0, 8)}`;
          
          const fallbackResult = await prisma.trade.updateMany({
            where: {
              tokenAddress: tokenAddress,
              OR: [
                { tokenSymbol: null },
                { tokenName: null },
                { tokenSymbol: '' },
                { tokenName: '' }
              ]
            },
            data: {
              tokenSymbol: fallbackSymbol,
              tokenName: fallbackName
            }
          });
          
          console.log(`🔄 Applied fallback metadata to ${fallbackResult.count} trades for ${fallbackSymbol}`);
          successCount += fallbackResult.count;
          
        } catch (fallbackError) {
          console.error(`❌ Even fallback metadata failed for ${tokenAddress.substring(0, 8)}:`, fallbackError);
          errorCount++;
        }
      }
    }
    
    // Summary
    console.log('\n📊 Metadata Backfill Migration Summary:');
    console.log(`✅ Successfully updated: ${successCount} trades`);
    console.log(`❌ Failed updates: ${errorCount} tokens`);
    console.log(`🎯 Total unique tokens processed: ${uniqueTokens.length}`);
    
    // Verify results
    const remainingMissingMetadata = await prisma.trade.count({
      where: {
        OR: [
          { tokenSymbol: null },
          { tokenName: null },
          { tokenSymbol: '' },
          { tokenName: '' }
        ]
      }
    });
    
    console.log(`📈 Remaining trades with missing metadata: ${remainingMissingMetadata}`);
    
    if (remainingMissingMetadata === 0) {
      console.log('🎉 Migration completed successfully! All trades now have metadata.');
    } else {
      console.log('⚠️ Some trades still have missing metadata. Manual review may be needed.');
    }
    
  } catch (error) {
    console.error('❌ Metadata backfill migration failed:', error);
    throw error;
  }
}

// Run migration if called directly (CommonJS)
if (require.main === module) {
  backfillMissingMetadata()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { backfillMissingMetadata };