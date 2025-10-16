/**
 * Token Logo Fallback Map
 * Provides reliable CDN URLs for token logos when API sources fail
 */

export const TOKEN_LOGO_FALLBACKS: Record<string, string> = {
  // SOL - Solana
  "So11111111111111111111111111111111111111112": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",

  // BONK - Bonk Token
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",

  // BOME - Book of Meme
  "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82": "https://bafybeicvp65xfek34n5h7ody3zdqwgie7xvdza7qrktzmfkuw5p6xkddk4.ipfs.nftstorage.link/",

  // WIF - dogwifhat
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": "https://bafkreiccgrbzyfigjh4dxqvlrq3owbul3nsx52bp347hcnyzgwr5tkqcki.ipfs.nftstorage.link",

  // POPCAT
  "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr": "https://bafkreidlwyr4vgiulctxog6tdmvcy3mfy7wf7io4wjrn7jgruefsjzcvua.ipfs.nftstorage.link",

  // MEW - Cat in a Dogs World
  "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5": "https://bafkreig5x3ec37e5qbsbfnuejyzn57h37ubt3bvxmfqnfxpdvgxcl4yova.ipfs.nftstorage.link",

  // MOTHER - MOTHER token
  "3S8qX1MsMqRbiwKg2cQyx7nis1oHMgaCuc9c4VfvVdPN": "https://bafkreicsio6q5bnxsgtc5dkglns3yzacdyb4v6lprz2z6nwcjsw7hd3o7m.ipfs.nftstorage.link",

  // GIGA - Giga Chad
  "GJa4HMvGJbvCkBXKSUxvYwVvJPYXBBxNhkBBCjC9pump": "https://cf-ipfs.com/ipfs/QmZ8gA7K7YvbUhHYP7SWzUFRLjRaLTNLxSQfwEaUuJqKP3",

  // FWOG
  "A8C3xuqscfmyLrte3VmTqrAq8kgMASius9AFNANwpump": "https://cf-ipfs.com/ipfs/QmRCEPqjWQZjhP1wSo3NWLt3B5X9TsLqUYBb8QXmbcKAUh",
};

/**
 * Alternative logo URLs for each token (in case primary fails)
 */
export const TOKEN_LOGO_ALTERNATIVES: Record<string, string[]> = {
  "So11111111111111111111111111111111111111112": [
    "https://cryptologos.cc/logos/solana-sol-logo.svg",
    "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/solana/info/logo.png",
  ],
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": [
    "https://cryptologos.cc/logos/bonk-bonk-logo.svg",
    "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
  ],
  "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82": [
    "https://img.fotofolio.xyz/?url=https%3A%2F%2Fbafybeicvp65xfek34n5h7ody3zdqwgie7xvdza7qrktzmfkuw5p6xkddk4.ipfs.nftstorage.link",
  ],
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": [
    "https://cryptologos.cc/logos/dogwifhat-wif-logo.svg",
  ],
};

/**
 * Get logo URL for a token mint address
 * Returns fallback if available, otherwise undefined
 */
export function getTokenLogoFallback(mint: string): string | undefined {
  return TOKEN_LOGO_FALLBACKS[mint];
}

/**
 * Get all alternative logo URLs for a token
 */
export function getTokenLogoAlternatives(mint: string): string[] {
  return TOKEN_LOGO_ALTERNATIVES[mint] || [];
}

/**
 * Check if a token has a fallback logo configured
 */
export function hasTokenLogoFallback(mint: string): boolean {
  return mint in TOKEN_LOGO_FALLBACKS;
}
