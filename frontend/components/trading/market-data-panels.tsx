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
      <div className="border-b-4 border-[var(--outline-black)] bg-white px-4 py-2 overflow-x-auto flex-shrink-0">
        <div className="flex gap-2 sm:gap-3 text-xs font-bold justify-start sm:justify-center min-w-max">
          <button
            onClick={() => setActiveTab('trades')}
            className={cn(
              "px-3 py-1 rounded-md border-2 border-[var(--outline-black)] transition-all whitespace-nowrap",
              activeTab === 'trades'
                ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
                : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
            )}
          >
            Trades
          </button>

          <button
            onClick={() => setActiveTab('traders')}
            className={cn(
              "px-3 py-1 rounded-md border-2 border-[var(--outline-black)] transition-all whitespace-nowrap",
              activeTab === 'traders'
                ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
                : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
            )}
          >
            Top Traders
          </button>

          <button
            onClick={() => setActiveTab('holders')}
            className={cn(
              "px-3 py-1 rounded-md border-2 border-[var(--outline-black)] transition-all whitespace-nowrap",
              activeTab === 'holders'
                ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
                : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
            )}
          >
            Holders
          </button>

          <button
            onClick={() => setActiveTab('bubblemap')}
            className={cn(
              "px-3 py-1 rounded-md border-2 border-[var(--outline-black)] transition-all whitespace-nowrap",
              activeTab === 'bubblemap'
                ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
                : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
            )}
          >
            Bubble Map
          </button>

          <button
            onClick={() => setActiveTab('positions')}
            className={cn(
              "px-3 py-1 rounded-md border-2 border-[var(--outline-black)] transition-all whitespace-nowrap",
              activeTab === 'positions'
                ? "bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]"
                : "bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]"
            )}
          >
            Portfolio
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
          {trades.map((trade: any, i: number) => {
            // Handle both market trade format and database trade format
            const isBuy = trade.side === 'BUY' || trade.type === 'buy'
            const userDisplay = trade.user?.handle || trade.user?.id || 'Anonymous'
            const tokenAmount = trade.quantity || trade.tokenAmount || 0
            const solAmount = trade.totalCost || trade.solAmount || 0
            
            return (
              <div
                key={`${trade.id || trade.user?.id || i}-${trade.timestamp || trade.createdAt}-${i}`}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border-2",
                  isBuy
                    ? "bg-[var(--luigi-green)]/10 border-[var(--luigi-green)]/30"
                    : "bg-[var(--mario-red)]/10 border-[var(--mario-red)]/30"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center",
                    isBuy ? "bg-[var(--luigi-green)]" : "bg-[var(--mario-red)]"
                  )}>
                    {isBuy ? (
                      <TrendingUp className="h-3 w-3 text-white" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase">{isBuy ? 'BUY' : 'SELL'}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {userDisplay ? `${userDisplay.slice(0, 8)}...` : 'Anonymous'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold">{formatNumber(tokenAmount)} tokens</div>
                  <div className="text-[10px] text-muted-foreground">{formatNumber(solAmount)} SOL</div>
                </div>
              </div>
            )
          })}
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

