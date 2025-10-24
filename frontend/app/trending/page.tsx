"use client"

import React, { useState, useMemo } from "react"
import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, TrendingUp, Filter, Loader2, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Flame, TrendingDown } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
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
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

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

  // Helper function to get rank image for top 3
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

  // Helper function to determine if token is a big mover
  const isBigMover = (priceChange: number) => Math.abs(priceChange) > 50

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main id="trending-section" className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-page-xl mx-auto">
        {/* Filters & Search with Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-4"
        >
          <div className="mario-card bg-white border-4 border-pipe-700 shadow-mario p-6">
          {/* Header Image inside filter bar */}
          <div className="mb-6 flex justify-center">
            <Image
              src="/Trending-tokens-header.png"
              alt="Trending Tokens"
              width={600}
              height={100}
              className="object-contain"
              priority
            />
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Birdeye Sort Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-pipe-700" />
                <span className="text-sm font-bold text-pipe-900 mr-2">Sort by:</span>
                <div className="flex gap-2">
                  {[
                    { value: "rank" as BirdeyeSortBy, label: "Rank" },
                    { value: "volume24hUSD" as BirdeyeSortBy, label: "Volume" },
                    { value: "liquidity" as BirdeyeSortBy, label: "Liquidity" }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={birdeyeSortBy === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBirdeyeSortBy(option.value)}
                      className={birdeyeSortBy === option.value ? "mario-btn mario-btn-red" : "border-3 border-pipe-500"}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pipe-700" />
              <Input
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 border-3 border-pipe-500 focus:border-mario-red"
              />
            </div>
          </div>
        </div>
        </motion.div>

        {/* Trending Tokens Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="mario-card bg-white border-4 border-pipe-700 shadow-mario overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-64 bg-sky-50">
              <Loader2 className="h-8 w-8 animate-spin text-mario-red" />
              <span className="ml-3 font-bold text-pipe-900">Loading trending tokens...</span>
            </div>
          )}

          {error && (
            <div className="p-6">
              <Alert variant="destructive" className="border-3 border-mario-red bg-red-50">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="font-bold">
                  Failed to load trending tokens: {error?.message || 'Unknown error'}
                  <Button size="sm" className="ml-3 mario-btn mario-btn-red" onClick={() => refresh()}>
                    Try Again
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!loading && !error && filteredAndSortedTokens.length === 0 && (
            <div className="p-8 text-center bg-sky-50">
              <p className="text-lg font-bold text-pipe-900">No trending tokens found</p>
              <p className="text-sm text-pipe-700 mt-2">Try adjusting your search or filters</p>
            </div>
          )}

          {!loading && !error && filteredAndSortedTokens.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-3 border-pipe-700 bg-sky-100">
                  <tr>
                    <th className="text-left p-4 text-sm font-bold text-pipe-900">#</th>
                    <th className="text-left p-4 text-sm font-bold text-pipe-900">Token</th>
                    <th className="text-left p-4 text-sm font-bold text-pipe-900">
                      <button
                        onClick={() => handleSort("price")}
                        className="flex items-center hover:text-mario-red transition-colors"
                      >
                        Price
                        <SortIcon field="price" />
                      </button>
                    </th>
                    <th className="text-left p-4 text-sm font-bold text-pipe-900">
                      <button
                        onClick={() => handleSort("priceChange24h")}
                        className="flex items-center hover:text-mario-red transition-colors"
                      >
                        24h Change
                        <SortIcon field="priceChange24h" />
                      </button>
                    </th>
                    <th className="text-left p-4 text-sm font-bold text-pipe-900">
                      <button
                        onClick={() => handleSort("marketCapUsd")}
                        className="flex items-center hover:text-mario-red transition-colors"
                      >
                        Market Cap
                        <SortIcon field="marketCapUsd" />
                      </button>
                    </th>
                    <th className="text-left p-4 text-sm font-bold text-pipe-900">
                      <button
                        onClick={() => handleSort("volume24h")}
                        className="flex items-center hover:text-mario-red transition-colors"
                      >
                        Volume
                        <SortIcon field="volume24h" />
                      </button>
                    </th>
                    <th className="text-left p-4 text-sm font-bold text-pipe-900">
                      <button
                        onClick={() => handleSort("trendScore")}
                        className="flex items-center hover:text-mario-red transition-colors"
                      >
                        Trend Score
                        <SortIcon field="trendScore" />
                      </button>
                    </th>
                    <th className="text-right p-4 text-sm font-bold text-pipe-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedTokens.map((token, index) => {
                    const rankImage = getRankImage(index + 1)
                    const bigMover = isBigMover(token.priceChange24h)
                    const isHovered = hoveredRow === token.mint

                    return (
                      <tr
                        key={token.mint}
                        className="border-b-2 border-pipe-300 transition-all duration-200 relative group hover:bg-sky-50"
                        onMouseEnter={() => setHoveredRow(token.mint)}
                        onMouseLeave={() => setHoveredRow(null)}
                      >

                        {/* Rank */}
                        <td className="p-5">
                          {rankImage ? (
                            <Image
                              src={rankImage}
                              alt={`${index + 1} place`}
                              width={48}
                              height={48}
                              className="object-contain"
                            />
                          ) : (
                            <span className="text-sm font-bold text-pipe-900">{index + 1}</span>
                          )}
                        </td>

                        {/* Token Info */}
                        <td className="p-5">
                          <Link
                            href={`/room/${token.mint}`}
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                          >
                            <div>
                              <Image
                                src={token.logoURI || "/placeholder-token.svg"}
                                alt={token.name || 'Unknown Token'}
                                width={40}
                                height={40}
                                className="rounded-full border-2 border-pipe-700"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder-token.svg"
                                }}
                              />
                            </div>
                            <div>
                              <div className="font-bold text-sm flex items-center gap-2">
                                {token.name || 'Unknown'}
                                {bigMover && (
                                  <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                  >
                                    <Flame className="h-4 w-4 text-orange-500" />
                                  </motion.div>
                                )}
                              </div>
                              <div className="text-xs text-pipe-700">{token.symbol || 'N/A'}</div>
                            </div>
                          </Link>
                        </td>

                        {/* Price */}
                        <td className="p-5">
                          <UsdWithSol
                            usd={token.priceUsd}
                            className="text-sm font-bold"
                            solClassName="text-xs"
                          />
                        </td>

                        {/* 24h Change with visual indicator */}
                        <td className="p-5">
                          <div className="flex items-center gap-2">
                            <motion.div
                              className={`text-sm font-bold font-mono ${
                                token.priceChange24h >= 0 ? "text-[#00ff85]" : "text-[#ff4d4d]"
                              }`}
                              animate={bigMover ? {
                                opacity: [1, 0.6, 1],
                              } : {}}
                              transition={bigMover ? {
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                              } : {}}
                            >
                              {token.priceChange24h >= 0 ? "+" : ""}
                              {token.priceChange24h.toFixed(2)}%
                            </motion.div>
                            {bigMover && (
                              token.priceChange24h >= 0 ? (
                                <TrendingUp className="h-4 w-4 text-[#00ff85]" />
                              ) : (
                                <TrendingDown className="h-4 w-4 text-[#ff4d4d]" />
                              )
                            )}
                          </div>
                        </td>

                        {/* Market Cap */}
                        <td className="p-5">
                          {token.marketCapUsd ? (
                            <UsdWithSol
                              usd={token.marketCapUsd}
                              className="text-sm font-bold"
                              solClassName="text-xs"
                              compact
                            />
                          ) : (
                            <div className="text-sm font-bold text-pipe-700">N/A</div>
                          )}
                        </td>

                        {/* Volume */}
                        <td className="p-5">
                          <UsdWithSol
                            usd={token.volume24h}
                            className="text-sm font-bold"
                            solClassName="text-xs"
                            compact
                          />
                        </td>

                        {/* Trend Score */}
                        <td className="p-5">
                          <Badge
                            variant="secondary"
                            className={`text-xs font-bold border-2 ${bigMover ? 'bg-orange-500 text-white border-black' : 'bg-pipe-200 text-pipe-900 border-pipe-700'}`}
                          >
                            {Math.abs(token.priceChange24h).toFixed(1)}
                          </Badge>
                        </td>

                        {/* Action */}
                        <td className="p-5 text-right">
                          <Link href={`/room/${token.mint}`}>
                            <Button
                              size="sm"
                              className="mario-btn mario-btn-green text-white"
                            >
                              Trade
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </motion.div>

      </main>
    </div>
  )
}
