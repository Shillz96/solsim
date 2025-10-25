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
    <Link href={`/room/${token.mint}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
      >
        <div className="h-full cursor-pointer bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-1 transition-all duration-300">
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
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)]">
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
            <Button className="w-full mt-4 bg-[var(--luigi-green)] hover:bg-[var(--luigi-green)]/90 text-white border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario" size="sm">
              Trade Now
            </Button>
          </div>
        </div>
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
        {/* Mario-themed Header with Image */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[8px_8px_0_var(--outline-black)] p-6 relative overflow-hidden">
            {/* Decorative Mario icons */}
            <div className="absolute top-2 right-2 flex gap-2">
              <Image src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
              <Image src="/icons/mario/trophy.png" alt="Trophy" width={24} height={24} />
            </div>

            <div className="flex flex-col items-center gap-4">
              {/* Header Image */}
              <div className="relative w-full max-w-2xl">
                <Image
                  src="/Tokenized-Stocks-10-22-2025.png"
                  alt="Tokenized Stocks"
                  width={800}
                  height={200}
                  className="w-full h-auto"
                  priority
                />
              </div>

              {/* Description */}
              <p className="text-muted-foreground text-lg text-center font-bold">
                Trade real-world stocks on Solana blockchain - Tesla, Nvidia, Apple & more
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6"
        >
          <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] py-4">
            <div className="px-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  placeholder="Search stocks by name or symbol..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-12 text-lg border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] rounded-lg"
                />
              </div>

              {/* Category filters */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === 'all' ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className={cn(
                    "border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario",
                    selectedCategory === 'all' ? "bg-[var(--mario-red)] text-white" : ""
                  )}
                >
                  All Stocks
                </Button>
                {Object.entries(STOCK_CATEGORIES).map(([key, category]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(key as Category)}
                    className={cn(
                      "border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario",
                      selectedCategory === key ? "bg-[var(--luigi-green)] text-white" : ""
                    )}
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="h-20 w-20 border-4 border-[var(--luigi-green)]/30 border-t-[var(--luigi-green)] rounded-full animate-spin"></div>
                <div className="absolute inset-0 h-20 w-20 flex items-center justify-center">
                  <Image src="/icons/mario/star.png" alt="Loading" width={32} height={32} className="animate-pulse" />
                </div>
              </div>
              <span className="font-mario text-lg font-bold text-[var(--outline-black)]">Loading tokenized stocks...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-[var(--mario-red)]/10 border-4 border-[var(--mario-red)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
            <div className="flex items-start gap-3">
              <div className="bg-[var(--mario-red)] p-2 rounded-lg border-3 border-[var(--outline-black)]">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-mario font-bold text-[var(--outline-black)] mb-2">Failed to load stocks</h3>
                <p className="text-sm text-muted-foreground font-bold mb-3">
                  {error?.message || 'Unknown error'}
                </p>
                <Button
                  onClick={() => refresh()}
                  className="bg-[var(--luigi-green)] hover:bg-[var(--luigi-green)]/90 text-white border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario"
                  size="sm"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredStocks.length === 0 && (
          <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-12">
            <div className="text-center">
              <div className="bg-[var(--star-yellow)] p-4 rounded-lg border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Building2 className="h-10 w-10 text-[var(--outline-black)]" />
              </div>
              <h3 className="text-xl font-mario font-bold text-[var(--outline-black)] mb-2">No stocks found</h3>
              <p className="text-muted-foreground font-bold">
                {searchQuery ? "Try adjusting your search" : "No tokenized stocks available"}
              </p>
            </div>
          </div>
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
                        <div className="bg-[var(--star-yellow)] p-2 rounded-lg border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)]">
                          <span className="text-2xl">{categoryInfo?.icon || '📈'}</span>
                        </div>
                        <h2 className="text-2xl font-mario font-bold text-[var(--outline-black)]">{categoryInfo?.name || 'Other'}</h2>
                        <Badge className="ml-2 bg-[var(--luigi-green)] text-white border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] font-bold">
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
