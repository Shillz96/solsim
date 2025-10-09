"use client"

import React, { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, TrendingUp, Filter, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
// Use backend types
import type * as Backend from "@/lib/types/backend"
import { useTrendingTokens } from "@/hooks/use-react-query-hooks"

type TimeRange = "5m" | "1h" | "6h" | "24h"
// Use the backend TrendingTokenResponse type

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
  const [timeRange, setTimeRange] = useState<TimeRange>("24h")
  const [searchQuery, setSearchQuery] = useState("")
  // Category filtering not implemented in backend yet
  // const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined)
  
  // Use the API hook to fetch trending tokens
  const { data: trendingTokens, isLoading: loading, error, refetch: refresh } = useTrendingTokens(50)

  const filteredTokens = trendingTokens?.filter(
    (token) =>
      token.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      token.symbol?.toLowerCase().includes(searchQuery.toLowerCase()),
  ) || []

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full px-2 py-6 max-w-[2000px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold gradient-text">Trending Tokens</h1>
          </div>
          <p className="text-muted-foreground">Discover the hottest tokens on Solana with real-time market data</p>
        </div>

        {/* Filters & Search */}
        <Card className="p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Time Range Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <div className="flex gap-1">
                {(["5m", "1h", "6h", "24h"] as TimeRange[]).map((range) => (
                  <Button
                    key={range}
                    variant={timeRange === range ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setTimeRange(range)}
                    className={timeRange === range ? "glow" : ""}
                  >
                    {range}
                  </Button>
                ))}
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
        </Card>

        {/* Trending Tokens Table */}
        <Card className="overflow-hidden">
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

          {!loading && !error && filteredTokens.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              No trending tokens found
            </div>
          )}

          {!loading && !error && filteredTokens.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">#</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Token</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Price</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">24h Change</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Market Cap</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Volume</th>
                    <th className="text-left p-4 text-sm font-semibold text-muted-foreground">Trend Score</th>
                    <th className="text-right p-4 text-sm font-semibold text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((token, index) => (
                    <tr key={token.address} className="border-b border-border hover:bg-muted/20 transition-colors">
                      {/* Rank */}
                      <td className="p-4">
                        <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                      </td>

                      {/* Token Info */}
                      <td className="p-4">
                        <Link
                          href={`/trade?token=${token.address}`}
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                          <Image
                            src={token.imageUrl || "/placeholder-token.svg"}
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
                        <div className="text-sm font-medium">
                          ${(parseFloat(token.lastPrice || '0')) < 0.001 ? parseFloat(token.lastPrice || '0').toExponential(2) : parseFloat(token.lastPrice || '0').toFixed(4)}
                        </div>
                      </td>

                      {/* 24h Change */}
                      <td className="p-4">
                        <div
                          className={`text-sm font-medium ${
                            (parseFloat(token.priceChange24h || '0')) >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {parseFloat(token.priceChange24h || '0') >= 0 ? "+" : ""}
                          {parseFloat(token.priceChange24h || '0').toFixed(2)}%
                        </div>
                      </td>

                      {/* Market Cap */}
                      <td className="p-4">
                        <div className="text-sm font-medium">
                          ${parseFloat(token.marketCapUsd || '0') > 1000000 
                            ? `${(parseFloat(token.marketCapUsd || '0') / 1000000).toFixed(1)}M` 
                            : `${(parseFloat(token.marketCapUsd || '0') / 1000).toFixed(0)}K`}
                        </div>
                      </td>

                      {/* Volume */}
                      <td className="p-4">
                        <div className="text-sm">
                          ${parseFloat(token.volume24h || '0') > 1000000 
                            ? `${(parseFloat(token.volume24h || '0') / 1000000).toFixed(1)}M` 
                            : `${(parseFloat(token.volume24h || '0') / 1000).toFixed(0)}K`}
                        </div>
                      </td>

                      {/* Trend Score */}
                      <td className="p-4">
                        <Badge variant="secondary" className="text-xs">
                          {parseFloat(token.momentumScore || '0').toFixed(1)}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right">
                        <Link href={`/trade?token=${token.address}`}>
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
        </Card>
      </main>
    </div>
  )
}
