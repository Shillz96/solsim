const { PrismaClient } = require('@prisma/client');

async function test() {
  console.log('Testing Prisma connection...');
  
  const prisma = new PrismaClient();
  
  try {
    console.log('Prisma client created:', !!prisma);
    console.log('User model:', !!prisma.user);
    
    const result = await prisma.user.count();
    console.log('User count:', result);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();