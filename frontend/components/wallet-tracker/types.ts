export interface WalletActivity {
  id: string
  walletAddress: string
  signature: string
  type: 'BUY' | 'SELL' | 'SWAP'
  tokenIn: {
    mint?: string
    symbol?: string
    amount?: string
  }
  tokenOut: {
    mint?: string
    symbol?: string
    amount?: string
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
}
