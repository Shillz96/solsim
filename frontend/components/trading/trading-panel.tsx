"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, Wallet, Settings, AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react"
// Remove old hooks - use services directly
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { useAuth } from "@/hooks/use-auth"

// Token details type
type TokenDetails = {
  tokenAddress: string
  tokenSymbol: string | null
  tokenName: string | null
  price: number
  priceChange24h: number
  priceChangePercent24h: number
  volume24h: number
  marketCap: number
  imageUrl: string | null
  lastUpdated: string
}

interface TradingPanelProps {
  tokenAddress?: string
}

export function TradingPanel({ tokenAddress: propTokenAddress }: TradingPanelProps = {}) {
  const searchParams = useSearchParams()
  const defaultTokenAddress = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // BONK
  const tokenAddress = propTokenAddress || searchParams.get("token") || defaultTokenAddress

  const { user, isAuthenticated, getUserId } = useAuth()
  const [portfolio, setPortfolio] = useState<any>(null)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [portfolioError, setPortfolioError] = useState<string | null>(null)
  const [isTrading, setIsTrading] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)

  // Load portfolio
  useEffect(() => {
    if (isAuthenticated && user) {
      const loadPortfolio = async () => {
        setPortfolioLoading(true)
        try {
          const data = await api.getPortfolio(user.id)
          setPortfolio(data)
        } catch (err) {
          setPortfolioError((err as Error).message)
        } finally {
          setPortfolioLoading(false)
        }
      }
      loadPortfolio()
    }
  }, [isAuthenticated, user])

  const refreshPortfolio = async () => {
    if (!isAuthenticated || !user) return
    setPortfolioLoading(true)
    try {
      const data = await api.getPortfolio(user.id)
      setPortfolio(data)
      setPortfolioError(null)
    } catch (err) {
      setPortfolioError((err as Error).message)
    } finally {
      setPortfolioLoading(false)
    }
  }

  const executeBuy = async (tokenAddress: string, amount: number) => {
    setIsTrading(true)
    setTradeError(null)
    try {
      const userId = getUserId()
      if (!userId) throw new Error('Not authenticated')
      
      const result = await api.trade({
        userId,
        mint: tokenAddress,
        side: 'BUY',
        qty: amount.toString()
      })
      await refreshPortfolio()
      return result
    } catch (err) {
      setTradeError((err as Error).message)
      throw err
    } finally {
      setIsTrading(false)
    }
  }

  const executeSell = async (tokenAddress: string, amount: number) => {
    setIsTrading(true)
    setTradeError(null)
    try {
      const userId = getUserId()
      if (!userId) throw new Error('Not authenticated')
      
      const result = await api.trade({
        userId,
        mint: tokenAddress,
        side: 'SELL',
        qty: amount.toString()
      })
      await refreshPortfolio()
      return result
    } catch (err) {
      setTradeError((err as Error).message)
      throw err
    } finally {
      setIsTrading(false)
    }
  }

  const clearError = () => setTradeError(null)
  const { connected: wsConnected, prices: livePrices, subscribe, unsubscribe } = usePriceStreamContext()
  const { toast } = useToast()

  // State
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null)
  const [tokenHolding, setTokenHolding] = useState<Backend.PortfolioPosition | null>(null)
  const [loadingToken, setLoadingToken] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [customSolAmount, setCustomSolAmount] = useState("")
  const [selectedSolAmount, setSelectedSolAmount] = useState<number | null>(null)
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [lastTradeSuccess, setLastTradeSuccess] = useState(false)

  const presetSolAmounts = [1, 5, 10, 20]
  const sellPercentages = [25, 50, 75, 100]

  // Load token details - separate from portfolio handling to prevent loops
  const loadTokenDetails = useCallback(async (isRefresh = false) => {
    if (!tokenAddress) return

    if (!isRefresh) {
      setLoadingToken(true)
    } else {
      setIsRefreshing(true)
    }
    
    try {
      // For now, use trending to find token (token details not in new API yet)
      const trending = await api.getTrendingTokens()
      const token = trending.find(t => t.address === tokenAddress)
      
      if (token) {
        setTokenDetails({
          tokenAddress: token.address,
          tokenSymbol: token.symbol,
          tokenName: token.name,
          price: parseFloat(token.lastPrice || '0'),
          priceChange24h: parseFloat(token.priceChange24h || '0'),
          priceChangePercent24h: parseFloat(token.priceChange24h || '0'),
          volume24h: parseFloat(token.volume24h || '0'),
          marketCap: parseFloat(token.marketCapUsd || '0'),
          imageUrl: token.imageUrl,
          lastUpdated: new Date().toISOString()
        })
      } else {
        throw new Error('Token not found in trending list')
      }
    } catch (error) {
      import('@/lib/error-logger').then(({ errorLogger }) => {
        errorLogger.error('Failed to load token data', {
          error: error as Error,
          action: 'token_data_load_failed',
          metadata: { 
            tokenAddress: tokenAddress?.substring(0, 8) + '...',
            component: 'TradingPanel'
          }
        })
      })
      toast({
        title: "Error",
        description: "Failed to load token information",
        variant: "destructive"
      })
    } finally {
      setLoadingToken(false)
      setIsRefreshing(false)
    }
  }, [tokenAddress, toast])

  // Handle portfolio position finding - separate effect
  useEffect(() => {
    if (portfolio?.positions && Array.isArray(portfolio.positions)) {
      const holding = portfolio.positions.find(p => 
        p?.tokenAddress === tokenAddress && 
        p?.quantity && 
        parseFloat(p.quantity) > 0
      ) || null
      
      setTokenHolding(holding)
    } else {
      setTokenHolding(null)
    }
  }, [portfolio?.positions, tokenAddress])

  useEffect(() => {
    loadTokenDetails()
  }, [loadTokenDetails])

  // Subscribe to real-time price updates for this token
  // Only re-subscribe when tokenAddress changes, not on every render
  useEffect(() => {
    if (!tokenAddress) return
    
    if (wsConnected) {
      subscribe(tokenAddress)
    }
    
    return () => {
      if (wsConnected) {
        unsubscribe(tokenAddress)
      }
    }
  }, [tokenAddress]) // Only depend on tokenAddress, not subscribe/unsubscribe functions

  // Handle trade execution
  const handleTrade = useCallback(async (action: 'buy' | 'sell') => {
    if (!user || !tokenDetails) {
      toast({
        title: "Error",
        description: "Please ensure you're logged in and token is loaded",
        variant: "destructive"
      })
      return
    }

    clearError()
    
    let amountSol: number
    
    if (action === 'buy') {
      amountSol = selectedSolAmount || (customSolAmount ? parseFloat(customSolAmount) : 0)
      
      if (amountSol <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please select or enter a valid SOL amount",
          variant: "destructive"
        })
        return
      }

      if (amountSol > parseFloat(user.virtualSolBalance)) {
        toast({
          title: "Insufficient Balance",
          description: "You don't have enough SOL for this trade",
          variant: "destructive"
        })
        return
      }
    } else {
      // Sell validation with enhanced error messages
      if (!tokenHolding) {
        toast({
          title: "No Token Holdings",
          description: `You don't have any ${tokenDetails?.tokenName || 'tokens'} to sell. Make sure you've purchased some first.`,
          variant: "destructive"
        })
        return
      }
      
      if (!selectedPercentage) {
        toast({
          title: "Select Amount",
          description: "Please select a percentage of your holdings to sell",
          variant: "destructive"
        })
        return
      }

      const holdingQuantity = parseFloat(tokenHolding.quantity)
      if (isNaN(holdingQuantity) || holdingQuantity <= 0) {
        toast({
          title: "Invalid Holdings",
          description: "Your token balance appears to be invalid. Try refreshing your portfolio.",
          variant: "destructive"
        })
        return
      }

      const sellQuantity = (holdingQuantity * selectedPercentage) / 100
      amountSol = sellQuantity * parseFloat(tokenDetails.price.toString()) / 1e9 // Convert to SOL
      
      import('@/lib/error-logger').then(({ errorLogger }) => {
        errorLogger.info('Sell calculation performed', {
          action: 'sell_calculation',
          metadata: {
            holdingQuantity,
            selectedPercentage,
            sellQuantity,
            tokenPrice: tokenDetails.price,
            amountSol,
            component: 'TradingPanel'
          }
        })
      })
    }

    // Round to max 9 decimal places to match backend validation
    amountSol = Math.round(amountSol * 1e9) / 1e9

    try {
      let result
      if (action === 'buy') {
        result = await executeBuy(tokenAddress, amountSol)
      } else {
        result = await executeSell(tokenAddress, amountSol)
      }

      // Show success message
      toast({
        title: "Trade Executed",
        description: `Successfully ${action === 'buy' ? 'bought' : 'sold'} ${tokenDetails.tokenSymbol || 'tokens'}`,
      })

      // Reset form
      setSelectedSolAmount(null)
      setSelectedPercentage(null)
      setCustomSolAmount("")
      setLastTradeSuccess(true)

      // Refresh portfolio data (token details will update via WebSocket)
      await refreshPortfolio()

      // Clear success indicator after 3 seconds
      setTimeout(() => setLastTradeSuccess(false), 3000)

    } catch (error) {
      import('@/lib/error-logger').then(({ errorLogger }) => {
        errorLogger.error('Trade execution failed', {
          error: error as Error,
          action: 'trade_execution_failed',
          metadata: { 
            tokenAddress: tokenAddress?.substring(0, 8) + '...',
            component: 'TradingPanel'
          }
        })
      })
      // Error is already handled by useTrading hook and displayed via tradeError
    }
  }, [
    user, 
    tokenDetails, 
    tokenAddress,
    selectedSolAmount, 
    customSolAmount, 
    selectedPercentage, 
    tokenHolding,
    executeBuy, 
    executeSell, 
    clearError, 
    toast,
    refreshPortfolio,
    loadTokenDetails
  ])

  // Loading state
  if (loadingToken) {
    return (
      <Card className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </Card>
    )
  }

  if (!tokenDetails) {
    return (
      <Card className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load token information. Please try again.
          </AlertDescription>
        </Alert>
      </Card>
    )
  }

  // Get current price - use live WebSocket price if available, otherwise fall back to static price
  const livePrice = livePrices.get(tokenAddress)
  const currentPrice = livePrice ? livePrice.price : (tokenDetails.price ? parseFloat(tokenDetails.price.toString()) / 1e9 : 0)
  const balance = user ? parseFloat(user.virtualSolBalance) : 0
  const tokenBalance = tokenHolding ? parseFloat(tokenHolding.quantity) : 0

  return (
    <Card className="trading-card p-6 space-y-6 border border-border rounded-none shadow-none">
      {/* Trade Status */}
      {tradeError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{tradeError}</AlertDescription>
        </Alert>
      )}

      {lastTradeSuccess && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Trade executed successfully!</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg">Trade {tokenDetails.tokenSymbol || 'Token'}</h3>
            {isRefreshing && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="font-mono">{balance.toFixed(2)} SOL</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <AnimatedNumber
            value={currentPrice}
            prefix="$"
            decimals={8}
            className="font-mono text-2xl font-bold text-foreground"
            colorize={false}
            glowOnChange={true}
          />
          {(livePrice?.change24h !== undefined || tokenDetails.priceChange24h) && (
            <AnimatedNumber
              value={livePrice?.change24h ?? tokenDetails.priceChange24h}
              suffix="%"
              prefix={(livePrice?.change24h ?? tokenDetails.priceChange24h) >= 0 ? '+' : ''}
              decimals={2}
              className="text-sm font-medium"
              colorize={true}
              glowOnChange={true}
            />
          )}
        </div>
        {tokenHolding && (
          <div className="text-sm text-muted-foreground">
            Holdings: {parseFloat(tokenHolding.quantity).toLocaleString()} {tokenDetails.tokenSymbol}
          </div>
        )}
      </div>

      <Tabs defaultValue="buy" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="buy" className="tab-buy font-bold text-base">
            Buy
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="tab-sell font-bold text-base"
            disabled={!tokenHolding || tokenBalance <= 0}
          >
            Sell
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="space-y-6 mt-4">
          {/* Amount selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-bold">Amount (SOL)</Label>
              <Button
                variant={showCustomInput ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs transition-colors",
                  showCustomInput && "bg-primary text-primary-foreground"
                )}
                onClick={() => setShowCustomInput(!showCustomInput)}
              >
                <Settings className="h-3 w-3 mr-1" />
                {showCustomInput ? 'Presets' : 'Custom'}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {presetSolAmounts.map((amount) => (
                <Button
                  key={amount}
                  size="lg"
                  variant={selectedSolAmount === amount ? "default" : "outline"}
                  className={cn(
                    "h-12 font-mono text-base transition-all relative",
                    selectedSolAmount === amount
                      ? "bg-accent text-accent-foreground hover:bg-accent/90 ring-2 ring-accent ring-offset-2"
                      : "bg-card hover:bg-muted",
                    amount > balance && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => {
                    setSelectedSolAmount(amount)
                    setCustomSolAmount("")
                  }}
                  disabled={amount > balance}
                  title={amount > balance ? `Insufficient balance (need ${amount} SOL)` : undefined}
                >
                  {amount} SOL
                  {amount > balance && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" />
                  )}
                </Button>
              ))}
            </div>

            {showCustomInput && (
              <div className="pt-2">
                <Input
                  type="number"
                  placeholder="Enter custom amount"
                  value={customSolAmount}
                  onChange={(e) => {
                    setCustomSolAmount(e.target.value)
                    setSelectedSolAmount(null)
                  }}
                  className="font-mono"
                  max={balance}
                  step="0.1"
                />
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Token calculation */}
          <div className="space-y-3">
            <Label htmlFor="token-amount" className="text-sm font-bold">
              You'll receive {tokenDetails?.tokenSymbol ? `(${tokenDetails.tokenSymbol})` : '(tokens)'}
            </Label>
            <Input
              id="token-amount"
              type="text"
              value={
                selectedSolAmount
                  ? (selectedSolAmount / currentPrice).toFixed(0)
                  : customSolAmount
                    ? (Number.parseFloat(customSolAmount) / currentPrice).toFixed(0)
                    : ""
              }
              readOnly
              className="font-mono bg-muted"
            />
          </div>

          <Separator className="my-6" />

          {/* Price info */}
          <div className="rounded-none bg-muted/50 p-4 space-y-3 border border-border">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="font-mono text-sm">${currentPrice.toFixed(8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Market Cap</span>
              <span className="font-mono text-sm">
                {tokenDetails.marketCap ? `$${(tokenDetails.marketCap / 1e6).toFixed(2)}M` : 'N/A'}
              </span>
            </div>
          </div>

          <Button 
            className="w-full btn-buy h-14 text-lg font-bold" 
            size="lg"
            onClick={() => handleTrade('buy')}
            disabled={
              isTrading || 
              isRefreshing || 
              (!selectedSolAmount && !customSolAmount) ||
              !tokenDetails?.tokenSymbol
            }
          >
            <TrendingUp className="mr-2 h-5 w-5" />
            {isTrading ? 'Processing...' : 
             !tokenDetails ? 'Loading Token...' :
             !tokenDetails.tokenSymbol ? 'Select a Token' :
             `Buy ${tokenDetails.tokenSymbol}`}
          </Button>
        </TabsContent>

        <TabsContent value="sell" className="space-y-4 mt-4">
          {!tokenHolding || parseFloat(tokenHolding.quantity || '0') <= 0 ? (
            <div className="space-y-3">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You don't own any {tokenDetails?.tokenSymbol || 'tokens'} to sell.
                  {portfolioLoading ? " Loading your holdings..." : " Purchase some tokens first to enable selling."}
                </AlertDescription>
              </Alert>
              
              {portfolioError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Error loading portfolio. 
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => refreshPortfolio()}
                      className="ml-2"
                    >
                      Try again
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <>
              {/* Show current holdings */}
              <div className="bg-muted/50 rounded-none p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold">Your Holdings</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => loadTokenDetails(true)}
                    disabled={isRefreshing}
                    className="h-6 px-2"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                <div className="font-mono text-lg font-semibold mb-2">
                  {parseFloat(tokenHolding.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tokenDetails?.tokenSymbol || 'tokens'}
                </div>
                {tokenHolding.pnl?.sol?.absolute && (
                  <div className={`text-sm ${parseFloat(tokenHolding.pnl.sol.absolute) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(tokenHolding.pnl.sol.absolute) >= 0 ? '+' : ''}{parseFloat(tokenHolding.pnl.sol.absolute).toFixed(4)} SOL 
                    ({tokenHolding.pnl.sol.percent >= 0 ? '+' : ''}{tokenHolding.pnl.sol.percent.toFixed(2)}%)
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <Label className="text-sm font-bold">Amount (% of holdings)</Label>
                <div className="grid grid-cols-2 gap-4">
                  {sellPercentages.map((percent) => (
                    <Button
                      key={percent}
                      variant={selectedPercentage === percent ? "default" : "outline"}
                      className={cn(
                        "font-mono text-sm transition-all",
                        selectedPercentage === percent
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-2 ring-destructive ring-offset-2"
                          : "bg-card hover:bg-muted"
                      )}
                      onClick={() => setSelectedPercentage(percent)}
                    >
                      {percent === 100 ? "ALL" : `${percent}%`}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="sell-amount" className="text-sm font-bold">Selling ({tokenDetails.tokenSymbol})</Label>
                <Input
                  id="sell-amount"
                  type="text"
                  value={selectedPercentage ? ((tokenBalance * selectedPercentage) / 100).toFixed(0) : ""}
                  readOnly
                  className="font-mono bg-muted"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="receive-sol" className="text-sm font-bold">You'll receive (SOL)</Label>
                <Input
                  id="receive-sol"
                  type="text"
                  value={selectedPercentage ? (((tokenBalance * selectedPercentage) / 100) * currentPrice).toFixed(6) : ""}
                  readOnly
                  className="font-mono bg-muted"
                />
              </div>

              <div className="space-y-3 rounded-none bg-muted p-4 text-sm border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-mono">${currentPrice.toFixed(8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Holdings</span>
                  <span className="font-mono">{tokenBalance.toLocaleString()} {tokenDetails.tokenSymbol}</span>
                </div>
                {tokenHolding && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Entry Price</span>
                    <span className="font-mono">${parseFloat(tokenHolding.entryPrice).toFixed(8)}</span>
                  </div>
                )}
              </div>

              <Button 
                className="w-full btn-sell h-14 text-lg font-bold" 
                size="lg"
                onClick={() => handleTrade('sell')}
                disabled={
                  isTrading || 
                  isRefreshing || 
                  !selectedPercentage ||
                  !tokenDetails?.tokenSymbol
                }
              >
                <TrendingDown className="mr-2 h-5 w-5" />
                {isTrading ? 'Processing...' : 
                 !tokenDetails ? 'Loading Token...' :
                 !tokenDetails.tokenSymbol ? 'Select a Token' :
                 `Sell ${tokenDetails.tokenSymbol}`}
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}
