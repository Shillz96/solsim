"use client"

import React from "react"
import { motion } from "framer-motion"
import { Search, TrendingUp, Sparkles, ArrowRight, Building2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import * as api from "@/lib/api"
import { Button } from "@/components/ui/button"
import { EnhancedCard } from "@/components/ui/enhanced-card-system"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"
import type * as Backend from "@/lib/types/backend"
import { MarioPageHeader } from "@/components/shared/mario-page-header"

function StockCardPreview({ token, onClick }: { token: Backend.TrendingToken; onClick: () => void }) {
  const [imageError, setImageError] = React.useState(false)
  const { prices: livePrices } = usePriceStreamContext()
  const livePrice = livePrices.get(token.mint)
  const currentPrice = livePrice?.price || token.priceUsd || 0
  const priceChange = token.priceChange24h || 0

  return (
    <EnhancedCard
      className="p-4 hover:border-blue-500/50 transition-all cursor-pointer group shadow-md hover:shadow-lg"
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Token Header */}
        <div className="flex items-center gap-3">
          {token.logoURI && !imageError ? (
            <img
              src={token.logoURI}
              alt={token.symbol || "Stock"}
              className="w-10 h-10 rounded-full"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-sm font-bold tracking-tight">
                {token.symbol?.replace('x', '').replace('X', '').slice(0, 4) || '??'}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate group-hover:text-blue-500 transition-colors">
              {token.symbol}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {token.name || "Unknown Stock"}
            </p>
          </div>
        </div>

        {/* Price Info */}
        <div className="space-y-1">
          <div className="text-xl font-bold">
            {currentPrice > 0 ? formatUSD(currentPrice) : "N/A"}
          </div>
          <div
            className={cn(
              "text-sm font-medium flex items-center gap-1",
              priceChange > 0
                ? "text-green-600"
                : priceChange < 0
                ? "text-red-600"
                : "text-muted-foreground"
            )}
          >
            {priceChange > 0 ? "+" : ""}
            {priceChange.toFixed(2)}% 24h
          </div>
        </div>

        {/* Trade Button */}
        <Button
          size="sm"
          className="w-full group-hover:bg-blue-500 group-hover:text-white transition-all"
          variant="outline"
        >
          Trade Now
        </Button>
      </div>
    </EnhancedCard>
  )
}

export function TradeEmptyState() {
  const router = useRouter()
  const { prices: livePrices } = usePriceStreamContext()

  // Fetch trending tokens
  const { data: trendingTokens = [] } = useQuery({
    queryKey: ["trending-tokens"],
    queryFn: api.getTrendingTokens,
    staleTime: 60000,
  })

  // Fetch tokenized stocks
  const { data: stockTokens = [] } = useQuery({
    queryKey: ["stocks-tokens"],
    queryFn: () => api.getStocks(8),
    staleTime: 300000, // 5 minutes
  })

  const handleTokenClick = (token: any) => {
    const name = token.name || token.symbol || "Unknown"
    router.push(`/trade?token=${token.mint}&symbol=${token.symbol || ""}&name=${encodeURIComponent(name)}`)
  }

  // Get top 8 trending tokens for display
  const featuredTokens = trendingTokens.slice(0, 8)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-6 mb-12"
        >
          <div className="space-y-4">
            <div className="flex justify-center mb-4">
              <MarioPageHeader
                src="/Select-a-Token-to-Start-Tradin-header.png"
                alt="Select a Token to Start Trading"
                width={1000}
                height={180}
                priority
              />
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Browse trending tokens, search for your favorites, or explore what's popular on Solana
            </p>
          </div>
        </motion.div>

        {/* Trending Tokens Grid */}
        {featuredTokens.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="space-y-6 mb-12"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MarioPageHeader
                  src="/Trending-now-10-22-2025-header.png"
                  alt="Trending Now"
                  width={450}
                  height={80}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/trending")}
                className="gap-2"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {featuredTokens.map((token, index) => {
                const livePrice = livePrices.get(token.mint)
                const currentPrice = livePrice?.price || token.priceUsd || 0
                const priceChange = token.priceChange24h || 0

                return (
                  <motion.div
                    key={token.mint}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index, duration: 0.4 }}
                  >
                    <EnhancedCard
                      className="p-4 hover:border-primary/50 transition-all cursor-pointer group shadow-md hover:shadow-lg"
                      onClick={() => handleTokenClick(token)}
                    >
                      <div className="space-y-3">
                        {/* Token Header */}
                        <div className="flex items-center gap-3">
                          {token.logoURI ? (
                            <img
                              src={token.logoURI}
                              alt={token.symbol || "Token"}
                              className="w-10 h-10 rounded-full"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = "none"
                              }}
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">
                                {(token.symbol || "??").slice(0, 2)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                              {token.symbol}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">
                              {token.name || "Unknown Token"}
                            </p>
                          </div>
                        </div>

                        {/* Price Info */}
                        <div className="space-y-1">
                          <div className="text-xl font-bold">
                            {currentPrice > 0 ? formatUSD(currentPrice) : "N/A"}
                          </div>
                          <div
                            className={cn(
                              "text-sm font-medium flex items-center gap-1",
                              priceChange > 0
                                ? "text-green-600"
                                : priceChange < 0
                                ? "text-red-600"
                                : "text-muted-foreground"
                            )}
                          >
                            {priceChange > 0 ? "+" : ""}
                            {priceChange.toFixed(2)}% 24h
                          </div>
                        </div>

                        {/* Trade Button */}
                        <Button
                          size="sm"
                          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                          variant="outline"
                        >
                          Trade Now
                        </Button>
                      </div>
                    </EnhancedCard>
                  </motion.div>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* Tokenized Stocks Grid - HIDDEN FOR NOW */}
        {/* {stockTokens.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-6 mb-12"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-blue-500" />
                <h2 className="font-heading text-2xl md:text-3xl font-bold">Tokenized Stocks</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/stocks")}
                className="gap-2"
              >
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stockTokens.map((token, index) => (
                <motion.div
                  key={token.mint}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index, duration: 0.4 }}
                >
                  <StockCardPreview token={token} onClick={() => handleTokenClick(token)} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )} */}

        {/* Additional Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <EnhancedCard className="p-6 shadow-md">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">Real-Time Data</h3>
              <p className="text-sm text-muted-foreground">
                All prices are updated in real-time from Solana DEXes including Raydium and Pump.fun
              </p>
            </div>
          </EnhancedCard>

          <EnhancedCard className="p-6 shadow-md">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg">Zero Risk Trading</h3>
              <p className="text-sm text-muted-foreground">
                Practice with virtual SOL. No real money involved, perfect for learning and testing strategies
              </p>
            </div>
          </EnhancedCard>

          <EnhancedCard className="p-6 shadow-md">
            <div className="space-y-3">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Search className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg">Discover Tokens</h3>
              <p className="text-sm text-muted-foreground">
                Browse trending tokens, search by name or symbol, and explore the Solana ecosystem
              </p>
            </div>
          </EnhancedCard>
        </motion.div>

        {/* Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl"></div>
          <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-accent/3 rounded-full blur-2xl"></div>
        </div>
      </main>
    </div>
  )
}
