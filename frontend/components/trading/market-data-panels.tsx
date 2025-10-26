'use client'

/**
 * Market Data Panels Component - Simplified Clean Version
 *
 * Tabbed interface showing:
 * - Recent Trades
 * - Top Traders
 * - Holders
 * - Bubble Map
 * - Portfolio
 */

import React, { useState, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, Users, Network, Wallet } from 'lucide-react'
import { formatUSD, formatNumber } from '@/lib/format'
import { usePortfolio } from '@/hooks/use-portfolio'
import { useRouter } from 'next/navigation'
import { usePumpPortalTradesWithHistory, useTopTradersFromStream } from '@/hooks/use-pumpportal-trades'
import { getTokenHolders, checkBubbleMapAvailability } from '@/lib/api'

interface MarketDataPanelsProps {
  tokenMint: string
}

type TabType = 'trades' | 'traders' | 'holders' | 'bubblemap' | 'positions'

export function MarketDataPanels({ tokenMint }: MarketDataPanelsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('trades')

  return (
    <div className="mario-card-lg h-full flex flex-col">
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('trades')}
          className={cn(
            "mario-btn px-4 py-2 text-sm flex items-center gap-2",
            activeTab === 'trades'
              ? "bg-[var(--color-luigi)] text-white"
              : "bg-white text-[var(--outline-black)] opacity-50"
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Trades
        </button>
        <button
          onClick={() => setActiveTab('traders')}
          className={cn(
            "mario-btn px-4 py-2 text-sm flex items-center gap-2",
            activeTab === 'traders'
              ? "bg-[var(--color-luigi)] text-white"
              : "bg-white text-[var(--outline-black)] opacity-50"
          )}
        >
          <Users className="w-4 h-4" />
          Top Traders
        </button>
        <button
          onClick={() => setActiveTab('holders')}
          className={cn(
            "mario-btn px-4 py-2 text-sm flex items-center gap-2",
            activeTab === 'holders'
              ? "bg-[var(--color-luigi)] text-white"
              : "bg-white text-[var(--outline-black)] opacity-50"
          )}
        >
          <Users className="w-4 h-4" />
          Holders
        </button>
        <button
          onClick={() => setActiveTab('bubblemap')}
          className={cn(
            "mario-btn px-4 py-2 text-sm flex items-center gap-2",
            activeTab === 'bubblemap'
              ? "bg-[var(--color-luigi)] text-white"
              : "bg-white text-[var(--outline-black)] opacity-50"
          )}
        >
          <Network className="w-4 h-4" />
          Bubble Map
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={cn(
            "mario-btn px-4 py-2 text-sm flex items-center gap-2",
            activeTab === 'positions'
              ? "bg-[var(--color-luigi)] text-white"
              : "bg-white text-[var(--outline-black)] opacity-50"
          )}
        >
          <Wallet className="w-4 h-4" />
          Portfolio
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
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
const RecentTradesPanel = memo(function RecentTradesPanel({ tokenMint }: { tokenMint: string }) {
  const { trades, status, isLoadingHistory } = usePumpPortalTradesWithHistory({
    tokenMint,
    maxTrades: 50,
    enabled: true,
  })

  const isLoading = isLoadingHistory && trades.length === 0
  const isConnected = status === 'connected'

  return (
    <div className="mario-card bg-white p-4 h-full overflow-hidden flex flex-col">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-luigi)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
          <TrendingUp className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm uppercase">Recent Market Activity</h3>
          <p className="text-xs text-[var(--foreground)] opacity-70">
            {isConnected ? 'Live' : status}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-luigi)]" />
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📊</div>
          <h4 className="font-bold mb-1">No recent trades</h4>
          <p className="text-sm text-[var(--foreground)] opacity-70">Waiting for market activity...</p>
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1">
          {trades.map((trade, index) => {
            const isBuy = trade.side === 'buy'
            return (
              <div key={index} className="mario-card-sm bg-white p-3 flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]",
                  isBuy ? "bg-[var(--color-luigi)]" : "bg-[var(--color-sell)]"
                )}>
                  {isBuy ? (
                    <TrendingUp className="w-4 h-4 text-white" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{isBuy ? 'BUY' : 'SELL'}</span>
                    <span className="text-xs font-mono">{formatNumber(trade.amountSol || 0)} SOL</span>
                  </div>
                  <div className="text-xs text-[var(--foreground)] opacity-70 truncate">
                    {formatNumber(trade.amountToken || 0)} tokens
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

// Top Traders Panel - Now using real-time PumpPortal WebSocket
const TopTradersPanel = memo(function TopTradersPanel({ tokenMint }: { tokenMint: string }) {
  const { topTraders: traders, status } = useTopTradersFromStream({
    tokenMint,
    limit: 10,
    enabled: true,
  })

  const isLoading = status === 'connecting'
  const isConnected = status === 'connected'

  return (
    <div className="mario-card bg-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-star)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
          <Users className="w-5 h-5 text-[var(--outline-black)]" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm uppercase">Top Traders</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[var(--foreground)] opacity-70">Real-time activity</p>
            {isConnected && (
              <span className="inline-flex items-center gap-1 text-[10px] text-[var(--luigi-green)] font-bold">
                <span className="w-1.5 h-1.5 bg-[var(--luigi-green)] rounded-full animate-pulse"></span>
                LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm text-[var(--foreground)] opacity-70">Connecting to live data...</p>
        </div>
      ) : !traders || traders.length === 0 ? (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-sm text-[var(--foreground)] opacity-70">No trading activity yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {traders.map((trader, index: number) => (
            <div
              key={trader.address}
              className="flex items-center justify-between p-2 rounded-lg border-2 border-[var(--outline-black)] bg-[var(--background)] hover:bg-[var(--color-star)] hover:bg-opacity-10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{index + 1}.</span>
                <span className="text-xs font-mono">
                  {trader.address.slice(0, 4)}...{trader.address.slice(-4)}
                </span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-bold ${trader.profitSol >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'}`}>
                  {trader.profitSol >= 0 ? '+' : ''}{trader.profitSol.toFixed(3)} SOL
                </div>
                <div className="text-xs opacity-70">{trader.trades} trades</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

// Holders Panel
const HoldersPanel = memo(function HoldersPanel({ tokenMint }: { tokenMint: string }) {
  const { data: holderData, isLoading } = useQuery({
    queryKey: ['token-holders', tokenMint],
    queryFn: () => getTokenHolders(tokenMint, 10),
    refetchInterval: 30000, // Refresh every 30 seconds (improved from 60s)
    staleTime: 15000, // Consider data stale after 15 seconds (improved from 30s)
  })

  return (
    <div className="mario-card bg-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-coin)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
          <Wallet className="w-5 h-5 text-[var(--outline-black)]" />
        </div>
        <div>
          <h3 className="font-bold text-sm uppercase">Top Holders</h3>
          {holderData && (
            <p className="text-xs text-[var(--foreground)] opacity-70">
              {holderData.holderCount} total holders
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm text-[var(--foreground)] opacity-70">Loading holders...</p>
        </div>
      ) : !holderData || holderData.holders.length === 0 ? (
        <div className="text-center py-4">
          <div className="text-2xl mb-2">👥</div>
          <p className="text-sm text-[var(--foreground)] opacity-70">No holder data available</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {holderData.holders.map((holder) => (
            <div
              key={holder.address}
              className="flex items-center justify-between p-2 rounded-lg border-2 border-[var(--outline-black)] bg-[var(--background)] hover:bg-[var(--color-coin)] hover:bg-opacity-10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">#{holder.rank}</span>
                <span className="text-xs font-mono">
                  {holder.address.slice(0, 4)}...{holder.address.slice(-4)}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{holder.percentage.toFixed(2)}%</div>
                <div className="text-xs opacity-70 font-mono">
                  {parseInt(holder.balance).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

// Bubble Maps Panel
const BubbleMapsPanel = memo(function BubbleMapsPanel({ tokenMint }: { tokenMint: string }) {
  const [isAvailable, setIsAvailable] = React.useState<boolean | null>(null)
  const [showIframe, setShowIframe] = React.useState(false)

  React.useEffect(() => {
    checkBubbleMapAvailability(tokenMint).then(available => {
      setIsAvailable(available)
    })
  }, [tokenMint])

  if (isAvailable === null) {
    return (
      <div className="mario-card bg-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-super)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase">Bubble Map</h3>
            <p className="text-xs text-[var(--foreground)] opacity-70">Checking...</p>
          </div>
        </div>
        <div className="text-center py-4">
          <div className="text-2xl mb-2">⏳</div>
          <p className="text-sm text-[var(--foreground)] opacity-70">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAvailable) {
    return (
      <div className="mario-card bg-white p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-super)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm uppercase">Bubble Map</h3>
            <p className="text-xs text-[var(--foreground)] opacity-70">Not available</p>
          </div>
        </div>
        <div className="text-center py-4">
          <div className="text-2xl mb-2">🫧</div>
          <p className="text-sm text-[var(--foreground)] opacity-70">
            Bubble map not available for this token
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mario-card bg-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-super)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
          <Network className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm uppercase">Bubble Map</h3>
          <p className="text-xs text-[var(--foreground)] opacity-70">Interactive visualization</p>
        </div>
      </div>

      {!showIframe ? (
        <div className="text-center py-4">
          <div className="text-4xl mb-3">🫧</div>
          <button
            onClick={() => setShowIframe(true)}
            className="px-4 py-2 bg-[var(--color-super)] text-white rounded-lg border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all font-bold text-sm"
          >
            Load Bubble Map
          </button>
          <p className="text-xs text-[var(--foreground)] opacity-70 mt-2">
            Click to visualize holder distribution
          </p>
        </div>
      ) : (
        <div className="relative w-full h-[400px] rounded-lg overflow-hidden border-3 border-[var(--outline-black)]">
          <iframe
            src={`https://bubblemaps.io/sol/token/${tokenMint}`}
            className="w-full h-full"
            title="Bubble Map"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
      )}
    </div>
  )
})

// User Positions Panel
const UserPositionsPanel = memo(function UserPositionsPanel() {
  const { data: portfolio } = usePortfolio()
  
  return (
    <div className="mario-card bg-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-brand)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
          <Wallet className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm uppercase">Your Portfolio</h3>
          <p className="text-xs text-[var(--foreground)] opacity-70">
            {portfolio?.positions?.length || 0} positions
          </p>
        </div>
      </div>
      <div className="text-center py-8">
        <div className="text-4xl mb-2">💼</div>
        <h4 className="font-bold mb-1">Portfolio View</h4>
        <p className="text-sm text-[var(--foreground)] opacity-70">Your active positions...</p>
      </div>
    </div>
  )
})
