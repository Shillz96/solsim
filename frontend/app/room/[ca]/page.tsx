'use client'

/**
 * Trade Room Page - /room/[ca]
 *
 * Full-width trading page with:
 * - TradingView Lightweight Charts
 * - Enhanced Mario Trading Panel
 * - Live Chat Room
 * - Market Data Panels
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import dynamicImport from 'next/dynamic'
import { MarioTradingPanel } from '@/components/trading/mario-trading-panel'
import { useAuth } from '@/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import * as api from '@/lib/api'
import { Loader2 } from 'lucide-react'

// Remove dynamic exports - they cause Vercel bundling issues
// The page is already 'use client' so it will render dynamically

// Dynamically import chart component to prevent SSR issues
const LightweightChart = dynamicImport(
  () => import('@/components/trading/lightweight-chart').then(mod => mod.LightweightChart),
  {
    ssr: false,
    loading: () => (
      <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] bg-[#FFFAE9] overflow-hidden flex items-center justify-center" style={{ minHeight: '500px' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--mario-red)]" />
          <div className="text-sm font-bold">Loading chart...</div>
        </div>
      </div>
    ),
  }
)

export default function TradeRoomPage() {
  const params = useParams()
  const ca = params?.ca as string
  const { isAuthenticated } = useAuth()

  // Early return if no CA
  if (!ca) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="text-xl font-bold mb-2">Invalid Token</div>
          <div className="text-sm text-muted-foreground">
            No contract address provided
          </div>
        </div>
      </div>
    )
  }

  // Fetch token details
  const { data: tokenDetails, isLoading: loadingToken, error: tokenError } = useQuery({
    queryKey: ['token-details', ca],
    queryFn: () => api.getTokenDetails(ca),
    enabled: !!ca,
  })

  if (loadingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--mario-red)]" />
          <div className="text-sm font-bold">Loading token data...</div>
        </div>
      </div>
    )
  }

  if (tokenError || !tokenDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <div className="text-xl font-bold mb-2 text-[var(--mario-red)]">
            Token Not Found
          </div>
          <div className="text-sm text-muted-foreground">
            Could not load token details for {ca}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[var(--background)] flex flex-col">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 border-b-4 border-[var(--outline-black)] bg-[var(--background)]/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between w-full max-w-[2000px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg border-3 border-[var(--outline-black)] bg-[var(--mario-red)] flex items-center justify-center">
              <span className="text-white font-black text-xs">1UP</span>
            </div>
            <div className="font-black text-lg tracking-tight hidden sm:block">
              1UP SOL
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-xs font-mono">
              Price: <b>${parseFloat(tokenDetails.lastPrice || '0').toFixed(6)}</b>
            </div>
            {tokenDetails.priceChange24h && (
              <div className={`text-xs font-mono font-bold ${
                parseFloat(tokenDetails.priceChange24h) >= 0
                  ? 'text-[var(--luigi-green)]'
                  : 'text-[var(--mario-red)]'
              }`}>
                {parseFloat(tokenDetails.priceChange24h) >= 0 ? '+' : ''}
                {parseFloat(tokenDetails.priceChange24h).toFixed(2)}%
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 w-full overflow-hidden max-w-[2000px] mx-auto">
        {/* Left Section - Chart & Data Panels */}
        <section className="flex-1 flex flex-col bg-[var(--background)] overflow-y-auto">
          {/* Token Info Header */}
          <div className="border-b-3 border-[var(--outline-black)] bg-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tokenDetails.imageUrl && (
                <img
                  src={tokenDetails.imageUrl}
                  alt={tokenDetails.symbol || 'Token'}
                  className="h-12 w-12 rounded-lg border-3 border-[var(--outline-black)]"
                />
              )}
              <div>
                <div className="font-black text-lg">{tokenDetails.name}</div>
                <div className="text-xs opacity-70">
                  {tokenDetails.symbol} •
                  {tokenDetails.marketCapUsd && ` FDV: $${(parseFloat(tokenDetails.marketCapUsd) / 1_000_000).toFixed(2)}M`}
                  {tokenDetails.liquidityUsd && ` • Liq: $${(parseFloat(tokenDetails.liquidityUsd) / 1_000).toFixed(0)}K`}
                </div>
                <div className="text-[10px] font-mono opacity-50">
                  {ca.slice(0, 8)}...{ca.slice(-8)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="text-xs px-3 py-1.5 rounded-lg border-2 border-[var(--outline-black)] bg-[var(--star-yellow)] font-extrabold hover:shadow-[2px_2px_0_var(--outline-black)] transition-all">
                ★ Watch
              </button>
              <button className="text-xs px-3 py-1.5 rounded-lg border-2 border-[var(--outline-black)] bg-[var(--sky-blue)] font-extrabold hover:shadow-[2px_2px_0_var(--outline-black)] transition-all">
                Share
              </button>
            </div>
          </div>

          {/* Chart Area */}
          <div className="p-4">
            <LightweightChart
              tokenMint={ca}
              tokenSymbol={tokenDetails.symbol || 'TOKEN'}
              className="w-full"
            />
          </div>

          {/* Tabs for Data Panels */}
          <div className="border-t-3 border-[var(--outline-black)] bg-white px-4 py-2 flex gap-4 text-xs font-bold justify-center">
            {['Trades', 'Top Traders', 'Holders'].map(tab => (
              <button
                key={tab}
                className="px-3 py-1.5 rounded-md border-2 border-[var(--outline-black)] bg-white hover:bg-[var(--pipe-100)] transition-colors"
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Data Panels Placeholder */}
          <div className="p-4">
            <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white p-4 min-h-[200px]">
              <div className="text-sm text-muted-foreground text-center py-8">
                Market data panels coming soon...
              </div>
            </div>
          </div>
        </section>

        {/* Right Sidebar - Trade Panel & Chat */}
        <aside className="hidden lg:flex flex-col w-[380px] border-l-4 border-[var(--outline-black)] bg-[var(--background)] overflow-hidden">
          {/* Trade Panel */}
          <div className="p-3 border-b-3 border-[var(--outline-black)]">
            <MarioTradingPanel tokenAddress={ca} />
          </div>

          {/* Chat Room Placeholder */}
          <div className="flex-1 flex flex-col p-3 overflow-y-auto">
            <div className="font-bold text-sm mb-2">Chat Room</div>
            <div className="flex-1 border-3 border-[var(--outline-black)] rounded-lg bg-white p-3 flex items-center justify-center">
              <div className="text-xs text-muted-foreground text-center">
                Chat coming soon...
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom Quick Trade Bar */}
      <footer className="border-t-4 border-[var(--outline-black)] bg-white px-4 py-2 flex items-center justify-between text-xs">
        <div className="font-mono">
          {tokenDetails.symbol} — ${parseFloat(tokenDetails.lastPrice || '0').toFixed(6)}
        </div>
        <div className="flex gap-2">
          <button className="h-8 px-4 rounded-lg border-2 border-[var(--outline-black)] bg-[var(--luigi-green)] text-white font-bold hover:shadow-[2px_2px_0_var(--outline-black)] transition-all">
            Quick Buy
          </button>
          <button className="h-8 px-4 rounded-lg border-2 border-[var(--outline-black)] bg-[var(--mario-red)] text-white font-bold hover:shadow-[2px_2px_0_var(--outline-black)] transition-all">
            Quick Sell
          </button>
        </div>
      </footer>
    </div>
  )
}
