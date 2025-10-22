"use client"

import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { Button } from "@/components/ui/button"
import { TrendingUp, ArrowRight, TrendingDown, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
// Use backend types
import type * as Backend from "@/lib/types/backend"
import { useTrendingTokens } from "@/hooks/use-react-query-hooks"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"
import { formatPriceUSD, formatNumber } from "@/lib/format"
import { MarioPageHeader } from "@/components/shared/mario-page-header"

export function TrendingTokensSection() {
  const { data: trendingTokens, isLoading: loading } = useTrendingTokens(6) // Increased to 6 for better showcase
  const { prices: livePrices } = usePriceStreamContext()

  // Get SOL price for equivalents
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0

  return (
    <section className="py-20 md:py-32 bg-gradient-to-b from-mario-red/10 via-mario-yellow/10 to-mario-green/10 border-t-4 border-b-4 border-mario-red/30">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center space-y-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Mario header */}
          <div className="mb-6 max-w-3xl mx-auto">
            <MarioPageHeader
              src="/Trending-tokens-header.png"
              alt="Trending Tokens"
              width={800}
              height={140}
            />
          </div>

          <h2 className="font-mario text-4xl md:text-5xl font-bold text-balance text-mario-red text-shadow-sm">
            Hot Tokens Right Now! 🔥
          </h2>
          <p className="text-xl text-foreground/80 max-w-2xl mx-auto leading-relaxed font-medium">
            Live market data from the hottest Solana tokens. Jump in and start trading!
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="mario-card p-6 bg-gradient-to-br from-white/90 to-white/70 border-3 border-mario-yellow/40 h-full">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-1">
                          <div className="h-3 w-12 bg-muted animate-pulse rounded" />
                          <div className="h-5 w-16 bg-muted animate-pulse rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            trendingTokens?.map((token, index) => (
              <motion.div
                key={token.mint}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/trade?token=${token.mint}`}>
                  <div className="mario-card p-6 bg-gradient-to-br from-white/95 to-white/85 border-3 border-mario-yellow/50 hover:border-mario-yellow transition-all duration-300 group cursor-pointer h-full hover:shadow-xl hover:-translate-y-1">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                          <Image 
                            src={token.logoURI || "/placeholder-token.svg"} 
                            alt={token.name || 'Unknown Token'} 
                            fill 
                            sizes="48px"
                            className="object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder-token.svg"
                            }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-heading text-lg font-bold">{token.symbol || 'N/A'}</h3>
                            {(() => {
                              const change = token.priceChange24h || 0;
                              // Add threshold to prevent flickering on near-zero values
                              if (change > 0.01) {
                                return <TrendingUp className="h-4 w-4 text-[#00ff85]" />;
                              } else if (change < -0.01) {
                                return <TrendingDown className="h-4 w-4 text-[#ff4d4d]" />;
                              }
                              // For values between -0.01 and 0.01, show neutral (no icon or dash)
                              return null;
                            })()}
                          </div>
                          <p className="text-sm text-muted-foreground">{token.name || 'Unknown Token'}</p>
                        </div>
                      </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="text-lg font-bold font-mono">
                          {formatPriceUSD(token.priceUsd)}
                        </p>
                        {solPrice > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {formatSolEquivalent(token.priceUsd, solPrice)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">24h Change</p>
                        <p
                          className={`text-lg font-bold font-mono ${(() => {
                            const change = token.priceChange24h || 0;
                            if (change > 0.01) return "text-[#00ff85]";
                            if (change < -0.01) return "text-[#ff4d4d]";
                            return "text-muted-foreground";
                          })()}`}
                        >
                          {(() => {
                            const change = token.priceChange24h || 0;
                            if (change > 0.01) return "+";
                            if (change < -0.01) return "";
                            return "";
                          })()}
                          {(token.priceChange24h || 0).toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="text-sm font-medium font-mono">
                          ${token.volume24h > 1000000 
                            ? `${(token.volume24h / 1000000).toFixed(1)}M` 
                            : `${(token.volume24h / 1000).toFixed(0)}K`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Market Cap</p>
                        <p className="text-sm font-medium font-mono">
                          ${(token.marketCapUsd || 0) > 1000000 
                            ? `${((token.marketCapUsd || 0) / 1000000).toFixed(1)}M` 
                            : `${((token.marketCapUsd || 0) / 1000).toFixed(0)}K`}
                        </p>
                      </div>
                    </div>

                    <button className="mario-btn mario-btn-green w-full text-white">
                      <span className="flex items-center justify-center gap-2">
                        Trade Now! 🎮
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </button>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
        </div>

        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Link href="/trade">
            <button className="mario-btn mario-btn-lg bg-mario-yellow hover:bg-mario-yellow/90 text-black group">
              <span className="flex items-center justify-center gap-2">
                View All Tokens 🔍
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
