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
import { Loader2, TrendingUp, TrendingDown, Users, Activity, Network, Wallet } from 'lucide-react'
import { formatUSD, formatNumber, formatTokenQuantity } from '@/lib/format'
import { usePortfolio } from '@/hooks/use-portfolio'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import * as api from '@/lib/api'

interface MarketDataPanelsProps {
  tokenMint: string
}

type TabType = 'trades' | 'traders' | 'holders' | 'bubblemap' | 'positions'

export function MarketDataPanels({ tokenMint }: MarketDataPanelsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('trades')

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs */}
      <div className="border-b-4 border-[var(--outline-black)] bg-white px-4 py-3 overflow-x-auto flex-shrink-0">
        <div className="flex gap-2 sm:gap-3 text-xs font-bold justify-start sm:justify-center min-w-max">
          <button
            onClick={() => setActiveTab('trades')}
            className={cn(
              "px-2 sm:px-3 py-1.5 rounded-md border-2 border-[var(--outline-black)] transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap",
              activeTab === 'trades'
                ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
                : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
            )}
          >
            <Activity className="h-3 w-3" />
            <span className="hidden xs:inline">Trades</span>
          </button>

          <button
            onClick={() => setActiveTab('traders')}
            className={cn(
              "px-2 sm:px-3 py-1.5 rounded-md border-2 border-[var(--outline-black)] transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap",
              activeTab === 'traders'
                ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
                : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
            )}
          >
            <TrendingUp className="h-3 w-3" />
            <span className="hidden sm:inline">Top Traders</span>
            <span className="sm:hidden">Traders</span>
          </button>

          <button
            onClick={() => setActiveTab('holders')}
            className={cn(
              "px-2 sm:px-3 py-1.5 rounded-md border-2 border-[var(--outline-black)] transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap",
              activeTab === 'holders'
                ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
                : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
            )}
          >
            <Users className="h-3 w-3" />
            <span className="hidden xs:inline">Holders</span>
          </button>

          <button
            onClick={() => setActiveTab('bubblemap')}
            className={cn(
              "px-2 sm:px-3 py-1.5 rounded-md border-2 border-[var(--outline-black)] transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap",
              activeTab === 'bubblemap'
                ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
                : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
            )}
          >
            <Network className="h-3 w-3" />
            <span className="hidden xs:inline">Bubble Map</span>
            <span className="xs:hidden">Map</span>
          </button>

          <button
            onClick={() => setActiveTab('positions')}
            className={cn(
              "px-2 sm:px-3 py-1.5 rounded-md border-2 border-[var(--outline-black)] transition-all flex items-center gap-1 sm:gap-1.5 whitespace-nowrap",
              activeTab === 'positions'
                ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
                : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
            )}
          >
            <Wallet className="h-3 w-3" />
            <span className="hidden xs:inline">My Positions</span>
            <span className="xs:hidden">Portfolio</span>
          </button>
        </div>
      </div>

      {/* Data Panel Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {activeTab === 'trades' && <RecentTradesPanel tokenMint={tokenMint} />}
        {activeTab === 'traders' && <TopTradersPanel tokenMint={tokenMint} />}
        {activeTab === 'holders' && <HoldersPanel tokenMint={tokenMint} />}
        {activeTab === 'bubblemap' && <BubbleMapsPanel tokenMint={tokenMint} />}
        {activeTab === 'positions' && <UserPositionsPanel />}
      </div>
    </div>
  )
}

// Recent Trades Panel
function RecentTradesPanel({ tokenMint }: { tokenMint: string }) {
  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['market-trades', tokenMint],
    queryFn: () => api.getMarketTrades(tokenMint),
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  return (
    <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-4 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-4 w-4 text-[var(--luigi-green)]" />
        <h3 className="font-bold text-sm">Recent Market Activity</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--outline-black)]" />
        </div>
      ) : trades.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          <div className="mb-2">📊</div>
          <div className="font-bold mb-1">No recent trades</div>
          <div className="text-xs">Waiting for market activity...</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {trades.map((trade: any, i: number) => (
            <div
              key={`${trade.user}-${trade.timestamp}-${i}`}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg border-2",
                trade.type === 'buy'
                  ? "bg-[var(--luigi-green)]/10 border-[var(--luigi-green)]/30"
                  : "bg-[var(--mario-red)]/10 border-[var(--mario-red)]/30"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  trade.type === 'buy' ? "bg-[var(--luigi-green)]" : "bg-[var(--mario-red)]"
                )}>
                  {trade.type === 'buy' ? (
                    <TrendingUp className="h-3 w-3 text-white" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-white" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold uppercase">{trade.type}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {trade.user ? `${trade.user.slice(0, 4)}...${trade.user.slice(-4)}` : 'Unknown'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold">{formatNumber(trade.tokenAmount || 0)} tokens</div>
                <div className="text-[10px] text-muted-foreground">{formatNumber(trade.solAmount || 0)} SOL</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Top Traders Panel
function TopTradersPanel({ tokenMint }: { tokenMint: string }) {
  const { data: traders = [], isLoading } = useQuery({
    queryKey: ['top-traders', tokenMint],
    queryFn: () => api.getTopTraders(tokenMint),
    staleTime: 60000, // 1 minute
  })

  return (
    <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-4 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-[var(--star-yellow)]" />
        <h3 className="font-bold text-sm">24h Top Performers</h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--outline-black)]" />
        </div>
      ) : traders.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          <div className="mb-2">🏆</div>
          <div className="font-bold mb-1">No traders yet</div>
          <div className="text-xs">Be the first to trade!</div>
        </div>
      ) : (
        <div className="space-y-2">
          {traders.map((trader: any, i: number) => (
            <div key={trader.address} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold text-[var(--star-yellow)]">#{i + 1}</div>
                <div className="text-xs font-mono">{trader.address.slice(0, 4)}...{trader.address.slice(-4)}</div>
              </div>
              <div className="text-right">
                <div className={cn(
                  "text-xs font-bold",
                  trader.pnl > 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
                )}>
                  {trader.pnl > 0 ? '+' : ''}{formatUSD(trader.pnl || 0)}
                </div>
                <div className="text-[10px] text-muted-foreground">{trader.trades || 0} trades</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Holders Panel
function HoldersPanel({ tokenMint }: { tokenMint: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['holders', tokenMint],
    queryFn: () => api.getTokenHolders(tokenMint),
    staleTime: 300000, // 5 minutes
  })

  const holders = data?.holders || []
  const totalSupply = data?.totalSupply ? parseFloat(data.totalSupply) : 0
  const holderCount = data?.holderCount || 0

  return (
    <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-4 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-[var(--sky-blue)]" />
        <h3 className="font-bold text-sm">Top Token Holders</h3>
        {holderCount > 0 && (
          <span className="text-xs text-muted-foreground">({holderCount} total)</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--outline-black)]" />
        </div>
      ) : holders.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          <div className="mb-2">💎</div>
          <div className="font-bold mb-1">No holder data available</div>
          <div className="text-xs">Data will appear once available</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {holders.map((holder: any) => (
            <div key={holder.address} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className={cn(
                  "text-xs font-bold shrink-0",
                  holder.rank === 1 ? "text-[var(--star-yellow)]" : "text-muted-foreground"
                )}>
                  #{holder.rank}
                </div>
                <div className="text-xs font-mono truncate">{holder.address.slice(0, 8)}...{holder.address.slice(-6)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold">{holder.percentage.toFixed(2)}%</div>
                <div className="text-[10px] text-muted-foreground">{formatTokenQuantity(holder.balance)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
