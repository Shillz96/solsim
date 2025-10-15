import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixMigration() {
  try {
    console.log('🔧 Fixing enum migration...');

    // Step 1: Check if columns already exist
    const checkColumns = await prisma.$queryRawUnsafe(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'User'
      AND column_name IN ('simTokenBalance', 'vsolTokenBalance');
    `);

    console.log('Current columns:', checkColumns);

    // Step 2: Rename columns if needed
    const hasOldColumn = Array.isArray(checkColumns) && checkColumns.some((row: any) => row.column_name === 'simTokenBalance');

    if (hasOldColumn) {
      console.log('Renaming columns...');
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" RENAME COLUMN "simTokenBalance" TO "vsolTokenBalance"`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" RENAME COLUMN "simBalanceUpdated" TO "vsolBalanceUpdated"`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "ConversionHistory" RENAME COLUMN "simTokensReceived" TO "vsolTokensReceived"`);
      console.log('✅ Columns renamed');
    } else {
      console.log('✅ Columns already renamed');
    }

    // Step 3: Check if VSOL_HOLDER enum value exists
    const enumCheck = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'VSOL_HOLDER'
        AND enumtypid = 'UserTier'::regtype
      ) as exists;
    `);

    const vsolExists = Array.isArray(enumCheck) && enumCheck[0]?.exists;

    if (!vsolExists) {
      console.log('Adding VSOL_HOLDER enum value...');
      // This must be done outside a transaction
      await prisma.$executeRawUnsafe(`ALTER TYPE "UserTier" ADD VALUE IF NOT EXISTS 'VSOL_HOLDER'`);
      console.log('✅ VSOL_HOLDER enum value added');

      // Wait a moment for the enum to be committed
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log('✅ VSOL_HOLDER enum value already exists');
    }

    // Step 4: Update users
    const simHolderCount = await prisma.user.count({
      where: { userTier: 'SIM_HOLDER' as any }
    });

    if (simHolderCount > 0) {
      console.log(`Updating ${simHolderCount} SIM_HOLDER users to VSOL_HOLDER...`);
      await prisma.$executeRawUnsafe(`UPDATE "User" SET "userTier" = 'VSOL_HOLDER' WHERE "userTier" = 'SIM_HOLDER'`);
      console.log('✅ Users updated');
    } else {
      console.log('✅ No SIM_HOLDER users to update');
    }

    // Step 5: Recreate enum without SIM_HOLDER
    const simHolderEnumExists = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'SIM_HOLDER'
        AND enumtypid = 'UserTier'::regtype
      ) as exists;
    `);

    const simExists = Array.isArray(simHolderEnumExists) && simHolderEnumExists[0]?.exists;

    if (simExists) {
      console.log('Recreating UserTier enum without SIM_HOLDER...');
      await prisma.$executeRawUnsafe(`CREATE TYPE "UserTier_new" AS ENUM ('EMAIL_USER', 'WALLET_USER', 'VSOL_HOLDER', 'ADMINISTRATOR')`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "userTier" TYPE "UserTier_new" USING ("userTier"::text::"UserTier_new")`);
      await prisma.$executeRawUnsafe(`DROP TYPE "UserTier"`);
      await prisma.$executeRawUnsafe(`ALTER TYPE "UserTier_new" RENAME TO "UserTier"`);
      console.log('✅ UserTier enum recreated');
    } else {
      console.log('✅ UserTier enum already correct');
    }

    console.log('✅ Migration fixed successfully!');
  } catch (error) {
    console.error('❌ Error fixing migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixMigration();
