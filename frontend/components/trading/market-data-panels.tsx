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

import { useState, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown, Users, Network, Wallet } from 'lucide-react'
import { formatUSD, formatNumber } from '@/lib/format'
import { usePortfolio } from '@/hooks/use-portfolio'
import { useRouter } from 'next/navigation'
import { usePumpPortalTradesWithHistory } from '@/hooks/use-pumpportal-trades'

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

// Top Traders Panel
const TopTradersPanel = memo(function TopTradersPanel({ tokenMint }: { tokenMint: string }) {
  return (
    <div className="mario-card bg-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-star)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
          <Users className="w-5 h-5 text-[var(--outline-black)]" />
        </div>
        <div>
          <h3 className="font-bold text-sm uppercase">Top Traders</h3>
          <p className="text-xs text-[var(--foreground)] opacity-70">Loading...</p>
        </div>
      </div>
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🏆</div>
        <h4 className="font-bold mb-1">Coming Soon</h4>
        <p className="text-sm text-[var(--foreground)] opacity-70">Top trader data loading...</p>
      </div>
    </div>
  )
})

// Holders Panel
const HoldersPanel = memo(function HoldersPanel({ tokenMint }: { tokenMint: string }) {
  return (
    <div className="mario-card bg-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-coin)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
          <Wallet className="w-5 h-5 text-[var(--outline-black)]" />
        </div>
        <div>
          <h3 className="font-bold text-sm uppercase">Holders</h3>
          <p className="text-xs text-[var(--foreground)] opacity-70">Loading...</p>
        </div>
      </div>
      <div className="text-center py-8">
        <div className="text-4xl mb-2">👥</div>
        <h4 className="font-bold mb-1">Coming Soon</h4>
        <p className="text-sm text-[var(--foreground)] opacity-70">Holder data loading...</p>
      </div>
    </div>
  )
})

// Bubble Maps Panel
const BubbleMapsPanel = memo(function BubbleMapsPanel({ tokenMint }: { tokenMint: string }) {
  return (
    <div className="mario-card bg-white p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-super)] border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
          <Network className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-sm uppercase">Bubble Map</h3>
          <p className="text-xs text-[var(--foreground)] opacity-70">Loading...</p>
        </div>
      </div>
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🫧</div>
        <h4 className="font-bold mb-1">Coming Soon</h4>
        <p className="text-sm text-[var(--foreground)] opacity-70">Bubble map visualization loading...</p>
      </div>
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
