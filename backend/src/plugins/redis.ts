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
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true, // Don't connect immediately
  enableOfflineQueue: false,
  connectTimeout: 5000,
  commandTimeout: 3000,
});

redis.on("error", (err: Error) => {
  console.error("Redis Client Error:", err.message);
  // Don't crash the app on Redis errors
});

redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("close", () => {
  console.log("❌ Disconnected from Redis");
});

redis.on("reconnecting", () => {
  console.log("🔄 Reconnecting to Redis...");
});

export default redis;