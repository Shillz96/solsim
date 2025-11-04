/**
 * Manual Metadata Enrichment Script
 * 
 * Enriches tokens with missing metadata using our new Solana metadata service
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { solanaTokenMetadataService } from './src/services/solanaTokenMetadataService.js';

dotenv.config();

async function enrichMissingMetadata() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Finding tokens with missing metadata...\n');

  try {
    // Find tokens that are missing basic metadata
    const tokensNeedingEnrichment = await prisma.tokenDiscovery.findMany({
      where: {
        OR: [
          { name: null },
          { symbol: null },
          { imageUrl: null },
          { description: null }
        ]
      },
      select: {
        mint: true,
        name: true,
        symbol: true,
        imageUrl: true,
        description: true
      },
      take: 10 // Process 10 at a time for testing
    });

    console.log(`Found ${tokensNeedingEnrichment.length} tokens that need metadata enrichment`);

    for (const token of tokensNeedingEnrichment) {
      console.log(`\n📍 Processing token: ${token.mint}`);
      console.log(`  Current state:`);
      console.log(`    Name: ${token.name || 'N/A'}`);
      console.log(`    Symbol: ${token.symbol || 'N/A'}`);
      console.log(`    Image: ${token.imageUrl ? 'Has image' : 'N/A'}`);
      console.log(`    Description: ${token.description ? 'Has description' : 'N/A'}`);

      try {
        // Fetch metadata using our new service
        const metadata = await solanaTokenMetadataService.getCompleteTokenMetadata(token.mint);
        
        // Prepare update data
        const updateData: any = {};
        let hasUpdates = false;

        if (metadata.name && (!token.name || token.name === token.mint.slice(0, 8))) {
          updateData.name = metadata.name;
          hasUpdates = true;
        }
        
        if (metadata.symbol && (!token.symbol || token.symbol === token.mint.slice(0, 8))) {
          updateData.symbol = metadata.symbol;
          hasUpdates = true;
        }
        
        if (metadata.imageUrl && !token.imageUrl) {
          updateData.imageUrl = metadata.imageUrl;
          updateData.logoURI = metadata.imageUrl; // Also update logoURI
          hasUpdates = true;
        }
        
        if (metadata.description && !token.description) {
          updateData.description = metadata.description;
          hasUpdates = true;
        }

        if (hasUpdates) {
          await prisma.tokenDiscovery.update({
            where: { mint: token.mint },
            data: updateData
          });

          console.log(`✅ Enhanced with:`);
          if (updateData.name) console.log(`    ✓ Name: ${updateData.name}`);
          if (updateData.symbol) console.log(`    ✓ Symbol: ${updateData.symbol}`);
          if (updateData.imageUrl) console.log(`    ✓ Image: Added`);
          if (updateData.description) console.log(`    ✓ Description: Added`);
        } else {
          console.log(`ℹ️  No metadata found on-chain`);
        }

      } catch (error) {
        console.error(`❌ Error processing ${token.mint}:`, error);
      }
    }

  } catch (error) {
    console.error('❌ Error in enrichment process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enrichMissingMetadata()
  .then(() => {
    console.log('\n✅ Metadata enrichment completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Enrichment failed:', error);
    process.exit(1);
  });