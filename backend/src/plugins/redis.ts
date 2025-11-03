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
  enableOfflineQueue: true, // PERFORMANCE FIX: Enable queue to prevent cascading failures
  enableReadyCheck: true, // Wait for server to be ready before sending commands
  connectTimeout: 10000, // Increased to 10s for Railway network latency
  commandTimeout: 5000, // Increased to 5s
  // SCALING FIX: Keep connection alive to prevent timeouts under load
  keepAlive: 30000, // Send keepalive packets every 30 seconds
  connectionName: 'backend-main', // Easier debugging in Redis logs
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

// Export connection promise for awaiting in index.ts
export const redisConnectPromise = redis.connect()
  .then(() => {
    console.log("✅ Redis connected successfully");
    return redis;
  })
  .catch((err) => {
    console.error("❌ Redis connection failed:", err.message);
    console.log("⚠️ App will continue without Redis caching");
    return redis; // Return redis anyway for offline queue
  });

// Named export for compatibility
export const getRedis = () => redis;

export default redis;