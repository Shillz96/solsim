// Emergency script to clear corrupt Redis buffer
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function clearBuffer() {
  try {
    console.log('🧹 Clearing Redis token buffer...');

    // Get all pending mints
    const pending = await redis.smembers('token:buffer:pending');
    console.log(`Found ${pending.length} buffered tokens`);

    // Delete each buffer key
    let deleted = 0;
    for (const mint of pending) {
      await redis.del(`token:buffer:${mint}`);
      deleted++;
      if (deleted % 10 === 0) {
        console.log(`Deleted ${deleted}/${pending.length}...`);
      }
    }

    // Clear pending set
    await redis.del('token:buffer:pending');

    console.log(`✅ Cleared ${deleted} buffered tokens from Redis`);
    console.log('⚠️  These tokens had undefined mints and were causing Prisma errors');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing buffer:', error);
    process.exit(1);
  }
}

clearBuffer();
