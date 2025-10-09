// Redis client for caching
import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
  socket: {
    reconnectStrategy: (retries: number) => Math.min(retries * 50, 500)
  }
});

redis.on("error", (err: Error) => {
  console.error("Redis Client Error:", err);
});

redis.on("connect", () => {
  console.log("✅ Connected to Redis");
});

redis.on("disconnect", () => {
  console.log("❌ Disconnected from Redis");
});

// Connect on startup
redis.connect().catch(console.error);

export default redis;