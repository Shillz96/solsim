// Whitelist of tokens allowed for perpetual trading
// Only high market cap, established tokens to reduce risk

export const PERP_WHITELIST = [
  // Solana
  "So11111111111111111111111111111111111111112", // SOL

  // Top established memecoins and blue chips (verified addresses)
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
  "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82", // BOME
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm", // WIF (dogwifhat)
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr", // POPCAT (FIXED - was wrong address!)
  "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5", // MEW
  "3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN", // MOTHER
  "GJa4HMvGJbvCkBXKSUxvYwVvJPYXBBxNhkBBCjC9pump", // GIGA
  "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump", // FWOG
];

// Minimum market cap required for perp trading (in USD)
export const MIN_MARKET_CAP = 10_000_000; // $10M minimum

/**
 * Check if a token is whitelisted for perpetual trading
 */
export function isTokenWhitelisted(mint: string): boolean {
  return PERP_WHITELIST.includes(mint);
}

/**
 * Get the whitelist
 */
export function getPerpWhitelist(): string[] {
  return [...PERP_WHITELIST];
}
