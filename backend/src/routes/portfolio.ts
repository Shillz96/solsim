// Portfolio routes placeholder
import { FastifyInstance } from "fastify";
import { getPortfolio } from "../services/portfolioService.js";

export default async function (app: FastifyInstance) {
  app.get("/", async (req, reply) => {
    const userId = (req.query as any).userId;
    if (!userId) return reply.code(400).send({ error: "userId required" });
    const data = await getPortfolio(userId);
    return data;
  });
}
