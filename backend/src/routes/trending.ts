// Trending routes placeholder
import { FastifyInstance } from "fastify";
import { getTrendingTokens } from "../services/trendingService.js";

export default async function (app: FastifyInstance) {
  app.get("/", async (req) => {
    console.log("🔥 Trending API endpoint hit!");

    // Extract query parameters
    const query = req.query as any;
    const limit = parseInt(query.limit || '20');
    const sortBy = (query.sortBy || 'rank') as 'rank' | 'volume24hUSD' | 'liquidity';

    console.log(`🔥 Fetching trending tokens with sortBy: ${sortBy}, limit: ${limit}`);

    const data = await getTrendingTokens(limit, sortBy);
    console.log(`🔥 Returning ${data.length} trending tokens`);
    return { items: data };
  });
}
