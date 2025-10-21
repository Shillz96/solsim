// Trending routes placeholder
import { FastifyInstance } from "fastify";
import { getTrendingTokens } from "../services/trendingService.js";

export default async function (app: FastifyInstance) {
  app.get("/", async (req) => {
    // Extract query parameters
    const query = req.query as any;
    const limit = parseInt(query.limit || '20');
    const sortBy = (query.sortBy || 'rank') as 'rank' | 'volume24hUSD' | 'liquidity';

    const data = await getTrendingTokens(limit, sortBy);
    return { items: data };
  });
}
