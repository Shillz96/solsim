"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, TrendingUp, Filter, Loader2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, TrendingDown, Sparkles, RefreshCw } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import type * as Backend from "@/lib/types/backend"
import { useTrendingTokens } from "@/hooks/use-react-query-hooks"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { cn, marioStyles } from "@/lib/utils"

type BirdeyeSortBy = "rank" | "volume24hUSD" | "liquidity"
type SortField = "price" | "priceChange24h" | "marketCapUsd" | "volume24h" | "trendScore"
type SortDirection = "asc" | "desc"

export default function TrendingPage() {
  const [birdeyeSortBy, setBirdeyeSortBy] = useState<BirdeyeSortBy>("rank")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("volume24h")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const { data: trendingTokens, isLoading: loading, error, refetch: refresh } = useTrendingTokens(50, birdeyeSortBy)
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    if (!trendingTokens) return []

    let filtered = trendingTokens.filter(
      (token) =>
        token.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol?.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const sorted = [...filtered].sort((a, b) => {
      let aValue: number
      let bValue: number

      switch (sortField) {
        case "price":
          aValue = a.priceUsd || 0
          bValue = b.priceUsd || 0
          break
        case "priceChange24h":
          aValue = a.priceChange24h || 0
          bValue = b.priceChange24h || 0
          break
        case "marketCapUsd":
          aValue = a.marketCapUsd || 0
          bValue = b.marketCapUsd || 0
          break
        case "volume24h":
          aValue = a.volume24h || 0
          bValue = b.volume24h || 0
          break
        case "trendScore":
          aValue = Math.abs(a.priceChange24h || 0)
          bValue = Math.abs(b.priceChange24h || 0)
          break
        default:
          return 0
      }

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    })

    return sorted
  }, [trendingTokens, searchQuery, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    )
  }

  const getRankImage = (rank: number) => {
    switch (rank) {
      case 1:
        return "/icons/mario/1st.png"
      case 2:
        return "/icons/mario/2nd-place.png"
      case 3:
        return "/icons/mario/3rd.png"
      default:
        return null
    }
  }

  const isBigMover = (priceChange: number) => Math.abs(priceChange) > 50

  return (
    <div className="min-h-screen bg-background">
      {/* Full Width Container */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Trending Header Image */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-center justify-between"
        >
          <Image
            src="/Trending-tokens-header.png"
            alt="Trending Tokens"
            width={750}
            height={120}
            priority
            className="w-auto h-auto max-w-full"
          />
          
          {/* Controls moved to header level */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => refresh()}
              disabled={loading}
              className={cn(marioStyles.iconButton('primary'), 'w-10 h-10')}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                marioStyles.cardSm(false),
                'mb-6 bg-gradient-to-br from-[var(--mario-red)]/10 to-[var(--mario-red)]/5'
              )}
            >
              <p className="text-mario font-bold">{String(error)}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters & Search Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className={marioStyles.card()}>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              
              {/* Sort Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-mario" />
                  <span className="font-body text-sm font-semibold text-foreground">Sort by:</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "rank" as BirdeyeSortBy, label: "🏆 Rank", icon: "🏆" },
                    { value: "volume24hUSD" as BirdeyeSortBy, label: "💰 Volume", icon: "💰" },
                    { value: "liquidity" as BirdeyeSortBy, label: "💧 Liquidity", icon: "💧" }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={birdeyeSortBy === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBirdeyeSortBy(option.value)}
                      className={cn(
                        marioStyles.button(
                          birdeyeSortBy === option.value ? 'danger' : 'outline',
                          'sm'
                        )
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tokens by name or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 font-body border-3 border-outline-black focus:border-mario hover-outline"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Overview Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Tokens Card */}
            <div className="mario-card surface">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-luigi border-3 border-outline flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Image 
                    src="/icons/mario/coin.png" 
                    alt="Tokens" 
                    width={24} 
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-outline">Total Tokens</h3>
                  <p className="text-2xl font-bold text-outline">
                    {filteredAndSortedTokens.length.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Big Movers Card */}
            <div className="mario-card surface">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-star border-3 border-outline flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Image 
                    src="/icons/mario/fire.png" 
                    alt="Big Movers" 
                    width={24} 
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-outline">Big Movers</h3>
                  <p className="text-2xl font-bold text-outline">
                    {filteredAndSortedTokens.filter(token => Math.abs(token.priceChange24h || 0) > 50).length}
                  </p>
                </div>
              </div>
            </div>

            {/* Top Gainer Card */}
            <div className="mario-card surface">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-sky border-3 border-outline flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Image 
                    src="/icons/mario/trending.png" 
                    alt="Top Gainer" 
                    width={24} 
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-outline">Top Gainer</h3>
                  <div className="text-2xl font-bold text-luigi">
                    {filteredAndSortedTokens.length > 0 ? (
                      <span>+{Math.max(...filteredAndSortedTokens.map(t => t.priceChange24h || 0)).toFixed(1)}%</span>
                    ) : (
                      <span>N/A</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Volume Card */}
            <div className="mario-card surface">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-coin border-3 border-outline flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_var(--outline-black)]">
                  <Image 
                    src="/icons/mario/trophy.png" 
                    alt="Volume" 
                    width={24} 
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-outline">Total Volume</h3>
                  <div className="text-2xl font-bold text-outline">
                    {filteredAndSortedTokens.length > 0 ? (
                      <UsdWithSol
                        usd={filteredAndSortedTokens.reduce((sum, token) => sum + (token.volume24h || 0), 0)}
                        className="text-2xl font-bold"
                        solClassName="text-xs"
                        compact
                      />
                    ) : (
                      <span>N/A</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full"
        >
          <div className={marioStyles.cardLg(false)}>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-outline border-t-[var(--star-yellow)] mx-auto"></div>
                <p className={cn(marioStyles.bodyText('semibold'), 'mt-4')}>Loading trending tokens...</p>
              </div>
            ) : error ? (
              <div className="p-6">
                <Alert variant="destructive" className="border-3 border-mario bg-destructive/10 hover-outline">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="font-body font-semibold">
                    Failed to load trending tokens: {error?.message || 'Unknown error'}
                    <Button 
                      size="sm" 
                      className="ml-3 mario-btn mario-btn-red hover-outline" 
                      onClick={() => refresh()}
                    >
                      🔄 Try Again
                    </Button>
                  </AlertDescription>
                </Alert>
              </div>
            ) : filteredAndSortedTokens.length === 0 ? (
              <div className="p-12 text-center bg-card">
                <div className="text-6xl mb-4">🔍</div>
                <p className="font-display text-2xl text-foreground mb-2">No tokens found</p>
                <p className="font-body text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAndSortedTokens.map((token, index) => {
                  const bigMover = Math.abs(token.priceChange24h || 0) > 50
                  const rank = index + 1

                  return (
                    <motion.div
                      key={token.mint}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                      className={cn(
                        "flex items-center gap-4 p-3 rounded-lg border-2 border-outline shadow-[2px_2px_0_var(--outline-black)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[3px_3px_0_var(--outline-black)]",
                        rank <= 3 && "bg-gradient-to-r from-[var(--coin-gold)]/10 to-[var(--star-yellow)]/10"
                      )}
                    >
                      {/* Rank */}
                      <div className="flex-shrink-0 w-8 text-center">
                        {rank <= 3 ? (
                          <Image src={getRankImage(rank)!} alt={`${rank}`} width={24} height={24} className="h-6 w-6" />
                        ) : (
                          <span className="font-bold text-lg text-[var(--pipe-600)]">#{rank}</span>
                        )}
                      </div>

                      {/* Token Info */}
                      <Link href={`/room/${token.mint}`} className="flex-1 min-w-0 flex items-center gap-3">
                        <Image
                          src={token.logoURI || "/placeholder-token.svg"}
                          alt={token.name || "Unknown Token"}
                          width={40}
                          height={40}
                          className="rounded-full border-[3px] border-[var(--outline-black)]"
                          onError={(e) => { e.currentTarget.src = "/placeholder-token.svg" }}
                        />
                        <div className="min-w-0">
                          <div className="font-body font-bold flex items-center gap-2">
                            <span className="truncate">{token.name || "Unknown"}</span>
                            {bigMover && <Sparkles className="h-4 w-4 text-[var(--star-yellow)]" />}
                          </div>
                          <div className="font-body text-[10px] opacity-70 tracking-wide uppercase">
                            ${token.symbol || "N/A"}
                          </div>
                        </div>
                      </Link>

                      {/* Price */}
                      <div className="text-right">
                        <UsdWithSol usd={token.priceUsd} className="font-numeric font-bold text-sm" solClassName="font-numeric text-[11px]" />
                      </div>

                      {/* 24h Change */}
                      <div className="flex items-center gap-2 justify-end">
                        <span
                          className={`font-numeric text-sm font-bold ${
                            (token.priceChange24h || 0) >= 0 ? "text-luigi" : "text-mario"
                          }`}
                        >
                          {(token.priceChange24h || 0) >= 0 ? "+" : ""}
                          {(token.priceChange24h || 0).toFixed(2)}%
                        </span>
                        {(token.priceChange24h || 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </div>

                      {/* Market Cap */}
                      <div className="text-right">
                        {token.marketCapUsd ? (
                          <UsdWithSol usd={token.marketCapUsd} className="font-numeric font-bold text-sm" solClassName="font-numeric text-[11px]" compact />
                        ) : (
                          <span className="opacity-60 text-sm">N/A</span>
                        )}
                      </div>

                      {/* Volume */}
                      <div className="text-right">
                        <UsdWithSol usd={token.volume24h} className="font-numeric font-bold text-sm" solClassName="font-numeric text-[11px]" compact />
                      </div>

                      {/* Trend Badge */}
                      <div className="flex justify-end">
                        <span
                          className={cn(
                            "px-2 py-1 font-numeric text-xs font-bold inline-flex items-center gap-1 rounded-lg border-2 border-outline shadow-[2px_2px_0_var(--outline-black)]",
                            bigMover && "animate-pulse"
                          )}
                          style={{ background: bigMover ? "var(--star-yellow)" : "var(--card)" }}
                        >
                          {bigMover && <Sparkles className="h-3 w-3" />} {Math.abs(token.priceChange24h || 0).toFixed(1)}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="flex justify-end">
                        <Link href={`/room/${token.mint}`}>
                          <Button className={cn(marioStyles.button('success', 'sm'))}>🚀 Trade</Button>
                        </Link>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Footer */}
        {!loading && !error && filteredAndSortedTokens.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center"
          >
            <p className="font-body text-sm text-muted-foreground">
              Showing <span className="font-numeric font-bold text-foreground">{filteredAndSortedTokens.length}</span> trending tokens
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </motion.div>
        )}

      </main>
    </div>
  )
}