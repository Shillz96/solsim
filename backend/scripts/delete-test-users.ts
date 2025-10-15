#!/usr/bin/env node
/**
 * Delete Test/Mock Users Script
 * Removes only test users and their associated data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Finding test users...');

  // Define patterns that identify test/mock users
  const testEmailPatterns = [
    '%test%',
    '%demo%',
    '%mock%',
    '%example%',
    '%@virtualsol.fun%', // Your test domain
  ];

  const testUsernamePatterns = [
    'test%',
    'demo%',
    'mock%',
    '%test',
    '%demo',
    '%mock',
  ];

  // Find all test users
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        ...testEmailPatterns.map(pattern => ({ email: { contains: pattern.replace(/%/g, '') } })),
        ...testUsernamePatterns.map(pattern => ({ username: { contains: 'test' } })),
        ...testUsernamePatterns.map(pattern => ({ username: { contains: 'demo' } })),
        ...testUsernamePatterns.map(pattern => ({ username: { contains: 'mock' } })),
      ]
    }
  });

  if (testUsers.length === 0) {
    console.log('✅ No test users found!');
    return;
  }

  console.log(`Found ${testUsers.length} test users:`);
  testUsers.forEach(user => {
    console.log(`  - ${user.email} (${user.username})`);
  });

  console.log('\n🗑️  Deleting test users and their data...');

  // Delete all test users (cascade will delete related data)
  const result = await prisma.user.deleteMany({
    where: {
      id: {
        in: testUsers.map(u => u.id)
      }
    }
  });

  console.log(`✅ Deleted ${result.count} test users and all their associated data!`);
}

main()
  .catch((e) => {
    console.error('❌ Failed to delete test users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
