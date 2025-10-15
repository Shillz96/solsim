"use client"

import React, { useState, useMemo } from "react"
import { EnhancedCard } from "@/components/ui/enhanced-card-system"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, TrendingUp, Loader2, AlertCircle, Building2, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import type * as Backend from "@/lib/types/backend"
import { useStocks } from "@/hooks/use-react-query-hooks"
import { UsdWithSol } from "@/lib/sol-equivalent"
import { cn } from "@/lib/utils"

// Categorize stocks by sector
const STOCK_CATEGORIES = {
  tech: { name: "Technology", icon: "💻", stocks: ['TSLA', 'NVDA', 'AAPL', 'META', 'MSFT', 'AMD', 'TSM', 'INTC', 'GOOG'] },
  finance: { name: "Finance & Crypto", icon: "💰", stocks: ['COIN', 'CRCL', 'MSTR'] },
  ecommerce: { name: "E-Commerce & Retail", icon: "🛒", stocks: ['AMZN', 'NKE'] },
  entertainment: { name: "Entertainment", icon: "🎬", stocks: ['DIS'] },
  aerospace: { name: "Aerospace", icon: "✈️", stocks: ['BA'] },
  etfs: { name: "ETFs", icon: "📊", stocks: ['SPY', 'QQQ', 'VOO'] },
}

type Category = keyof typeof STOCK_CATEGORIES

function StockCard({ token }: { token: Backend.TrendingToken }) {
  const isPositive = (token.priceChange24h || 0) >= 0
  const [imageError, setImageError] = React.useState(false)

  return (
    <Link href={`/trade?token=${token.mint}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <EnhancedCard className="h-full cursor-pointer hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
          <div className="p-6">
            {/* Header with logo and symbol */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 flex-shrink-0">
                  {token.logoURI && !imageError ? (
                    <Image
                      src={token.logoURI}
                      alt={token.name || 'Stock'}
                      fill
                      className="rounded-full object-cover"
                      onError={() => setImageError(true)}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <span className="text-white text-base font-bold tracking-tight">
                        {token.symbol?.replace('x', '').replace('X', '').slice(0, 4) || '??'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{token.symbol}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{token.name}</p>
                </div>
              </div>

              {isPositive ? (
                <ArrowUpRight className="h-5 w-5 text-green-400" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-red-400" />
              )}
            </div>

            {/* Price */}
            <div className="mb-4">
              <UsdWithSol
                usd={token.priceUsd}
                className="text-2xl font-bold"
                solClassName="text-sm"
              />
            </div>

            {/* 24h Change */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">24h Change</span>
              <div
                className={cn(
                  "text-sm font-bold px-3 py-1 rounded-full",
                  isPositive
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                )}
              >
                {isPositive ? "+" : ""}{token.priceChange24h?.toFixed(2)}%
              </div>
            </div>

            {/* Volume & Market Cap */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Volume 24h</p>
                <p className="text-sm font-semibold">
                  {token.volume24h ? `$${(token.volume24h / 1000000).toFixed(2)}M` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Market Cap</p>
                <p className="text-sm font-semibold">
                  {token.marketCapUsd ? `$${(token.marketCapUsd / 1000000).toFixed(2)}M` : 'N/A'}
                </p>
              </div>
            </div>

            {/* Trade button */}
            <Button className="w-full mt-4" size="sm">
              Trade Now
            </Button>
          </div>
        </EnhancedCard>
      </motion.div>
    </Link>
  )
}

export default function StocksPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all')

  const { data: stocks, isLoading: loading, error, refetch: refresh } = useStocks(50)

  // Categorize stocks
  const categorizedStocks = useMemo(() => {
    if (!stocks) return {}

    const categories: Record<string, Backend.TrendingToken[]> = {}

    stocks.forEach(stock => {
      const symbol = stock.symbol?.toUpperCase().replace('X', '') || ''

      // Find which category this stock belongs to
      let foundCategory = false
      for (const [categoryKey, categoryData] of Object.entries(STOCK_CATEGORIES)) {
        if (categoryData.stocks.some(s => symbol.includes(s) || s.includes(symbol))) {
          if (!categories[categoryKey]) {
            categories[categoryKey] = []
          }
          categories[categoryKey].push(stock)
          foundCategory = true
          break
        }
      }

      // If no category found, add to "other"
      if (!foundCategory) {
        if (!categories['other']) {
          categories['other'] = []
        }
        categories['other'].push(stock)
      }
    })

    return categories
  }, [stocks])

  // Filter stocks by search query
  const filteredStocks = useMemo(() => {
    if (!stocks) return []

    let filtered = stocks.filter(
      (stock) =>
        stock.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stock.symbol?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Filter by category if selected
    if (selectedCategory !== 'all') {
      const categoryStocks = categorizedStocks[selectedCategory] || []
      const categoryMints = new Set(categoryStocks.map(s => s.mint))
      filtered = filtered.filter(s => categoryMints.has(s.mint))
    }

    return filtered
  }, [stocks, searchQuery, selectedCategory, categorizedStocks])

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
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold gradient-text">Tokenized Stocks</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Trade real-world stocks on Solana blockchain - Tesla, Nvidia, Apple & more
          </p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <EnhancedCard className="!py-4">
            <div className="px-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search stocks by name or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-12 text-lg"
                />
              </div>

              {/* Category filters */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className={selectedCategory === 'all' ? "glow" : ""}
                >
                  All Stocks
                </Button>
                {Object.entries(STOCK_CATEGORIES).map(([key, category]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(key as Category)}
                    className={selectedCategory === key ? "glow" : ""}
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          </EnhancedCard>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading tokenized stocks...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load stocks: {error?.message || 'Unknown error'}
              <Button variant="outline" size="sm" className="ml-2" onClick={() => refresh()}>
                Try Again
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Empty State */}
        {!loading && !error && filteredStocks.length === 0 && (
          <EnhancedCard>
            <div className="p-12 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No stocks found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try adjusting your search" : "No tokenized stocks available"}
              </p>
            </div>
          </EnhancedCard>
        )}

        {/* Stocks Grid - Show by category if no search/filter, otherwise show all */}
        {!loading && !error && filteredStocks.length > 0 && (
          <>
            {searchQuery || selectedCategory !== 'all' ? (
              // Filtered view - show as single grid
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredStocks.map((stock, index) => (
                    <motion.div
                      key={stock.mint}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <StockCard token={stock} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : (
              // Category view - show grouped by sector
              <div className="space-y-8">
                {Object.entries(categorizedStocks).map(([categoryKey, categoryStocks]) => {
                  if (categoryStocks.length === 0) return null

                  const categoryInfo = STOCK_CATEGORIES[categoryKey as Category]

                  return (
                    <motion.div
                      key={categoryKey}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <span className="text-3xl">{categoryInfo?.icon || '📈'}</span>
                        <h2 className="text-2xl font-bold">{categoryInfo?.name || 'Other'}</h2>
                        <Badge variant="secondary" className="ml-2">
                          {categoryStocks.length} {categoryStocks.length === 1 ? 'stock' : 'stocks'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categoryStocks.map((stock) => (
                          <StockCard key={stock.mint} token={stock} />
                        ))}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none -z-20 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute top-3/4 left-3/4 w-64 h-64 bg-purple-500/5 rounded-full blur-2xl"></div>
        </div>
      </main>
    </div>
  )
}
