// frontend/src/types/contracts.ts
import { z } from "zod";

/** All monetary amounts are integer strings in base units (lamports/base decimals) */
export const PriceTickV1 = z.object({
  v: z.literal(1),
  seq: z.number().int().nonnegative(),
  mint: z.string(),
  priceLamports: z.string(),
  ts: z.number().int().positive()
});

export const BalanceUpdateV1 = z.object({
  v: z.literal(1),
  wallet: z.string(),
  mint: z.string(),
  balanceLamports: z.string(),
  ts: z.number().int().positive()
});

export const TradeFillV1 = z.object({
  v: z.literal(1),
  fillId: z.string(),
  wallet: z.string(),
  mint: z.string(),
  side: z.enum(["BUY", "SELL"]),
  qtyBaseUnits: z.string(),
  priceLamports: z.string(),
  feeLamports: z.string(),
  ts: z.number().int().positive()
});

export type PriceTick = z.infer<typeof PriceTickV1>;
export type BalanceUpdate = z.infer<typeof BalanceUpdateV1>;
export type TradeFill = z.infer<typeof TradeFillV1>;

/** Discriminated union for inbound WS frames (expand as you add types) */
export const WSFrame = z.discriminatedUnion("t", [
  z.object({ t: z.literal("price"), d: PriceTickV1 }),
]);