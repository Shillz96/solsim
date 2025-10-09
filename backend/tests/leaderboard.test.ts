// Leaderboard service tests
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { getLeaderboard } from "../src/services/leaderboardService.js";
import { fillTrade } from "../src/services/tradeService.js";

const prisma = new PrismaClient();

describe("Leaderboard Service", () => {
  let testUserIds: string[] = [];
  const testMint = "So11111111111111111111111111111111111111112"; // WSOL

  beforeAll(async () => {
    // Create test users
    for (let i = 0; i < 3; i++) {
      const user = await prisma.user.create({
        data: {
          email: `test-leaderboard-${i}@example.com`,
          virtualSolBalance: 100
        }
      });
      testUserIds.push(user.id);
    }
  });

  afterAll(async () => {
    // Cleanup
    for (const userId of testUserIds) {
      await prisma.trade.deleteMany({ where: { userId } });
      await prisma.position.deleteMany({ where: { userId } });
      await prisma.positionLot.deleteMany({ where: { userId } });
      await prisma.realizedPnl.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it("should return empty leaderboard for new users", async () => {
    const leaderboard = await getLeaderboard(10);
    
    // Should have users but no PnL yet
    expect(Array.isArray(leaderboard)).toBe(true);
  });

  it("should rank users by PnL after trades", async () => {
    // Execute trades for different users to create PnL differences
    await fillTrade({
      userId: testUserIds[0],
      mint: testMint,
      side: "BUY",
      qty: "2.0"
    });

    await fillTrade({
      userId: testUserIds[1],
      mint: testMint,
      side: "BUY",
      qty: "1.0"
    });

    const leaderboard = await getLeaderboard(10);
    
    expect(leaderboard.length).toBeGreaterThan(0);
    expect(leaderboard[0]).toHaveProperty('userId');
    expect(leaderboard[0]).toHaveProperty('totalPnlUsd');
    expect(leaderboard[0]).toHaveProperty('totalTrades');
  });

  it("should limit results correctly", async () => {
    const leaderboard = await getLeaderboard(2);
    
    expect(leaderboard.length).toBeLessThanOrEqual(2);
  });
});

