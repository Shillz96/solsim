'use client'

/**
 * Market Data Panels Component
 * 
 * Tabbed interface showing:
 * - Recent Trades (with whale alerts)
 * - Top Traders (24h leaderboard)
 * - Holders (distribution)
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, Users, Activity } from 'lucide-react'
import { formatUSD, formatNumber, formatTokenQuantity } from '@/lib/format'
import * as api from '@/lib/api'

interface MarketDataPanelsProps {
  tokenMint: string
}

type TabType = 'trades' | 'traders' | 'holders'

export function MarketDataPanels({ tokenMint }: MarketDataPanelsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('trades')

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="border-b-3 border-[var(--outline-black)] bg-white px-4 py-2 flex gap-4 text-xs font-bold justify-center flex-shrink-0">
        <button
          onClick={() => setActiveTab('trades')}
          className={cn(
            "px-3 py-1.5 rounded-md border-2 border-[var(--outline-black)] transition-all flex items-center gap-1.5",
            activeTab === 'trades'
              ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
              : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
          )}
        >
          <Activity className="h-3 w-3" />
          Trades
        </button>

        <button
          onClick={() => setActiveTab('traders')}
          className={cn(
            "px-3 py-1.5 rounded-md border-2 border-[var(--outline-black)] transition-all flex items-center gap-1.5",
            activeTab === 'traders'
              ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
              : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
          )}
        >
          <TrendingUp className="h-3 w-3" />
          Top Traders
        </button>

        <button
          onClick={() => setActiveTab('holders')}
          className={cn(
            "px-3 py-1.5 rounded-md border-2 border-[var(--outline-black)] transition-all flex items-center gap-1.5",
            activeTab === 'holders'
              ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
              : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
          )}
        >
          <Users className="h-3 w-3" />
          Holders
        </button>
      </div>

      {/* Data Panel Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'trades' && <RecentTradesPanel tokenMint={tokenMint} />}
        {activeTab === 'traders' && <TopTradersPanel tokenMint={tokenMint} />}
        {activeTab === 'holders' && <HoldersPanel tokenMint={tokenMint} />}
      </div>
    </div>
  )
}

// Recent Trades Panel
function RecentTradesPanel({ tokenMint }: { tokenMint: string }) {
  // TODO: Implement API endpoint for recent trades
  // const { data, isLoading } = useQuery({
  //   queryKey: ['market-trades', tokenMint],
  //   queryFn: () => api.getMarketTrades(tokenMint),
  //   refetchInterval: 10000, // Refresh every 10 seconds
  // })

  return (
    <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-4 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-[var(--luigi-green)]" />
        <h3 className="font-bold text-sm">Recent Market Activity</h3>
      </div>

      <div className="space-y-2">
        {/* Placeholder for now */}
        <div className="text-sm text-muted-foreground text-center py-8">
          <div className="mb-2">📊</div>
          <div className="font-bold mb-1">Live trade feed coming soon</div>
          <div className="text-xs">Real-time buys and sells with whale alerts</div>
        </div>

        {/* Example of what it will look like */}
        {/* <div className="flex items-center justify-between p-2 bg-[var(--luigi-green)]/10 rounded-lg border-2 border-[var(--luigi-green)]/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[var(--luigi-green)] flex items-center justify-center">
              <TrendingUp className="h-3 w-3 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold">BUY</div>
              <div className="text-[10px] text-muted-foreground">2m ago</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold">1.5M tokens</div>
            <div className="text-[10px] text-muted-foreground">$250</div>
          </div>
        </div> */}
      </div>
    </div>
  )
}

// Top Traders Panel
function TopTradersPanel({ tokenMint }: { tokenMint: string }) {
  // TODO: Implement API endpoint for top traders
  // const { data, isLoading } = useQuery({
  //   queryKey: ['top-traders', tokenMint],
  //   queryFn: () => api.getTopTraders(tokenMint),
  //   staleTime: 60000, // 1 minute
  // })

  return (
    <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-4 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-[var(--star-yellow)]" />
        <h3 className="font-bold text-sm">24h Top Performers</h3>
      </div>

      <div className="space-y-2">
        {/* Placeholder for now */}
        <div className="text-sm text-muted-foreground text-center py-8">
          <div className="mb-2">🏆</div>
          <div className="font-bold mb-1">Leaderboard coming soon</div>
          <div className="text-xs">See who's winning with this token</div>
        </div>

        {/* Example of what it will look like */}
        {/* <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="text-xs font-bold text-[var(--star-yellow)]">#1</div>
            <div className="text-xs font-mono">7x4J...kL2p</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-[var(--luigi-green)]">+$1,250</div>
            <div className="text-[10px] text-muted-foreground">+45%</div>
          </div>
        </div> */}
      </div>
    </div>
  )
}

// Holders Panel
function HoldersPanel({ tokenMint }: { tokenMint: string }) {
  // TODO: Implement API endpoint for holder distribution
  // const { data, isLoading } = useQuery({
  //   queryKey: ['holders', tokenMint],
  //   queryFn: () => api.getTokenHolders(tokenMint),
  //   staleTime: 300000, // 5 minutes
  // })

  return (
    <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-4 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-[var(--sky-blue)]" />
        <h3 className="font-bold text-sm">Token Holders</h3>
      </div>

      <div className="space-y-2">
        {/* Placeholder for now */}
        <div className="text-sm text-muted-foreground text-center py-8">
          <div className="mb-2">💎</div>
          <div className="font-bold mb-1">Holder distribution coming soon</div>
          <div className="text-xs">Top 20 wallets and supply percentage</div>
        </div>

        {/* Example of what it will look like */}
        {/* <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono">7x4J...kL2p</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold">5.2M tokens</div>
            <div className="text-[10px] text-muted-foreground">2.5% supply</div>
          </div>
        </div> */}
      </div>
    </div>
  )
}
