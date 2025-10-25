#!/usr/bin/env ts-node

/**
 * Fix UUID defaults in database
 * This script addresses the null constraint violation on user.id
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUuidDefaults() {
  try {
    console.log('🔧 Fixing UUID defaults in database...');
    
    // Check if UUID extension exists
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
    console.log('✅ UUID extension created/verified');
    
    // Fix User table
    await prisma.$executeRaw`ALTER TABLE "User" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();`;
    console.log('✅ User.id now has UUID default');
    
    // Fix Trade table
    await prisma.$executeRaw`ALTER TABLE "Trade" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();`;
    console.log('✅ Trade.id now has UUID default');
    
    // Fix Position table
    await prisma.$executeRaw`ALTER TABLE "Position" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();`;
    console.log('✅ Position.id now has UUID default');
    
    // Fix PositionLot table
    await prisma.$executeRaw`ALTER TABLE "PositionLot" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();`;
    console.log('✅ PositionLot.id now has UUID default');
    
    // Fix RealizedPnL table
    await prisma.$executeRaw`ALTER TABLE "RealizedPnL" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4();`;
    console.log('✅ RealizedPnL.id now has UUID default');
    
    console.log('🎉 All UUID defaults fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing UUID defaults:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixUuidDefaults()
  .then(() => {
    console.log('✅ UUID defaults fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ UUID defaults fix failed:', error);
    process.exit(1);
  });
