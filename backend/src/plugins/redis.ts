// Redis client for caching
import Redis from "ioredis";

// Create Redis connection with better error handling
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
console.log(`🔌 Attempting to connect to Redis:`);
console.log(`   Raw URL: ${redisUrl}`);
console.log(`   Sanitized: ${redisUrl.replace(/:[^:]*@/, ':***@')}`);

// Validate URL format
try {
  const url = new URL(redisUrl);
  console.log(`   Parsed hostname: ${url.hostname}`);
  console.log(`   Parsed port: ${url.port}`);
} catch (error: any) {
  console.error(`❌ Invalid Redis URL format: ${error.message}`);
}

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  enableOfflineQueue: false, // Disable offline queue to fail fast
  connectTimeout: 10000, // Increased to 10s for Railway network latency
  commandTimeout: 5000, // Increased to 5s
  // Retry strategy with exponential backoff
  retryStrategy(times) {
    if (times > 5) {
      console.error('❌ Redis connection failed after 5 retries');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 500, 3000); // Max 3s delay
    console.log(`⏳ Redis retry ${times}/5 in ${delay}ms`);
    return delay;
  },
  // Reconnect on error for better resilience
  reconnectOnError(err) {
    const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
    if (targetErrors.some(target => err.message.includes(target))) {
      console.log(`♻️ Redis reconnecting due to: ${err.message}`);
      return true;
    }
    return false;
  }
});

redis.on("error", (err: Error) => {
  // Log Redis errors for debugging, but don't crash the app
  console.error(`Redis Client Error: ${err.name}: ${err.message}`);
});

redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("close", () => {
  console.log("❌ Disconnected from Redis");
});

// Test Redis connection and handle gracefully
redis.connect()
  .then(() => {
    console.log("✅ Redis connected successfully");
  })
  .catch((err) => {
    console.error("❌ Redis connection failed:", err.message);
    console.log("⚠️ App will continue without Redis caching");
  });

// Named export for compatibility
export const getRedis = () => redis;

export default redis;