"use client"

import React, { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, TrendingUp, Filter, Loader2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, TrendingDown, Sparkles } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import type * as Backend from "@/lib/types/backend"
import { useTrendingTokens } from "@/hooks/use-react-query-hooks"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { UsdWithSol } from "@/lib/sol-equivalent"

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
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        
        {/* Hero Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="mb-6 flex justify-center">
            <Image 
              src="/Trending-tokens-header.png" 
              alt="Trending Tokens" 
              width={600} 
              height={150}
              className="max-w-full h-auto"
              priority
            />
          </div>
          <p className="font-body text-lg text-foreground/80 max-w-2xl mx-auto">
            Discover the hottest memecoins on Solana. Real-time data, live rankings, and instant trading.
          </p>
        </motion.div>

        {/* Filters & Search Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="panel panel-trading hover-outline" style={{ '--panel-padding': '1.5rem' } as React.CSSProperties}>
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
                      className={`
                        font-body font-semibold transition-all
                        ${birdeyeSortBy === option.value 
                          ? "mario-btn mario-btn-red hover-outline" 
                          : "border-3 border-outline-black hover-outline bg-card hover:bg-muted"
                        }
                      `}
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

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="panel panel-portfolio hover-outline overflow-hidden">
            
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center h-96 bg-card/50">
                <div className="coin-bounce-loop mb-4">
                  <div className="text-6xl">🪙</div>
                </div>
                <Loader2 className="h-8 w-8 animate-spin text-mario mb-3" />
                <span className="font-body font-semibold text-foreground text-lg">
                  Loading trending tokens...
                </span>
              </div>
            )}

            {/* Error State */}
            {error && (
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
            )}

            {/* Empty State */}
            {!loading && !error && filteredAndSortedTokens.length === 0 && (
              <div className="p-12 text-center bg-card">
                <div className="text-6xl mb-4">🔍</div>
                <p className="font-display text-2xl text-foreground mb-2">No tokens found</p>
                <p className="font-body text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </div>
            )}

            {/* Tokens List – Mario style */}
            {!loading && !error && filteredAndSortedTokens.length > 0 && (
              <ul className="space-y-3">
                {filteredAndSortedTokens.map((token, index) => {
    const bigMover = Math.abs(token.priceChange24h) > 50

    return (
      <li
        key={token.mint}
        className="
          mario-card-sm hover-outline motion-hoverable
          grid grid-cols-[44px,1fr,auto,auto,auto,auto,auto,auto]
          items-center gap-3 p-2
        "
      >
        {/* Rank */}
        <div className="flex items-center justify-center">
          {index < 3 ? (
            <Image src={getRankImage(index + 1)!} alt={`${index + 1}`} width={36} height={36} />
          ) : (
            <span className="font-numeric font-bold">{index + 1}</span>
          )}
        </div>

        {/* Token */}
        <Link href={`/room/${token.mint}`} className="flex items-center gap-3">
          <Image
            src={token.logoURI || "/placeholder-token.svg"}
            alt={token.name || "Unknown Token"}
            width={40}
            height={40}
            className="rounded-full border-[3px] border-[var(--outline-black)]"
            onError={(e) => { e.currentTarget.src = "/placeholder-token.svg" }}
          />
          <div>
            <div className="font-body font-bold flex items-center gap-2">
              {token.name || "Unknown"}
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

        {/* 24h */}
        <div className="flex items-center gap-2 justify-end">
          <span
            className={`font-numeric text-sm font-bold ${
              (token.priceChange24h || 0) >= 0 ? "text-[var(--luigi-green)]" : "text-[var(--mario-red)]"
            }`}
          >
            {(token.priceChange24h || 0) >= 0 ? "+" : ""}
            {(token.priceChange24h || 0).toFixed(2)}%
          </span>
          {(token.priceChange24h || 0) >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
        </div>

        {/* Mkt Cap */}
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

        {/* Trend badge */}
        <div className="flex justify-end">
          <span
            className={`
              mario-card-sm px-2 py-1 font-numeric text-xs font-bold inline-flex items-center gap-1
              ${bigMover ? "animate-pulse" : ""}
            `}
            style={{ background: bigMover ? "var(--star-yellow)" : "var(--card)" }}
          >
            {bigMover && <Sparkles className="h-3 w-3" />} {Math.abs(token.priceChange24h || 0).toFixed(1)}
          </span>
        </div>

        {/* Action */}
        <div className="flex justify-end">
          <Link href={`/room/${token.mint}`}>
            <Button className="mario-btn mario-btn-green" size="sm">🚀 Trade</Button>
          </Link>
        </div>
      </li>
    )
  })}
              </ul>
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