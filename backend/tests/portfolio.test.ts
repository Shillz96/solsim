// Portfolio service tests
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { getPortfolio } from "../src/services/portfolioService.js";
import { fillTrade } from "../src/services/tradeService.js";

const prisma = new PrismaClient();

describe("Portfolio Service", () => {
  let testUserId: string;
  const testMint = "So11111111111111111111111111111111111111112"; // WSOL

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
          email: "test-portfolio@example.com",
          virtualSolBalance: 100
        }
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.trade.deleteMany({ where: { userId: testUserId } });
    await prisma.position.deleteMany({ where: { userId: testUserId } });
    await prisma.positionLot.deleteMany({ where: { userId: testUserId } });
    await prisma.realizedPnl.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  it("should return empty portfolio for new user", async () => {
    const portfolio = await getPortfolio(testUserId);
    
    expect(portfolio.positions).toHaveLength(0);
    expect(portfolio.totals.totalValueUsd).toBe("0.00");
    expect(portfolio.totals.totalUnrealizedUsd).toBe("0.00");
    expect(portfolio.totals.totalRealizedUsd).toBe("0.00");
    expect(portfolio.totals.totalPnlUsd).toBe("0.00");
  });

  it("should show positions after trades", async () => {
    // Execute a buy trade
    await fillTrade({
      userId: testUserId,
      mint: testMint,
      side: "BUY",
      qty: "1.0"
    });

    const portfolio = await getPortfolio(testUserId);
    
    expect(portfolio.positions).toHaveLength(1);
    expect(portfolio.positions[0].mint).toBe(testMint);
    expect(portfolio.positions[0].qty).toBe("1");
    expect(parseFloat(portfolio.totals.totalValueUsd)).toBeGreaterThan(0);
  });

  it("should calculate PnL correctly", async () => {
    // Buy and sell to generate realized PnL
    await fillTrade({
      userId: testUserId,
      mint: testMint,
      side: "BUY",
      qty: "2.0"
    });

    await fillTrade({
      userId: testUserId,
      mint: testMint,
      side: "SELL",
      qty: "1.0"
    });

    const portfolio = await getPortfolio(testUserId);
    
    // Should have realized PnL from the sell
    expect(parseFloat(portfolio.totals.totalRealizedUsd)).not.toBe(0);
  });
});

