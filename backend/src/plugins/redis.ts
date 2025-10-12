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
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false, // Disable offline queue to fail fast
  connectTimeout: 3000,
  commandTimeout: 2000,
  // Disable retry strategy to prevent spam
  retryStrategy: () => null
});

redis.on("error", (err: Error) => {
  // Silently handle Redis errors - app continues without Redis
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

export default redis;