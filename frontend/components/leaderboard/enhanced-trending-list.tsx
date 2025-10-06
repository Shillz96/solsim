"use client"

import { useState } from "react"
import { TrendingUp, TrendingDown, Loader2, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { useTrendingTokens } from "@/lib/api-hooks-v2"
import type { TrendingToken } from "@/lib/types/api-types"

export function EnhancedTrendingList() {
  const { data: trendingTokens, isLoading: loading, error, refetch: refresh } = useTrendingTokens(5) // Limit to 5 for sidebar
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refresh()
    setIsRefreshing(false)
  }

  if (loading && !trendingTokens) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="ml-2 text-sm">Loading...</span>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-4">
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
        {trendingTokens?.map((token) => (
        <Card
          key={token.tokenAddress}
          className="p-3 cursor-pointer transition-all hover:border-primary/50 hover:glow-primary"
        >
          <div className="flex items-start gap-3">
            <div className="relative h-10 w-10 flex-shrink-0 rounded-full overflow-hidden bg-muted">
              <Image 
                src={token.imageUrl || "/placeholder-token.svg"} 
                alt={token.tokenName || 'Unknown Token'} 
                fill 
                sizes="40px"
                className="object-cover" 
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{token.tokenSymbol || 'N/A'}</span>
                {token.priceChangePercent24h > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{token.tokenName || 'Unknown Token'}</p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="font-mono text-sm font-semibold text-foreground">
                ${token.price < 0.001 ? token.price.toExponential(2) : token.price.toFixed(4)}
              </p>
              <p className={`text-xs font-medium ${token.priceChangePercent24h > 0 ? "text-green-600" : "text-red-600"}`}>
                {token.priceChangePercent24h > 0 ? "+" : ""}
                {token.priceChangePercent24h.toFixed(2)}%
              </p>
            </div>
          </div>
        </Card>
        ))}
      </div>
    </div>
  )
}
