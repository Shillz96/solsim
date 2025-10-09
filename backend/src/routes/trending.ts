// Trending routes placeholder
import { FastifyInstance } from "fastify";
import { getTrendingTokens } from "../services/trendingService.js";

export default async function (app: FastifyInstance) {
  app.get("/", async () => {
    const data = await getTrendingTokens();
    return { items: data };
  });
}
