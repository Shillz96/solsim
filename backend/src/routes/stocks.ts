// Stocks routes for tokenized stocks
import { FastifyInstance } from "fastify";
import { getStockTokens } from "../services/stocksService.js";

export default async function (app: FastifyInstance) {
  app.get("/", async (req) => {
    // Extract query parameters
    const query = req.query as any;
    const limit = parseInt(query.limit || '50');

    const data = await getStockTokens(limit);
    return { items: data };
  });
}
