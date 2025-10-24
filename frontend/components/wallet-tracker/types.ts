export interface WalletActivity {
  id: string
  walletAddress: string
  signature?: string
  type: 'BUY' | 'SELL' | 'SWAP'
  tokenIn: {
    mint?: string
    symbol?: string
    amount?: string
    logoURI?: string
  }
  tokenOut: {
    mint?: string
    symbol?: string
    amount?: string
    logoURI?: string
  }
  priceUsd?: string
  solAmount?: string
  program?: string
  fee?: string
  marketCap?: string
  volume24h?: string
  priceChange24h?: string
  timestamp: string
  timeAgo: string
  tokenCreatedAt?: string // When the token was created
  tokenAge?: string // Human-readable token age (e.g., "2h", "8m", "1d")
}

export interface TrackedWallet {
  id: string
  userId: string
  walletAddress: string
  label?: string
  isActive: boolean
  createdAt: string
}

export interface WalletTrackerSettings {
  showBuys: boolean
  showSells: boolean
  showFirstBuyOnly: boolean
  minMarketCap?: number
  maxMarketCap?: number
  minTransactionUsd?: number
  maxTransactionUsd?: number
  requireImages: boolean
}
