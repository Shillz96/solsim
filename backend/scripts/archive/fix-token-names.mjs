import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Known token metadata
const TOKEN_METADATA = {
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
    symbol: 'Bonk',
    name: 'Bonk'
  }
};

async function fixTokenNames() {
  console.log('🔧 Fixing token metadata...\n');
  
  try {
    const holdings = await prisma.holding.findMany();
    
    for (const holding of holdings) {
      const metadata = TOKEN_METADATA[holding.tokenAddress];
      
      if (metadata) {
        console.log(`Updating: ${holding.tokenAddress.slice(0, 12)}...`);
        console.log(`  ${holding.tokenSymbol} → ${metadata.symbol}`);
        console.log(`  ${holding.tokenName} → ${metadata.name}`);
        
        await prisma.holding.update({
          where: { id: holding.id },
          data: {
            tokenSymbol: metadata.symbol,
            tokenName: metadata.name
          }
        });
        
        console.log(`  ✅ Updated\n`);
      }
    }
    
    // Also update trades
    const trades = await prisma.trade.findMany({
      where: {
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
      }
    });
    
    if (trades.length > 0) {
      await prisma.trade.updateMany({
        where: {
          tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
        },
        data: {
          tokenSymbol: 'Bonk',
          tokenName: 'Bonk'
        }
      });
      console.log(`✅ Updated ${trades.length} trades`);
    }
    
    console.log('\n✅ Token metadata updated!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixTokenNames();
