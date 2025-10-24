#!/usr/bin/env node
/**
 * Test Badge System Script
 * Creates test users to verify founder badges auto-award functionality
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🏆 Testing badge system...');

  // Check current user count
  const currentUserCount = await prisma.user.count();
  console.log(`📊 Current user count: ${currentUserCount}`);

  // Check existing badges
  const badges = await prisma.badge.findMany({
    where: { category: 'FOUNDER' },
    orderBy: { name: 'asc' }
  });
  console.log('🎖️  Available founder badges:');
  badges.forEach(badge => {
    console.log(`  - ${badge.name} (${badge.rarity}): ${badge.description}`);
  });

  // Create test users to trigger founder badges
  const testUsers = [];
  const userCount = Math.min(5, Math.max(0, 100 - currentUserCount)); // Create up to 5 users, but not more than needed for founder badge

  console.log(`👥 Creating ${userCount} test users...`);

  for (let i = 1; i <= userCount; i++) {
    const userNumber = currentUserCount + i;
    const testUser = await prisma.user.create({
      data: {
        email: `testuser${userNumber}@virtualsol.fun`,
        username: `testuser${userNumber}`,
        handle: `testuser${userNumber}`,
        passwordHash: await bcrypt.hash('password123', 10),
        displayName: `Test User ${userNumber}`,
        virtualSolBalance: 100.0,
        userTier: 'EMAIL_USER',
        isProfilePublic: true
      }
    });

    testUsers.push(testUser);
    console.log(`✅ Created test user ${userNumber}: ${testUser.email}`);
  }

  // Wait a moment for triggers to process
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Check badges awarded to the first test user
  if (testUsers.length > 0) {
    const firstUser = testUsers[0];
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: firstUser.id },
      include: { badge: true }
    });

    console.log(`\n🏆 Badges awarded to ${firstUser.displayName}:`);
    if (userBadges.length === 0) {
      console.log('  No badges awarded yet');
    } else {
      userBadges.forEach(userBadge => {
        console.log(`  - ${userBadge.badge.name} (${userBadge.badge.rarity}): ${userBadge.badge.description}`);
        console.log(`    Earned at: ${userBadge.earnedAt.toISOString()}`);
      });
    }
  }

  // Check total user count after creation
  const finalUserCount = await prisma.user.count();
  console.log(`\n📊 Final user count: ${finalUserCount}`);

  // Check badge distribution
  const badgeStats = await prisma.userBadge.groupBy({
    by: ['badgeId'],
    _count: { id: true },
    include: { badge: true }
  });

  console.log('\n📈 Badge distribution:');
  for (const stat of badgeStats) {
    const badge = await prisma.badge.findUnique({
      where: { id: stat.badgeId }
    });
    if (badge) {
      console.log(`  - ${badge.name}: ${stat._count.id} users`);
    }
  }

  console.log('\n🎉 Badge system test complete!');
  console.log('\n💡 To test manually:');
  console.log('1. Check the database for UserBadge entries');
  console.log('2. Use the API endpoints to fetch user badges');
  console.log('3. Verify founder badges are automatically awarded');
}

main()
  .catch((e) => {
    console.error('❌ Badge system test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
