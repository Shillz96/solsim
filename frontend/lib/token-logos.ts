/**
 * Token Logo Fallback Map
 * Provides reliable CDN URLs for token logos when API sources fail
 *
 * Priority order:
 * 1. Official Solana token registry (most reliable)
 * 2. IPFS via nftstorage.link or cf-ipfs.com
 * 3. Arweave permanent storage
 * 4. CryptoLogos.cc (for major tokens)
 */

export const TOKEN_LOGO_FALLBACKS: Record<string, string> = {
  // SOL - Solana (native token)
  "So11111111111111111111111111111111111111112": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",

  // USDC - USD Coin
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",

  // USDT - Tether USD
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg",

  // BONK - Bonk Token
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",

  // JUP - Jupiter
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": "https://static.jup.ag/jup/icon.png",

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

  // RAY - Raydium
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png",

  // ORCA
  "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE/logo.png",
};

/**
 * Alternative logo URLs for each token (in case primary fails)
 * These are tried in order after the primary fallback
 */
export const TOKEN_LOGO_ALTERNATIVES: Record<string, string[]> = {
  // SOL alternatives
  "So11111111111111111111111111111111111111112": [
    "https://cryptologos.cc/logos/solana-sol-logo.svg",
    "https://cdn.jsdelivr.net/gh/trustwallet/assets@master/blockchains/solana/info/logo.png",
    "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  ],

  // USDC alternatives
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": [
    "https://cryptologos.cc/logos/usd-coin-usdc-logo.svg",
    "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
  ],

  // USDT alternatives
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": [
    "https://cryptologos.cc/logos/tether-usdt-logo.svg",
    "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  ],

  // BONK alternatives
  "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": [
    "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
    "https://assets.coingecko.com/coins/images/28600/small/bonk.jpg",
  ],

  // JUP alternatives
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN": [
    "https://assets.coingecko.com/coins/images/10351/small/logo512.png",
  ],

  // BOME alternatives
  "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82": [
    "https://img.fotofolio.xyz/?url=https%3A%2F%2Fbafybeicvp65xfek34n5h7ody3zdqwgie7xvdza7qrktzmfkuw5p6xkddk4.ipfs.nftstorage.link",
  ],

  // WIF alternatives
  "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm": [
    "https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg",
  ],

  // RAY alternatives
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": [
    "https://assets.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg",
  ],

  // ORCA alternatives
  "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE": [
    "https://assets.coingecko.com/coins/images/17547/small/Orca_Logo.png",
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
