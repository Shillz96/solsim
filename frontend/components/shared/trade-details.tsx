"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  TrendingUp, 
  TrendingDown, 
  Coins, 
  Clock, 
  User, 
  Activity,
  Loader2, 
  AlertCircle, 
  RefreshCw,
  BarChart3,
  DollarSign
} from "lucide-react"
import { useState } from "react"
import { formatUSD, formatQty, formatTokenQuantity } from "@/lib/format"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import { motion } from "framer-motion"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { CurrencyValue, PriceDisplay } from "@/components/shared/currency-display"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { cn } from "@/lib/utils"

interface TradeDetailsProps {
  tokenAddress: string
  tokenSymbol?: string
  tokenName?: string
  variant?: 'default' | 'sidebar' // New prop for sidebar optimization
  maxTrades?: number // Configurable max trades to show
}

// Animated background component similar to P&L card
function AnimatedBackground({ hasActivity }: { hasActivity: boolean }) {
  if (!hasActivity) return null
  
  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg">
      <motion.div 
        className="absolute inset-0 opacity-5 bg-gradient-to-br from-primary/30 to-blue-500/30"
        animate={{ 
          background: [
            "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
            "linear-gradient(225deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)",
            "linear-gradient(315deg, rgba(99, 102, 241, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
            "linear-gradient(45deg, rgba(59, 130, 246, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)",
          ]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />
      <motion.div 
        className="absolute inset-0 opacity-10"
        style={{
          background: "radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.2), transparent 50%)"
        }}
        animate={{ 
          background: [
            "radial-gradient(circle at 30% 20%, rgba(99, 102, 241, 0.2), transparent 50%)",
            "radial-gradient(circle at 70% 80%, rgba(59, 130, 246, 0.2), transparent 50%)",
            "radial-gradient(circle at 80% 30%, rgba(99, 102, 241, 0.2), transparent 50%)",
            "radial-gradient(circle at 20% 70%, rgba(59, 130, 246, 0.2), transparent 50%)",
          ]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  )
}

export function TradeDetails({
  tokenAddress,
  tokenSymbol,
  tokenName,
  variant = 'default',
  maxTrades = 20
}: TradeDetailsProps) {
  const isSidebar = variant === 'sidebar'
  const [limit] = useState(maxTrades)
  
  // Get SOL price for equivalents
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0
  
  // Fetch recent trades for this specific token
  const { 
    data: tradesData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['token-trades', tokenAddress, limit],
    queryFn: () => api.getTokenTrades(tokenAddress, limit, 0),
    staleTime: 30000, // Cache for 30 seconds
    retry: 2,
  })

  const trades = tradesData?.trades || []

  // Calculate some statistics from the trades
  const stats = trades.length > 0 ? {
    totalVolume: trades.reduce((sum, trade) => sum + parseFloat(trade.totalCost), 0),
    buyTrades: trades.filter(trade => trade.action === 'BUY').length,
    sellTrades: trades.filter(trade => trade.action === 'SELL').length,
    avgPrice: trades.length > 0 
      ? trades.reduce((sum, trade) => sum + parseFloat(trade.price), 0) / trades.length 
      : 0,
    priceRange: trades.length > 0 ? {
      high: Math.max(...trades.map(trade => parseFloat(trade.price))),
      low: Math.min(...trades.map(trade => parseFloat(trade.price)))
    } : null
  } : null

  // Use formatting functions from lib/format.ts
  const formatCurrency = formatUSD
  const formatQuantity = (amount: number, decimals: number = 0, symbol?: string) => formatQty(amount.toString(), decimals, symbol)

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <AnimatedBackground hasActivity={false} />
        <div className="relative z-10 p-6 text-center">
          <div className="flex items-center gap-2 text-muted-foreground justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading trade details...</span>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="relative overflow-hidden">
        <div className="relative z-10 p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{(error as Error).message || 'Failed to load trade details'}</span>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden">
      <AnimatedBackground hasActivity={trades.length > 0} />
      
      <CardHeader className={cn("relative z-10", isSidebar ? "pb-2" : "pb-4")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {!isSidebar && (
              <div className="p-2 rounded-lg bg-primary/20">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <CardTitle className={cn(isSidebar ? "text-sm" : "text-lg")}>
                {isSidebar && <Activity className="h-4 w-4 inline mr-2 text-primary" />}
                Trade Activity
              </CardTitle>
              {!isSidebar && (
                <p className="text-sm text-muted-foreground">
                  {tokenSymbol || tokenName || 'Token'} Activity
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 pt-0">
        {trades.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-4 rounded-lg bg-muted/30 inline-block mb-4">
              <Activity className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Recent Activity</h3>
            <p className="text-muted-foreground mb-1">
              No trades found for this token yet
            </p>
            <p className="text-xs text-muted-foreground">
              {tokenSymbol ? `${tokenSymbol} trades will appear here` : 'Trade activity will appear here'}
            </p>
          </div>
        ) : (
          <>
            {/* Enhanced Stats Section */}
            {stats && !isSidebar && (
              <div className="mb-6">
                {/* Main Volume Display */}
                <div className="text-center mb-6 p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Volume</p>
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <Coins className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-bold">
                      <AnimatedNumber value={stats.totalVolume} decimals={2} />
                    </span>
                    <span className="text-lg text-muted-foreground">SOL</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {trades.length} trades
                  </Badge>
                </div>

                {/* Trading Statistics */}
                <div className="grid grid-cols-3 gap-3 mb-4 p-4 bg-muted/30 rounded-lg">
                  <motion.div 
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm text-muted-foreground mb-1">Buy/Sell</p>
                    <div className="flex items-center justify-center space-x-1 text-sm font-bold">
                      <span className="text-green-500">{stats.buyTrades}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-500">{stats.sellTrades}</span>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm text-muted-foreground mb-1">Avg Price</p>
                    <div>
                      <PriceDisplay
                        priceUSD={stats.avgPrice}
                        showSol={true}
                        className="font-mono text-sm font-bold"
                      />
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    className="text-center"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="text-sm text-muted-foreground mb-1">Range</p>
                    {stats.priceRange ? (
                      <div className="font-mono text-xs space-y-1">
                        <div>
                          <PriceDisplay
                            priceUSD={stats.priceRange.high}
                            showSol={true}
                            className="text-green-500 font-medium"
                          />
                        </div>
                        <div>
                          <PriceDisplay
                            priceUSD={stats.priceRange.low}
                            showSol={true}
                            className="text-red-500 font-medium"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </motion.div>
                </div>
              </div>
            )}

            {/* Recent Trades List */}
            <div className={cn("space-y-2", isSidebar && "max-h-[500px] overflow-y-auto pr-2")}>
              {!isSidebar && (
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Recent Activity
                  </h4>
                  <Badge variant="secondary" className="text-xs">
                    Last {Math.min(trades.length, 10)}
                  </Badge>
                </div>
              )}

              {trades.slice(0, isSidebar ? 15 : 5).map((trade, index) => {
                const isRecent = index < 2 // Highlight the 2 most recent trades
                const timeAgo = formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })
                const isBuy = trade.action === 'BUY'
                
                return (
                  <motion.div
                    key={trade.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: isSidebar ? index * 0.02 : index * 0.1 }}
                    className={cn(
                      "rounded-lg border transition-all duration-200 hover:border-primary/50",
                      isSidebar ? "p-2" : "p-4 hover:shadow-sm",
                      isRecent
                        ? "border-primary/20 bg-primary/5"
                        : "border-border bg-card/50"
                    )}
                  >
                    <div className={cn("flex items-center justify-between", isSidebar ? "mb-2" : "mb-3")}>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isBuy ? 'default' : 'destructive'}
                          className={cn("font-medium", isSidebar ? "text-xs py-0 h-5" : "text-xs")}
                        >
                          {isBuy ? (
                            <TrendingUp className={cn(isSidebar ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1")} />
                          ) : (
                            <TrendingDown className={cn(isSidebar ? "h-2.5 w-2.5 mr-0.5" : "h-3 w-3 mr-1")} />
                          )}
                          {trade.action}
                        </Badge>

                        {!isSidebar && trade.user && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{trade.user.handle || 'Anonymous'}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className={cn(isSidebar ? "h-2.5 w-2.5" : "h-3 w-3")} />
                        <span className={cn(isSidebar && "text-xs")}>
                          {isSidebar ? timeAgo.replace(' ago', '').replace('about ', '') : timeAgo}
                        </span>
                      </div>
                    </div>

                    {isSidebar ? (
                      // Compact sidebar layout
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Qty:</span>
                          <span className="font-mono font-medium">
                            {formatTokenQuantity(parseFloat(trade.quantity))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Price:</span>
                          <PriceDisplay
                            priceUSD={parseFloat(trade.price)}
                            showSol={false}
                            className="font-mono font-medium text-xs"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-mono font-medium">
                            {parseFloat(trade.totalCost).toFixed(3)} SOL
                          </span>
                        </div>
                        {trade.realizedPnL && parseFloat(trade.realizedPnL) !== 0 && (
                          <div className="flex items-center justify-between pt-1 border-t">
                            <span className="text-muted-foreground">P&L:</span>
                            <span className={cn(
                              "font-mono font-medium",
                              parseFloat(trade.realizedPnL) > 0 ? 'text-green-500' : 'text-red-500'
                            )}>
                              {parseFloat(trade.realizedPnL) > 0 ? '+' : ''}
                              {parseFloat(trade.realizedPnL).toFixed(3)} SOL
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Full layout for default view
                      <>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-2 bg-muted/50 rounded">
                            <div className="text-xs text-muted-foreground mb-1">Quantity</div>
                            <div className="font-mono font-medium flex items-center justify-center gap-1">
                              <Coins className="h-3 w-3" />
                              {formatTokenQuantity(parseFloat(trade.quantity))}
                            </div>
                          </div>

                          <div className="text-center p-2 bg-muted/50 rounded">
                            <div className="text-xs text-muted-foreground mb-1">Price</div>
                            <div>
                              <PriceDisplay
                                priceUSD={parseFloat(trade.price)}
                                showSol={true}
                                className="font-mono font-medium text-sm"
                              />
                            </div>
                          </div>

                          <div className="text-center p-2 bg-muted/50 rounded">
                            <div className="text-xs text-muted-foreground mb-1">Total</div>
                            <div className="font-mono font-medium">
                              {parseFloat(trade.totalCost).toFixed(4)} SOL
                            </div>
                          </div>
                        </div>

                        {trade.realizedPnL && parseFloat(trade.realizedPnL) !== 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">P&L:</span>
                              <span className={cn(
                                "font-mono font-medium",
                                parseFloat(trade.realizedPnL) > 0 ? 'text-green-500' : 'text-red-500'
                              )}>
                                {parseFloat(trade.realizedPnL) > 0 ? '+' : ''}
                                {parseFloat(trade.realizedPnL).toFixed(4)} SOL
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                )
              })}

              {trades.length > (isSidebar ? 15 : 5) && (
                <div className="text-center pt-2">
                  <Badge variant="outline" className="text-xs">
                    +{trades.length - (isSidebar ? 15 : 5)} more trades
                  </Badge>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}