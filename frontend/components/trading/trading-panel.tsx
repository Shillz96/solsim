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
import { useAuth, useTrading, usePortfolio } from "@/lib/api-hooks"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import marketService from "@/lib/market-service"
import type { TokenDetails } from "@/lib/types/api-types"
import type { PortfolioPosition } from "@/lib/portfolio-service"
import { AnimatedNumber } from "@/components/ui/animated-number"

interface TradingPanelProps {
  tokenAddress?: string
}

export function TradingPanel({ tokenAddress: propTokenAddress }: TradingPanelProps = {}) {
  const searchParams = useSearchParams()
  const defaultTokenAddress = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // BONK
  const tokenAddress = propTokenAddress || searchParams.get("token") || defaultTokenAddress

  // Hooks
  const { user } = useAuth()
  const { data: portfolio, refetch: refreshPortfolio, isLoading: portfolioLoading, error: portfolioError } = usePortfolio()
  const { isTrading, tradeError, executeBuy, executeSell, clearError } = useTrading()
  const { connected: wsConnected, prices: livePrices, subscribe, unsubscribe } = usePriceStreamContext()
  const { toast } = useToast()

  // State
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null)
  const [tokenHolding, setTokenHolding] = useState<PortfolioPosition | null>(null)
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
      const details = await marketService.getTokenDetails(tokenAddress)
      setTokenDetails(details)
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
  useEffect(() => {
    if (tokenAddress && wsConnected) {
      subscribe(tokenAddress)
      return () => {
        unsubscribe(tokenAddress)
      }
    }
  }, [tokenAddress, wsConnected]) // Remove subscribe/unsubscribe to prevent loops

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
    <Card className="trading-card p-6 space-y-6">
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">Trade {tokenDetails.tokenSymbol || 'Token'}</h3>
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="buy" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
            Buy
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
            disabled={!tokenHolding || tokenBalance <= 0}
          >
            Sell
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buy" className="space-y-6 mt-4">
          {/* Amount selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Amount (SOL)</Label>
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

            <div className="grid grid-cols-2 gap-3">
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

          <Separator className="my-4" />

          {/* Token calculation */}
          <div className="space-y-3">
            <Label htmlFor="token-amount">
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

          <Separator className="my-4" />

          {/* Price info */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price</span>
              <span className="font-mono">${currentPrice.toFixed(8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Market Cap</span>
              <span className="font-mono">
                {tokenDetails.marketCap ? `$${(tokenDetails.marketCap / 1e6).toFixed(2)}M` : 'N/A'}
              </span>
            </div>
          </div>

          <Button 
            className={`w-full bg-accent text-accent-foreground hover:bg-accent/90 transition-opacity ${
              isRefreshing ? 'opacity-70' : 'opacity-100'
            }`} 
            size="lg"
            onClick={() => handleTrade('buy')}
            disabled={
              isTrading || 
              isRefreshing || 
              (!selectedSolAmount && !customSolAmount) ||
              !tokenDetails?.tokenSymbol
            }
          >
            <TrendingUp className="mr-2 h-4 w-4" />
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
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Your Holdings</span>
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
                <div className="font-mono text-lg font-semibold">
                  {parseFloat(tokenHolding.quantity).toLocaleString(undefined, { maximumFractionDigits: 6 })} {tokenDetails?.tokenSymbol || 'tokens'}
                </div>
                {tokenHolding.pnl && (
                  <div className={`text-sm ${parseFloat(tokenHolding.pnl.sol.absolute) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {parseFloat(tokenHolding.pnl.sol.absolute) >= 0 ? '+' : ''}{parseFloat(tokenHolding.pnl.sol.absolute).toFixed(4)} SOL 
                    ({tokenHolding.pnl.sol.percent >= 0 ? '+' : ''}{tokenHolding.pnl.sol.percent.toFixed(2)}%)
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Amount (% of holdings)</Label>
                <div className="grid grid-cols-2 gap-2">
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

              <div className="space-y-2">
                <Label htmlFor="sell-amount">Selling ({tokenDetails.tokenSymbol})</Label>
                <Input
                  id="sell-amount"
                  type="text"
                  value={selectedPercentage ? ((tokenBalance * selectedPercentage) / 100).toFixed(0) : ""}
                  readOnly
                  className="font-mono bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receive-sol">You'll receive (SOL)</Label>
                <Input
                  id="receive-sol"
                  type="text"
                  value={selectedPercentage ? (((tokenBalance * selectedPercentage) / 100) * currentPrice).toFixed(6) : ""}
                  readOnly
                  className="font-mono bg-muted"
                />
              </div>

              <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
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
                className={`w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-opacity ${
                  isRefreshing ? 'opacity-70' : 'opacity-100'
                }`} 
                size="lg"
                onClick={() => handleTrade('sell')}
                disabled={
                  isTrading || 
                  isRefreshing || 
                  !selectedPercentage ||
                  !tokenDetails?.tokenSymbol
                }
              >
                <TrendingDown className="mr-2 h-4 w-4" />
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
