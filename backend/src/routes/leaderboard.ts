// Leaderboard routes placeholder
import { FastifyInstance } from "fastify";
import { getLeaderboard, rollupUser } from "../services/leaderboardService.js";

export default async function (app: FastifyInstance) {
  app.get("/", async (req) => {
    const limit = Number((req.query as any).limit || 50);
    return await getLeaderboard(limit);
  });

  // Optional: trigger a rollup for a user (you can call this in a queue or on a cron)
  app.post("/rollup", async (req, reply) => {
    const { userId } = req.body as {
      userId: string;
    };
    if (!userId) return reply.code(400).send({ error: "userId required" });
    await rollupUser(userId);
    return { ok: true };
  });
}