// Enhanced Holders Panel with Liquidity Pool and Trading Data
function HoldersPanel({ tokenMint }: { tokenMint: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['holders', tokenMint],
    queryFn: () => api.getTokenHolders(tokenMint),
    staleTime: 300000, // 5 minutes
  })

  const holders = data?.holders || []
  const totalSupply = data?.totalSupply ? parseFloat(data.totalSupply) : 0
  const holderCount = data?.holderCount || 0

  // Calculate liquidity pool participation (mock data - would come from API)
  const liquidityPoolHolders = holders.filter((holder: any) => 
    holder.address.includes('LIQUIDITY') || holder.address.includes('POOL')
  )
  const liquidityPoolPercentage = liquidityPoolHolders.reduce((sum: number, holder: any) => 
    sum + holder.percentage, 0
  )

  // Mock trading activity data (would come from API)
  const getHolderType = (holder: any) => {
    if (holder.address.includes('LIQUIDITY') || holder.address.includes('POOL')) {
      return { type: 'Liquidity Pool', icon: '🏊', color: 'text-[var(--sky-blue)]' }
    }
    if (holder.percentage > 10) {
      return { type: 'Whale', icon: '🐋', color: 'text-[var(--mario-red)]' }
    }
    if (holder.percentage > 1) {
      return { type: 'Dolphin', icon: '🐬', color: 'text-[var(--luigi-green)]' }
    }
    return { type: 'Holder', icon: '👤', color: 'text-muted-foreground' }
  }

  return (
    <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-4 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-4 w-4 text-[var(--sky-blue)]" />
        <h3 className="font-bold text-sm">Token Holders & Distribution</h3>
        {holderCount > 0 && (
          <span className="text-xs text-muted-foreground">({holderCount} total)</span>
        )}
      </div>

      {/* Liquidity Pool Summary */}
      {liquidityPoolPercentage > 0 && (
        <div className="mb-4 p-3 bg-[var(--sky-blue)]/10 border-2 border-[var(--sky-blue)]/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏊</span>
              <span className="text-sm font-bold">Liquidity Pool</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">{liquidityPoolPercentage.toFixed(2)}%</div>
              <div className="text-xs text-muted-foreground">of total supply</div>
            </div>
          </div>
        </div>
      )}

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
          {holders.map((holder: any) => {
            const holderInfo = getHolderType(holder)
            const isLiquidityPool = holderInfo.type === 'Liquidity Pool'
            
            return (
              <div key={holder.address} className={cn(
                "flex items-center justify-between p-3 rounded-lg border-2 transition-all",
                isLiquidityPool 
                  ? "bg-[var(--sky-blue)]/10 border-[var(--sky-blue)]/30" 
                  : "bg-muted/50 border-transparent hover:border-[var(--outline-black)]/20"
              )}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "text-xs font-bold shrink-0",
                      holder.rank === 1 ? "text-[var(--star-yellow)]" : "text-muted-foreground"
                    )}>
                      #{holder.rank}
                    </div>
                    <span className="text-sm">{holderInfo.icon}</span>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="text-xs font-mono truncate">
                        {isLiquidityPool ? 'LIQUIDITY POOL' : `${holder.address.slice(0, 8)}...${holder.address.slice(-6)}`}
                      </div>
                      <span className={cn("text-xs font-bold", holderInfo.color)}>
                        {holderInfo.type}
                      </span>
                    </div>
                    
                    {/* Additional holder info */}
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {isLiquidityPool ? (
                        <span>Provides trading liquidity</span>
                      ) : holder.percentage > 5 ? (
                        <span>Major holder • High influence</span>
                      ) : holder.percentage > 1 ? (
                        <span>Significant holder</span>
                      ) : (
                        <span>Individual holder</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold">{holder.percentage.toFixed(2)}%</div>
                  <div className="text-[10px] text-muted-foreground">{formatTokenQuantity(holder.balance)}</div>
                  
                  {/* Progress bar for large holders */}
                  {holder.percentage > 1 && (
                    <div className="w-16 h-1 bg-[var(--outline-black)]/20 rounded-full mt-1">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all",
                          holder.percentage > 10 ? "bg-[var(--mario-red)]" :
                          holder.percentage > 5 ? "bg-[var(--star-yellow)]" :
                          "bg-[var(--luigi-green)]"
                        )}
                        style={{ width: `${Math.min(holder.percentage * 2, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Distribution Summary */}
      {holders.length > 0 && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg border-2 border-[var(--outline-black)]/10">
          <div className="text-xs font-bold mb-2">Distribution Analysis</div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-muted-foreground">Top 5 holders:</span>
              <div className="font-bold">
                {holders.slice(0, 5).reduce((sum: number, holder: any) => sum + holder.percentage, 0).toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Whales (&gt;10%):</span>
              <div className="font-bold">
                {holders.filter((h: any) => h.percentage > 10).length} holders
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Bubble Maps Panel
function BubbleMapsPanel({ tokenMint }: { tokenMint: string }) {
  const { data: isAvailable, isLoading } = useQuery({
    queryKey: ['bubblemap-availability', tokenMint],
    queryFn: () => api.checkBubbleMapAvailability(tokenMint),
    staleTime: 300000, // 5 minutes
  })

  const [iframeLoaded, setIframeLoaded] = useState(false)

  return (
    <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white overflow-hidden min-h-[400px] relative">
      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-[var(--luigi-green)]" />
            <p className="text-sm font-bold">Checking Bubble Map availability...</p>
          </div>
        </div>
      ) : !isAvailable ? (
        <div className="flex items-center justify-center h-[400px] p-6">
          <div className="text-center max-w-md">
            <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-bold text-lg mb-2">Bubble Map Not Available</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This token doesn't have a Bubble Map visualization yet. Maps are created as tokens gain traction and holder activity.
            </p>
            <p className="text-xs text-muted-foreground">
              Check back later or view the Holders tab for distribution data.
            </p>
          </div>
        </div>
      ) : (
        <>
          {!iframeLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-[var(--luigi-green)]" />
                <p className="text-sm font-bold">Loading Bubble Map...</p>
              </div>
            </div>
          )}
          <iframe
            src={`https://app.bubblemaps.io/sol/token/${tokenMint}?small_text&hide_context&prevent_scroll_zoom`}
            className="w-full h-[400px] sm:h-[500px] md:h-[600px] border-0"
            title={`Bubble Map for ${tokenMint}`}
            onLoad={() => setIframeLoaded(true)}
            sandbox="allow-scripts allow-same-origin"
          />
        </>
      )}
    </div>
  )
}

// User Positions Panel
function UserPositionsPanel() {
  const { isAuthenticated, user } = useAuth()
  const { data: portfolio, isLoading } = usePortfolio()
  const router = useRouter()

  if (!isAuthenticated) {
    return (
      <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-6 min-h-[300px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-lg mb-2">Login Required</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Sign in to view your portfolio positions across all tokens
          </p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-[var(--mario-red)] text-white font-bold rounded-lg border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-6 min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-[var(--luigi-green)]" />
          <p className="text-sm font-bold">Loading your positions...</p>
        </div>
      </div>
    )
  }

  const positions = portfolio?.positions || []

  if (positions.length === 0) {
    return (
      <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-6 min-h-[300px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-bold text-lg mb-2">No Positions Yet</h3>
          <p className="text-sm text-muted-foreground">
            You don't have any open positions. Start trading to build your portfolio!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-4 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="h-4 w-4 text-[var(--mario-red)]" />
        <h3 className="font-bold text-sm">Your Portfolio</h3>
        <span className="text-xs text-muted-foreground">({positions.length} positions)</span>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {positions.map((position) => (
          <button
            key={position.mint}
            onClick={() => router.push(`/room/${position.mint}`)}
            className="w-full p-3 bg-white border-2 border-[var(--outline-black)] rounded-lg shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all text-left"
          >
            <div className="flex items-center gap-3">
              {/* Token Image */}
              {position.tokenImage ? (
                <img
                  src={position.tokenImage}
                  alt={position.tokenSymbol || 'Token'}
                  className="w-10 h-10 rounded-full border-2 border-[var(--outline-black)] shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-[var(--outline-black)] bg-[var(--pipe-100)] flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">
                    {position.tokenSymbol?.slice(0, 2) || '??'}
                  </span>
                </div>
              )}

              {/* Token Info & Stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm truncate">
                    {position.tokenSymbol || position.mint.slice(0, 8)}
                  </span>
                  {position.priceChange24h && (
                    <span className={cn(
                      "text-xs font-bold flex items-center gap-0.5",
                      parseFloat(position.priceChange24h) >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
                    )}>
                      {parseFloat(position.priceChange24h) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {parseFloat(position.priceChange24h).toFixed(2)}%
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Holdings:</span>
                    <div className="font-bold">{formatTokenQuantity(position.qty)}</div>
                    <div className="text-muted-foreground">{formatUSD(parseFloat(position.valueUsd))}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">P&L:</span>
                    <div className={cn(
                      "font-bold",
                      parseFloat(position.unrealizedUsd) >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
                    )}>
                      {parseFloat(position.unrealizedUsd) >= 0 ? '+' : ''}{formatUSD(parseFloat(position.unrealizedUsd))}
                    </div>
                    <div className={cn(
                      "text-muted-foreground",
                      parseFloat(position.unrealizedPercent) >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
                    )}>
                      ({parseFloat(position.unrealizedPercent) >= 0 ? '+' : ''}{parseFloat(position.unrealizedPercent).toFixed(2)}%)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
