// Trending routes placeholder
import { FastifyInstance } from "fastify";
import { getTrendingTokens } from "../services/trendingService.js";

export default async function (app: FastifyInstance) {
  app.get("/", async () => {
    console.log("🔥 Trending API endpoint hit!");
    const data = await getTrendingTokens();
    console.log(`🔥 Returning ${data.length} trending tokens`);
    return { items: data };
  });
}
