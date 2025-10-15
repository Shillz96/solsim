// Stocks routes for tokenized stocks
import { FastifyInstance } from "fastify";
import { getStockTokens } from "../services/stocksService.js";

export default async function (app: FastifyInstance) {
  app.get("/", async (req) => {
    console.log("📈 Stocks API endpoint hit!");

    // Extract query parameters
    const query = req.query as any;
    const limit = parseInt(query.limit || '50');

    console.log(`📈 Fetching tokenized stocks with limit: ${limit}`);

    const data = await getStockTokens(limit);
    console.log(`📈 Returning ${data.length} stock tokens`);
    return { items: data };
  });
}
