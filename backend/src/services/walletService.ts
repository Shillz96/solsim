// Wallet service placeholder
import { robustFetch } from "../utils/fetch.js";

const HELIUS_API = process.env.HELIUS_API!;

// Fetch all token balances for a wallet
export async function getWalletBalances(wallet: string) {
  // Helius balances API
  const url = `https://api.helius.xyz/v0/addresses/${wallet}/balances?api-key=${HELIUS_API}`;
  const res = await robustFetch(url, {
    timeout: 10000,
    retries: 2,
    retryDelay: 1000
  });
  if (!res.ok) throw new Error(`Helius balances API failed: ${res.status}`);
  const json = await res.json() as any;

  // Returns token balances with metadata already included
  const balances = json.tokens || [];

  // Normalize into frontend-friendly shape
  return balances.map((t: any) => ({
    mint: t.mint,
    amount: t.amount,
    decimals: t.decimals,
    uiAmount: t.uiAmount,
    symbol: t.symbol ?? "",
    name: t.name ?? "",
    logoURI: t.logoURI ?? "",
    priceUsd: t.price ?? null,
    valueUsd: t.price ? t.price * t.uiAmount : null,
    website: t?.extensions?.website || null,
    twitter: t?.extensions?.twitter || null,
    telegram: t?.extensions?.telegram || null,
  }));
}
