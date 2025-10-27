// Trending routes with rate limiting
import { FastifyInstance } from "fastify";
import { getTrendingTokens } from "../services/trendingService.js";

export default async function (app: FastifyInstance) {
  // Add rate limiting: Max 20 requests per minute per IP to prevent Birdeye API abuse
  app.get("/", {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute'
      }
    }
  }, async (req) => {
    // Extract query parameters
    const query = req.query as any;
    const limit = parseInt(query.limit || '20');
    const sortBy = (query.sortBy || 'rank') as 'rank' | 'volume24hUSD' | 'liquidity';

    const data = await getTrendingTokens(limit, sortBy);
    return { items: data };
  });
}
