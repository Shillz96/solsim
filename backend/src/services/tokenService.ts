// Token service placeholder
import prisma from "../plugins/prisma.js";
import fetch from "node-fetch";

const HELIUS = process.env.HELIUS_API!;
const DEX = "https://api.dexscreener.com";

// Enrich token metadata (caches in DB)
export async function getTokenMeta(mint: string) {
  // Try DB cache first
  let token = await prisma.token.findUnique({ where: { mint } });
  const fresh = token && token.lastUpdated && Date.now() - token.lastUpdated.getTime() < 86400000; // 24h cache

  if (token && fresh) return token;

  // 1. Try Helius token metadata
  try {
    const res = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS}&mintAccounts=${mint}`);
    const json = await res.json() as any[];
    const meta = json[0]?.onChainMetadata?.metadata || json[0]?.offChainMetadata?.metadata;
    if (meta) {
      token = await prisma.token.upsert({
        where: { mint },
        update: {
          symbol: meta.symbol || null,
          name: meta.name || null,
          logoURI: meta.image || null,
          website: meta.external_url || null,
          twitter: meta.extensions?.twitter || null,
          telegram: meta.extensions?.telegram || null,
          lastUpdated: new Date()
        },
        create: {
          address: mint,
          mint,
          symbol: meta.symbol || null,
          name: meta.name || null,
          logoURI: meta.image || null,
          website: meta.external_url || null,
          twitter: meta.extensions?.twitter || null,
          telegram: meta.extensions?.telegram || null,
        }
      });
      return token;
    }
  } catch (e) {
    console.warn("Helius meta fail", e);
  }

  // 2. Fallback to Dexscreener
  try {
    const res = await fetch(`${DEX}/latest/dex/tokens/${mint}`);
    if (res.ok) {
      const json = await res.json() as any;
      const pair = json.pairs?.[0];
      if (pair) {
        token = await prisma.token.upsert({
          where: { mint },
          update: {
            symbol: pair.baseToken?.symbol || null,
            name: pair.baseToken?.name || null,
            logoURI: pair.info?.imageUrl || null,
            website: pair.info?.websiteUrl || null,
            twitter: pair.info?.twitter || null,
            telegram: pair.info?.telegram || null,
            lastUpdated: new Date()
          },
          create: {
            address: mint,
            mint,
            symbol: pair.baseToken?.symbol || null,
            name: pair.baseToken?.name || null,
            logoURI: pair.info?.imageUrl || null,
            website: pair.info?.websiteUrl || null,
            twitter: pair.info?.twitter || null,
            telegram: pair.info?.telegram || null,
          }
        });
        return token;
      }
    }
  } catch (e) {
    console.warn("Dexscreener meta fail", e);
  }

  return token;
}
