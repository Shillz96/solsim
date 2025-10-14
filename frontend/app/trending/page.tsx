"use client"

import React, { useState, useMemo } from "react"
import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, TrendingUp, Filter, Loader2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
// Use backend types
import type * as Backend from "@/lib/types/backend"
import { useTrendingTokens } from "@/hooks/use-react-query-hooks"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { formatUSD, formatNumber, safePercent } from "@/lib/format"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"

type BirdeyeSortBy = "rank" | "volume24hUSD" | "liquidity"
type SortField = "price" | "priceChange24h" | "marketCapUsd" | "volume24h" | "trendScore"
type SortDirection = "asc" | "desc"
// Use the backend TrendingToken type

function MiniSparkline({ data, isPositive }: { data?: number[]; isPositive: boolean }) {
  if (!data || data.length === 0) {
    return <div className="w-20 h-8 bg-muted/50 rounded" />
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 80
  const height = 30

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${x},${y}`
    })
    .join(" ")

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={isPositive ? "rgb(20, 241, 149)" : "rgb(239, 68, 68)"}
        strokeWidth="1.5"
      />
    </svg>
  )
}

export default function TrendingPage() {
  const [birdeyeSortBy, setBirdeyeSortBy] = useState<BirdeyeSortBy>("rank")
  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("volume24h")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  // Use the API hook to fetch trending tokens with Birdeye sort
  const { data: trendingTokens, isLoading: loading, error, refetch: refresh } = useTrendingTokens(50, birdeyeSortBy)

  // Get SOL price for USD equivalents
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    if (!trendingTokens) return []

    // First filter by search query
    let filtered = trendingTokens.filter(
      (token) =>
        token.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol?.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    // Then sort
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-page-xl mx-auto">
        {/* Header */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold gradient-text">Trending Tokens</h1>
          </div>
          <p className="text-muted-foreground">Discover the hottest tokens on Solana with real-time market data</p>
        </motion.div>

        {/* Filters & Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-4"
        >
          <EnhancedCard className="!py-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between px-6">
            {/* Birdeye Sort Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">Sort by:</span>
                <div className="flex gap-1">
                  {[
                    { value: "rank" as BirdeyeSortBy, label: "Rank" },
                    { value: "volume24hUSD" as BirdeyeSortBy, label: "Volume" },
                    { value: "liquidity" as BirdeyeSortBy, label: "Liquidity" }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={birdeyeSortBy === option.value ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setBirdeyeSortBy(option.value)}
                      className={birdeyeSortBy === option.value ? "glow" : ""}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </EnhancedCard>
        </motion.div>

        {/* Trending Tokens Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <EnhancedCard className="overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading trending tokens...</span>
            </div>
          )}

          {error && (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load trending tokens: {error?.message || 'Unknown error'}
                  <Button variant="outline" size="sm" className="ml-2" onClick={() => refresh()}>
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!loading && !error && filteredAndSortedTokens.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              No trending tokens found
            </div>
          )}

          {!loading && !error && filteredAndSortedTokens.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">#</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Token</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                      <button
                        onClick={() => handleSort("price")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Price
                        <SortIcon field="price" />
                      </button>
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                      <button
                        onClick={() => handleSort("priceChange24h")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        24h Change
                        <SortIcon field="priceChange24h" />
                      </button>
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                      <button
                        onClick={() => handleSort("marketCapUsd")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Market Cap
                        <SortIcon field="marketCapUsd" />
                      </button>
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                      <button
                        onClick={() => handleSort("volume24h")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Volume
                        <SortIcon field="volume24h" />
                      </button>
                    </th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">
                      <button
                        onClick={() => handleSort("trendScore")}
                        className="flex items-center hover:text-foreground transition-colors"
                      >
                        Trend Score
                        <SortIcon field="trendScore" />
                      </button>
                    </th>
                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedTokens.map((token, index) => (
                    <tr key={token.mint} className="border-b border-border hover:bg-muted/20 transition-colors">
                      {/* Rank */}
                      <td className="p-4">
                        <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                      </td>

                      {/* Token Info */}
                      <td className="p-4">
                        <Link
                          href={`/trade?token=${token.mint}`}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                          <Image
                            src={token.logoURI || "/placeholder-token.svg"}
                            alt={token.name || 'Unknown Token'}
                            width={32}
                            height={32}
                            className="rounded-full"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder-token.svg"
                            }}
                          />
                          <div>
                            <div className="font-semibold text-sm">{token.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{token.symbol || 'N/A'}</div>
                          </div>
                        </Link>
                      </td>

                      {/* Price */}
                      <td className="p-4">
                        <UsdWithSol 
                          usd={token.priceUsd} 
                          className="text-sm font-medium"
                          solClassName="text-xs"
                        />
                      </td>

                      {/* 24h Change */}
                      <td className="p-4">
                        <div
                          className={`text-sm font-medium font-mono ${
                            token.priceChange24h >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {token.priceChange24h >= 0 ? "+" : ""}
                          {token.priceChange24h.toFixed(2)}%
                        </div>
                      </td>

                      {/* Market Cap */}
                      <td className="p-4">
                        {token.marketCapUsd ? (
                          <UsdWithSol 
                            usd={token.marketCapUsd} 
                            className="text-sm font-medium"
                            solClassName="text-xs"
                            compact
                          />
                        ) : (
                          <div className="text-sm font-medium text-muted-foreground">N/A</div>
                        )}
                      </td>

                      {/* Volume */}
                      <td className="p-4">
                        <UsdWithSol 
                          usd={token.volume24h} 
                          className="text-sm"
                          solClassName="text-xs"
                          compact
                        />
                      </td>

                      {/* Trend Score */}
                      <td className="p-4">
                        <Badge variant="secondary" className="text-xs">
                          {/* Use absolute value of 24h change as trend score */}
                          {Math.abs(token.priceChange24h).toFixed(1)}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right">
                        <Link href={`/trade?token=${token.mint}`}>
                          <Button size="sm" variant="outline">
                            Trade
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
