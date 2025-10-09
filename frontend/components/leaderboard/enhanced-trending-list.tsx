"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AnimatedNumber, Sparkline } from "@/components/ui/animated-number"
import { TokenImage } from "@/components/ui/token-image"
import { useTrendingTokens } from "@/lib/api-hooks"
import type { TrendingToken } from "@/lib/types/api-types"

export function EnhancedTrendingList() {
  const { data: trendingTokens, isLoading: loading, error, refetch: refresh } = useTrendingTokens(10) // Increased to 10 for better variety
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
  }

  if (loading && !trendingTokens) {
    return (
      <Card className="glass-solid p-4">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-sm">Loading...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass-solid p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Failed to load trending tokens
            <Button variant="outline" size="sm" className="ml-2 h-6 text-xs" onClick={handleRefresh}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 mb-3">
        <h3 className="text-sm font-semibold text-foreground">Trending</h3>
        <Badge variant="secondary" className="text-xs">
          24h
        </Badge>
      </div>

      <div className={`space-y-2 transition-opacity ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}>
        {trendingTokens?.map((token, index) => (
        <motion.div
          key={token.tokenAddress}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            className="p-3 cursor-pointer bento-card"
          >
          <div className="flex items-start gap-3">
            <TokenImage 
              src={token.imageUrl} 
              alt={token.tokenName || 'Unknown Token'} 
              size={40}
              className="flex-shrink-0" 
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{token.tokenSymbol || 'N/A'}</span>
                {(() => {
                  const change = token.priceChangePercent24h || 0;
                  // Add threshold to prevent flickering on near-zero values
                  if (change > 0.01) {
                    return <TrendingUp className="h-3 w-3 text-green-600" />;
                  } else if (change < -0.01) {
                    return <TrendingDown className="h-3 w-3 text-red-600" />;
                  }
                  // For values between -0.01 and 0.01, show neutral
                  return null;
                })()}
              </div>
              <p className="text-xs text-muted-foreground truncate">{token.tokenName || 'Unknown Token'}</p>
            </div>

            <div className="text-right flex-shrink-0 space-y-1">
              <AnimatedNumber
                value={token.price}
                prefix="$"
                decimals={token.price < 0.001 ? 6 : 4}
                className="font-mono text-sm font-semibold text-foreground"
                formatLarge={false}
                glowOnChange={true}
              />
              <div className="flex items-center gap-1">
                <AnimatedNumber
                  value={token.priceChangePercent24h}
                  suffix="%"
                  prefix={token.priceChangePercent24h > 0.01 ? "+" : ""}
                  decimals={2}
                  className="text-xs font-medium"
                  colorize={true}
                  glowOnChange={true}
                />
                {/* Mini sparkline placeholder - could add real price history data */}
                <Sparkline
                  data={[...Array(7)].map(() => Math.random() * 100 + 50)}
                  width={30}
                  height={12}
                  color={
                    token.priceChangePercent24h > 0.01 
                      ? "var(--chart-3)" 
                      : token.priceChangePercent24h < -0.01
                      ? "var(--destructive)"
                      : "var(--muted-foreground)"
                  }
                />
              </div>
            </div>
          </div>
        </Card>
        </motion.div>
        ))}
      </div>
    </div>
  )
}
