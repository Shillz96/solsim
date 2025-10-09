// Candle routes for OHLCV data
import { FastifyInstance } from "fastify";
import { getCandles } from "../services/candleService.js";

export default async function candleRoutes(app: FastifyInstance) {
  // Get candles for a token
  app.get("/:mint", async (req, reply) => {
    const { mint } = req.params as { mint: string };
    const { timeframe = "1h", limit = "100" } = req.query as any;
    
    if (!mint) {
      return reply.code(400).send({ error: "mint required" });
    }
    
    try {
      const candles = await getCandles(
        mint, 
        timeframe as any, 
        parseInt(limit)
      );
      
      return { mint, timeframe, candles };
    } catch (error: any) {
      app.log.error(error);
      return reply.code(500).send({ error: error.message || "Failed to fetch candles" });
    }
  });
}
