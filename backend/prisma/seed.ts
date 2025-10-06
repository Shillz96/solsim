import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_TOKENS = [
  {
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    lastPrice: 145.50
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    lastPrice: 1.00
  },
  {
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    name: 'Bonk',
    imageUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
    lastPrice: 0.000012
  },
  {
    address: 'mSoLzYCxHdYgdziU2hgzx6SRhNTsUACfKNr7KzPY1L3',
    symbol: 'mSOL',
    name: 'Marinade staked SOL',
    imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdziU2hgzx6SRhNTsUACfKNr7KzPY1L3/logo.png',
    lastPrice: 160.25
  },
  {
    address: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
    symbol: 'jitoSOL',
    name: 'Jito Staked SOL',
    imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn/logo.png',
    lastPrice: 168.75
  }
];

const SEED_USERS = [
  {
    id: 'dev-user-1',
    email: 'dev@solsim.fun',
    username: 'dev_user',
    passwordHash: 'dev-hash',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev',
    virtualSolBalance: 100
  },
  {
    id: 'seed-user-2',
    email: 'whale@solsim.fun',
    username: 'crypto_whale',
    passwordHash: 'whale-hash',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=whale',
    virtualSolBalance: 100000
  },
  {
    id: 'seed-user-3',
    email: 'newbie@solsim.fun',
    username: 'paper_hands',
    passwordHash: 'newbie-hash',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=newbie',
    virtualSolBalance: 5000
  }
];

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Clear existing data (optional - be careful in production!)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🧹 Clearing existing data...');
      await prisma.trade.deleteMany();
      await prisma.holding.deleteMany();
      await prisma.user.deleteMany();
      await prisma.token.deleteMany();
    }

    // Seed tokens
    console.log('📊 Seeding tokens...');
    for (const tokenData of SEED_TOKENS) {
      const token = await prisma.token.upsert({
        where: { address: tokenData.address },
        update: {
          symbol: tokenData.symbol,
          name: tokenData.name,
          imageUrl: tokenData.imageUrl,
          lastPrice: tokenData.lastPrice,
          lastTs: new Date()
        },
        create: {
          address: tokenData.address,
          symbol: tokenData.symbol,
          name: tokenData.name,
          imageUrl: tokenData.imageUrl,
          lastPrice: tokenData.lastPrice,
          lastTs: new Date()
        }
      });
      console.log(`  ✅ ${token.symbol} (${token.name})`);
    }

    // Seed users
    console.log('👥 Seeding users...');
    for (const userData of SEED_USERS) {
      const user = await prisma.user.upsert({
        where: { id: userData.id },
        update: userData,
        create: userData
      });
      console.log(`  ✅ ${user.username} (${user.email})`);
    }

    // Seed some sample trades and holdings
    console.log('💰 Seeding sample trades and holdings...');
    
    // Demo trader's activity
    const demoTrades = [
      {
        userId: 'dev-user-1',
        tokenAddress: 'So11111111111111111111111111111111111111112', // SOL
        tokenSymbol: 'SOL',
        tokenName: 'Solana',
        action: 'BUY',
        quantity: 50,
        price: 140.0,
        totalCost: 7000
      },
      {
        userId: 'dev-user-1',
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
        tokenSymbol: 'BONK',
        tokenName: 'Bonk',
        action: 'BUY',
        quantity: 1000000,
        price: 0.000010,
        totalCost: 10
      },
      {
        userId: 'dev-user-1',
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
        tokenSymbol: 'BONK',
        tokenName: 'Bonk',
        action: 'SELL',
        quantity: 500000,
        price: 0.000011,
        totalCost: 5.5
      }
    ];

    for (const tradeData of demoTrades) {
      const trade = await prisma.trade.create({
        data: {
          ...tradeData,
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last 7 days
        }
      });
      console.log(`  ✅ Trade: ${trade.action} ${trade.quantity} ${trade.tokenSymbol}`);
    }

    // Create corresponding holdings
    const holdings = [
      {
        userId: 'dev-user-1',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        tokenName: 'Solana',
        quantity: 50,
        entryPrice: 140.0
      },
      {
        userId: 'dev-user-1',
        tokenAddress: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
        tokenSymbol: 'BONK',
        tokenName: 'Bonk',
        quantity: 500000,
        entryPrice: 0.000010
      }
    ];

    for (const holdingData of holdings) {
      const holding = await prisma.holding.create({
        data: holdingData
      });
      console.log(`  ✅ Holding: ${holding.quantity} ${holding.tokenSymbol}`);
    }

    // Whale trader's activity
    const whaleTrades = [
      {
        userId: 'seed-user-2',
        tokenAddress: 'So11111111111111111111111111111111111111112', // SOL
        tokenSymbol: 'SOL',
        tokenName: 'Solana',
        action: 'BUY',
        quantity: 500,
        price: 135.0,
        totalCost: 67500
      },
      {
        userId: 'seed-user-2',
        tokenAddress: 'mSoLzYCxHdYgdziU2hgzx6SRhNTsUACfKNr7KzPY1L3', // mSOL
        tokenSymbol: 'mSOL',
        tokenName: 'Marinade staked SOL',
        action: 'BUY',
        quantity: 100,
        price: 155.0,
        totalCost: 15500
      }
    ];

    for (const tradeData of whaleTrades) {
      const trade = await prisma.trade.create({
        data: {
          ...tradeData,
          timestamp: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) // Random time in last 3 days
        }
      });
      console.log(`  ✅ Whale Trade: ${trade.action} ${trade.quantity} ${trade.tokenSymbol}`);
    }

    // Create whale holdings
    const whaleHoldings = [
      {
        userId: 'seed-user-2',
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        tokenName: 'Solana',
        quantity: 500,
        entryPrice: 135.0
      },
      {
        userId: 'seed-user-2',
        tokenAddress: 'mSoLzYCxHdYgdziU2hgzx6SRhNTsUACfKNr7KzPY1L3',
        tokenSymbol: 'mSOL',
        tokenName: 'Marinade staked SOL',
        quantity: 100,
        entryPrice: 155.0
      }
    ];

    for (const holdingData of whaleHoldings) {
      const holding = await prisma.holding.create({
        data: holdingData
      });
      console.log(`  ✅ Whale Holding: ${holding.quantity} ${holding.tokenSymbol}`);
    }

    console.log('✅ Database seed completed successfully!');
    console.log('\n📈 Seed Summary:');
    console.log(`   Tokens: ${SEED_TOKENS.length}`);
    console.log(`   Users: ${SEED_USERS.length}`);
    console.log(`   Sample Trades: ${demoTrades.length + whaleTrades.length}`);
    console.log(`   Sample Holdings: ${holdings.length + whaleHoldings.length}`);
    console.log('\n🎮 You can now test the trading features with the seeded data!');
    console.log('\n🔐 Demo accounts:');
    console.log('   • demo@solsim.fun (demo_trader) - 15,000 SOL balance');
    console.log('   • whale@solsim.fun (crypto_whale) - 100,000 SOL balance');
    console.log('   • newbie@solsim.fun (paper_hands) - 5,000 SOL balance');

  } catch (error) {
    console.error('❌ Error during database seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });