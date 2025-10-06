export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      Holding: {
        Row: {
          avgPurchaseMarketCap: number | null
          avgSellMarketCap: number | null
          entryPrice: number
          id: string
          quantity: number
          tokenAddress: string
          tokenName: string | null
          tokenSymbol: string | null
          totalSolReceived: number | null
          totalSolSpent: number | null
          updatedAt: string
          userId: string
        }
        Insert: {
          avgPurchaseMarketCap?: number | null
          avgSellMarketCap?: number | null
          entryPrice: number
          id: string
          quantity?: number
          tokenAddress: string
          tokenName?: string | null
          tokenSymbol?: string | null
          totalSolReceived?: number | null
          totalSolSpent?: number | null
          updatedAt: string
          userId: string
        }
        Update: {
          avgPurchaseMarketCap?: number | null
          avgSellMarketCap?: number | null
          entryPrice?: number
          id?: string
          quantity?: number
          tokenAddress?: string
          tokenName?: string | null
          tokenSymbol?: string | null
          totalSolReceived?: number | null
          totalSolSpent?: number | null
          updatedAt?: string
          userId?: string
        }
      }
      Trade: {
        Row: {
          action: string
          id: string
          marketCapAtTrade: number | null
          price: number
          priceUsd: number | null
          quantity: number
          realizedPnL: number | null
          timestamp: string
          tokenAddress: string
          tokenName: string | null
          tokenSymbol: string | null
          totalCost: number
          userId: string
        }
        Insert: {
          action: string
          id: string
          marketCapAtTrade?: number | null
          price: number
          priceUsd?: number | null
          quantity: number
          realizedPnL?: number | null
          timestamp?: string
          tokenAddress: string
          tokenName?: string | null
          tokenSymbol?: string | null
          totalCost: number
          userId: string
        }
        Update: {
          action?: string
          id?: string
          marketCapAtTrade?: number | null
          price?: number
          priceUsd?: number | null
          quantity?: number
          realizedPnL?: number | null
          timestamp?: string
          tokenAddress?: string
          tokenName?: string | null
          tokenSymbol?: string | null
          totalCost?: number
          userId?: string
        }
      }
      User: {
        Row: {
          avatar: string | null
          avatarUrl: string | null
          bio: string | null
          createdAt: string
          discord: string | null
          displayName: string | null
          email: string
          id: string
          isProfilePublic: boolean | null
          passwordHash: string
          telegram: string | null
          twitter: string | null
          updatedAt: string | null
          username: string
          virtualSolBalance: number
          website: string | null
        }
        Insert: {
          avatar?: string | null
          avatarUrl?: string | null
          bio?: string | null
          createdAt?: string
          discord?: string | null
          displayName?: string | null
          email: string
          id: string
          isProfilePublic?: boolean | null
          passwordHash: string
          telegram?: string | null
          twitter?: string | null
          updatedAt?: string | null
          username: string
          virtualSolBalance?: number
          website?: string | null
        }
        Update: {
          avatar?: string | null
          avatarUrl?: string | null
          bio?: string | null
          createdAt?: string
          discord?: string | null
          displayName?: string | null
          email?: string
          id?: string
          isProfilePublic?: boolean | null
          passwordHash?: string
          telegram?: string | null
          twitter?: string | null
          updatedAt?: string | null
          username?: string
          virtualSolBalance?: number
          website?: string | null
        }
      }
      Token: {
        Row: {
          address: string
          firstSeenAt: string | null
          holderCount: number | null
          imageUrl: string | null
          isNew: boolean | null
          isTrending: boolean | null
          lastPrice: number | null
          lastTs: string | null
          lastUpdatedAt: string | null
          liquidityUsd: number | null
          marketCapUsd: number | null
          momentumScore: number | null
          name: string | null
          priceChange1h: number | null
          priceChange24h: number | null
          priceChange5m: number | null
          socials: string[] | null
          symbol: string | null
          volume1h: number | null
          volume24h: number | null
          volume5m: number | null
          websites: string[] | null
        }
        Insert: {
          address: string
          firstSeenAt?: string | null
          holderCount?: number | null
          imageUrl?: string | null
          isNew?: boolean | null
          isTrending?: boolean | null
          lastPrice?: number | null
          lastTs?: string | null
          lastUpdatedAt?: string | null
          liquidityUsd?: number | null
          marketCapUsd?: number | null
          momentumScore?: number | null
          name?: string | null
          priceChange1h?: number | null
          priceChange24h?: number | null
          priceChange5m?: number | null
          socials?: string[] | null
          symbol?: string | null
          volume1h?: number | null
          volume24h?: number | null
          volume5m?: number | null
          websites?: string[] | null
        }
        Update: {
          address?: string
          firstSeenAt?: string | null
          holderCount?: number | null
          imageUrl?: string | null
          isNew?: boolean | null
          isTrending?: boolean | null
          lastPrice?: number | null
          lastTs?: string | null
          lastUpdatedAt?: string | null
          liquidityUsd?: number | null
          marketCapUsd?: number | null
          momentumScore?: number | null
          name?: string | null
          priceChange1h?: number | null
          priceChange24h?: number | null
          priceChange5m?: number | null
          socials?: string[] | null
          symbol?: string | null
          volume1h?: number | null
          volume24h?: number | null
          volume5m?: number | null
          websites?: string[] | null
        }
      }
    }
    Enums: {
      PnlSnapshotType: "TRADE" | "HOURLY" | "DAILY" | "WEEKLY" | "MANUAL"
      TradeStatus: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED"
      TradeType: "BUY" | "SELL"
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
