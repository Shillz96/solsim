"use client"

import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
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
    <section className="py-20 md:py-32 bg-gradient-to-b from-[var(--background)]/10 via-[var(--background)]/10 to-white/10 border-t-4 border-b-4 border-[var(--outline-black)]/20">
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

          <h2 className="font-mario text-4xl md:text-5xl font-bold text-balance text-mario-red flex items-center justify-center gap-3" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
            Hot Tokens Right Now!
            <Image
              src="/icons/mario/fire.png"
              alt=""
              width={40}
              height={40}
              className="object-contain inline-block"
            />
          </h2>
          <p className="text-xl text-foreground max-w-2xl mx-auto leading-relaxed font-bold" style={{ textShadow: '1px 1px 2px rgba(255,255,255,0.8)' }}>
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
                <div className="bg-[var(--card)] rounded-[24px] border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] p-6 h-full">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted animate-pulse border-2 border-[var(--outline-black)]" />
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
                  <div className="bg-[var(--card)] rounded-[24px] border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] p-6 hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted border-2 border-[var(--outline-black)]">
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
                            <h3 className="font-mario text-lg font-bold">{token.symbol || 'N/A'}</h3>
                            {(() => {
                              const change = token.priceChange24h || 0;
                              // Add threshold to prevent flickering on near-zero values
                              if (change > 0.01) {
                                return (
                                  <Image
                                    src="/icons/mario/arrow-up.png"
                                    alt="Trending up"
                                    width={16}
                                    height={16}
                                    className="object-contain"
                                  />
                                );
                              } else if (change < -0.01) {
                                return (
                                  <Image
                                    src="/icons/mario/arrow-down.png"
                                    alt="Trending down"
                                    width={16}
                                    height={16}
                                    className="object-contain"
                                  />
                                );
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
                        <p className="text-xs text-muted-foreground font-bold">Price</p>
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
                        <p className="text-xs text-muted-foreground font-bold">24h Change</p>
                        <p
                          className={`text-lg font-bold font-mono ${(() => {
                            const change = token.priceChange24h || 0;
                            if (change > 0.01) return "text-[var(--luigi-green)]";
                            if (change < -0.01) return "text-[var(--mario-red)]";
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
                        <p className="text-xs text-muted-foreground font-bold">Volume</p>
                        <p className="text-sm font-medium font-mono">
                          ${token.volume24h > 1000000 
                            ? `${(token.volume24h / 1000000).toFixed(1)}M` 
                            : `${(token.volume24h / 1000).toFixed(0)}K`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground font-bold">Market Cap</p>
                        <p className="text-sm font-medium font-mono">
                          ${(token.marketCapUsd || 0) > 1000000 
                            ? `${((token.marketCapUsd || 0) / 1000000).toFixed(1)}M` 
                            : `${((token.marketCapUsd || 0) / 1000).toFixed(0)}K`}
                        </p>
                      </div>
                    </div>

                    <button className="w-full bg-[var(--luigi-green)] hover:bg-[var(--luigi-green)]/90 text-white font-mario text-base px-6 py-3 rounded-[16px] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all duration-200">
                      <span className="flex items-center justify-center gap-2">
                        Trade Now!
                        <Image
                          src="/icons/mario/controller.png"
                          alt=""
                          width={16}
                          height={16}
                          className="object-contain inline-block"
                        />
                        <Image
                          src="/icons/mario/right-arrow.png"
                          alt=""
                          width={16}
                          height={16}
                          className="object-contain inline-block"
                        />
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
            <button className="bg-[var(--star-yellow)] hover:bg-[var(--star-yellow)]/90 text-black font-mario text-lg px-8 py-4 rounded-[16px] border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-1 transition-all duration-200">
              <span className="flex items-center justify-center gap-2">
                View All Tokens
                <Image
                  src="/icons/mario/star.png"
                  alt=""
                  width={20}
                  height={20}
                  className="object-contain inline-block"
                />
                <Image
                  src="/icons/mario/right-arrow.png"
                  alt=""
                  width={20}
                  height={20}
                  className="object-contain inline-block"
                />
              </span>
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
