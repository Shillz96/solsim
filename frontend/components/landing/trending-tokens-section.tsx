"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, ArrowRight, TrendingDown, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { useTrendingTokens } from "@/lib/api-hooks"
import type { TrendingToken } from "@/lib/types/api-types"

export function TrendingTokensSection() {
  const { data: trendingTokens, isLoading: loading } = useTrendingTokens(3) // Limit to 3 for landing page

  return (
    <section className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center space-y-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-balance">
            <span className="gradient-text">Trending</span> Tokens
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Live market data from the hottest Solana tokens. Start trading now.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 3 }).map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 bg-card border-border h-full">
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
                </Card>
              </motion.div>
            ))
          ) : (
            trendingTokens?.map((token, index) => (
              <motion.div
                key={token.tokenAddress}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/trade?token=${token.tokenAddress}`}>
                  <Card className="p-6 bg-card border-border hover:border-foreground/30 transition-all duration-300 group cursor-pointer h-full">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 rounded-full overflow-hidden bg-muted">
                          <Image 
                            src={token.imageUrl || "/placeholder-token.svg"} 
                            alt={token.tokenName || 'Unknown Token'} 
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
                            <h3 className="font-heading text-lg font-bold">{token.tokenSymbol || 'N/A'}</h3>
                            {(() => {
                              const change = token.priceChangePercent24h || 0;
                              // Add threshold to prevent flickering on near-zero values
                              if (change > 0.01) {
                                return <TrendingUp className="h-4 w-4 text-green-600" />;
                              } else if (change < -0.01) {
                                return <TrendingDown className="h-4 w-4 text-red-600" />;
                              }
                              // For values between -0.01 and 0.01, show neutral (no icon or dash)
                              return null;
                            })()}
                          </div>
                          <p className="text-sm text-muted-foreground">{token.tokenName || 'Unknown Token'}</p>
                        </div>
                      </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="text-lg font-bold font-mono">
                          ${(token.price || 0) < 0.001 ? (token.price || 0).toExponential(2) : (token.price || 0).toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">24h Change</p>
                        <p
                          className={`text-lg font-bold font-mono ${(() => {
                            const change = token.priceChangePercent24h || 0;
                            if (change > 0.01) return "text-green-600";
                            if (change < -0.01) return "text-red-600";
                            return "text-muted-foreground";
                          })()}`}
                        >
                          {(() => {
                            const change = token.priceChangePercent24h || 0;
                            if (change > 0.01) return "+";
                            if (change < -0.01) return "";
                            return "";
                          })()}
                          {(token.priceChangePercent24h || 0).toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Volume</p>
                        <p className="text-sm font-medium font-mono">
                          ${(token.volume24h || 0) > 1000000 
                            ? `${((token.volume24h || 0) / 1000000).toFixed(1)}M` 
                            : `${((token.volume24h || 0) / 1000).toFixed(0)}K`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Market Cap</p>
                        <p className="text-sm font-medium font-mono">
                          ${token.marketCap > 1000000 
                            ? `${(token.marketCap / 1000000).toFixed(1)}M` 
                            : `${(token.marketCap / 1000).toFixed(0)}K`}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="default"
                      className="w-full bg-foreground text-background hover:bg-foreground/90"
                    >
                      View Trade
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </Card>
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
            <Button size="lg" className="group bg-foreground text-background hover:bg-foreground/90">
              View All Tokens
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
