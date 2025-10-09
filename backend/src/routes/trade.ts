// Trade routes placeholder
import { FastifyInstance } from "fastify";
import { fillTrade } from "../services/tradeService.js";
import priceService from "../plugins/priceService.js";

export default async function (app: FastifyInstance) {
  app.post("/", async (req, reply) => {
    const { userId, mint, side, qty } = req.body as {
      userId: string;
      mint: string;
      side: "BUY" | "SELL";
      qty: string;
    };
    if (!userId || !mint || !side || !qty) return reply.code(400).send({ error: "Missing fields" });

    try {
      // Note: subscribeMint method doesn't exist, price subscriptions are handled automatically
      const result = await fillTrade({ userId, mint, side, qty });
      return { success: true, ...result };
    } catch (e: any) {
      app.log.error(e);
      return reply.code(400).send({ error: e.message || "Trade failed" });
    }
  });
}
