// Trade service tests
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { PrismaClient } from "@prisma/client";
import { fillTrade } from "../src/services/tradeService.js";

const prisma = new PrismaClient();

describe("Trade Service", () => {
  let testUserId: string;
  const testMint = "So11111111111111111111111111111111111111112"; // WSOL

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
          email: "test@example.com",
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

  it("should execute a buy trade", async () => {
    const result = await fillTrade({
      userId: testUserId,
      mint: testMint,
      side: "BUY",
      qty: "1.0"
    });

    expect(result.trade).toBeDefined();
    expect(result.trade.side).toBe("BUY");
    expect(result.trade.qty.toString()).toBe("1");
    expect(result.position).toBeDefined();
    expect(result.position.qty.toString()).toBe("1");
  });

  it("should execute a sell trade", async () => {
    // First buy
    await fillTrade({
      userId: testUserId,
      mint: testMint,
      side: "BUY",
      qty: "2.0"
    });

    // Then sell
    const result = await fillTrade({
      userId: testUserId,
      mint: testMint,
      side: "SELL",
      qty: "1.0"
    });

    expect(result.trade).toBeDefined();
    expect(result.trade.side).toBe("SELL");
    expect(result.trade.qty.toString()).toBe("1");
  });

  it("should fail on invalid quantity", async () => {
    await expect(fillTrade({
      userId: testUserId,
      mint: testMint,
      side: "BUY",
      qty: "0"
    })).rejects.toThrow("qty must be > 0");
  });
});

