"use client"

import { useState, useEffect, useCallback, memo } from "react"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { TrendingUp, TrendingDown, Wallet, Settings, AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react"
// Remove old hooks - use services directly
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { formatUSD, formatNumber, safePercent, formatTokenQuantity, formatPriceUSD } from "@/lib/format"
import { SolEquiv, UsdWithSol } from "@/lib/sol-equivalent"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { ScreenReaderAnnouncements } from "@/components/shared/screen-reader-announcements"
import { useScreenReaderAnnouncements } from "@/hooks/use-screen-reader-announcements"
import { TradingValue, ProfitLossValue } from "@/components/ui/financial-value"
import { useAuth } from "@/hooks/use-auth"
import { usePortfolio, usePosition } from "@/hooks/use-portfolio"

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

function TradingPanelComponent({ tokenAddress: propTokenAddress }: TradingPanelProps = {}) {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const defaultTokenAddress = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // BONK
  const tokenAddress = propTokenAddress || searchParams.get("token") || defaultTokenAddress

  const { user, isAuthenticated, getUserId } = useAuth()

  // Use centralized portfolio hook
  const {
    data: portfolio,
    isLoading: portfolioLoading,
    error: portfolioErrorObj,
    refetch: refreshPortfolio
  } = usePortfolio()

  // Convert error object to string for backward compatibility
  const portfolioError = portfolioErrorObj ? (portfolioErrorObj as Error).message : null

  const [userBalance, setUserBalance] = useState<number>(0)
  const [isTrading, setIsTrading] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)

  // Screen reader announcements
  const {
    announcement,
    urgentAnnouncement,
    announcePriceChange,
    announceTradeComplete,
    announceTradeError,
    announceBalanceUpdate,
  } = useScreenReaderAnnouncements()

  // Load user balance on auth
  useEffect(() => {
    if (isAuthenticated && user) {
      const loadBalance = async () => {
        try {
          const balanceData = await api.getWalletBalance(user.id)
          setUserBalance(parseFloat(balanceData.balance))
        } catch (err) {
          console.error('Failed to load balance:', err)
        }
      }
      loadBalance()
    }
  }, [isAuthenticated, user])

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
      
      // Update local state immediately with the response
      if (result.success) {
        // Refresh portfolio using centralized hook
        await refreshPortfolio()

        // Update wallet balance after successful trade
        const balanceData = await api.getWalletBalance(userId)
        setUserBalance(parseFloat(balanceData.balance))
        announceBalanceUpdate(parseFloat(balanceData.balance))

        // Invalidate React Query cache to force navbar balance refresh
        queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })

        // Show success toast with trade details
        toast({
          title: "Trade Executed Successfully! 🎉",
          description: `Bought ${formatTokenQuantity(parseFloat(result.trade.quantity))} tokens for ${parseFloat(result.trade.totalCost).toFixed(4)} SOL`,
          duration: 5000,
        })

        // Announce trade completion for screen readers
        announceTradeComplete(
          'buy',
          tokenDetails?.tokenSymbol || 'tokens',
          parseFloat(result.trade.quantity),
          parseFloat(result.trade.totalCost)
        )
        
        // Show reward points earned
        if (parseFloat(result.rewardPointsEarned) > 0) {
          toast({
            title: "Reward Points Earned! ⭐",
            description: `+${formatNumber(parseFloat(result.rewardPointsEarned))} points`,
            duration: 3000,
          })
        }
        
        setLastTradeSuccess(true)
        setTimeout(() => setLastTradeSuccess(false), 3000)

        // Save last trade for repeat functionality
        const tradeInfo = {
          side: 'buy' as const,
          amount: amount,
          timestamp: Date.now()
        }
        setLastTrade(tradeInfo)
        localStorage.setItem(`lastTrade_${tokenAddress}`, JSON.stringify(tradeInfo))

        // Reset form
        setSelectedSolAmount(null)
        setCustomSolAmount("")
        setShowCustomInput(false)
      }

      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      setTradeError(errorMessage)
      
      // Announce error for screen readers
      announceTradeError(errorMessage)
      
      toast({
        title: "Trade Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
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
      
      // Update local state immediately with the response
      if (result.success) {
        // Refresh portfolio using centralized hook
        await refreshPortfolio()

        // Update wallet balance after successful trade
        const balanceData = await api.getWalletBalance(userId)
        setUserBalance(parseFloat(balanceData.balance))
        announceBalanceUpdate(parseFloat(balanceData.balance))

        // Invalidate React Query cache to force navbar balance refresh
        queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })

        // Format trade confirmation - NEVER mix USD and SOL on same line
        const tradedQuantity = formatTokenQuantity(parseFloat(result.trade.quantity))
        const tradedSOL = parseFloat(result.trade.totalCost).toFixed(4)
        
        // Show success toast with trade details
        toast({
          title: "Sell Trade Executed! 💰",
          description: `Sold ${tradedQuantity} tokens for ${tradedSOL} SOL`,
          duration: 5000,
        })

        // Announce trade completion for screen readers
        announceTradeComplete(
          'sell',
          tokenDetails?.tokenSymbol || 'tokens',
          parseFloat(result.trade.quantity),
          parseFloat(result.trade.totalCost)
        )
        
        // Show reward points earned  
        if (parseFloat(result.rewardPointsEarned) > 0) {
          toast({
            title: "Reward Points Earned! ⭐",
            description: `+${formatNumber(parseFloat(result.rewardPointsEarned))} points`,
            duration: 3000,
          })
        }
        
        setLastTradeSuccess(true)
        setTimeout(() => setLastTradeSuccess(false), 3000)

        // Save last trade for repeat functionality
        const tradeInfo = {
          side: 'sell' as const,
          amount: amount,
          timestamp: Date.now()
        }
        setLastTrade(tradeInfo)
        localStorage.setItem(`lastTrade_${tokenAddress}`, JSON.stringify(tradeInfo))

        // Reset form
        setSelectedPercentage(null)
        setCustomSolAmount("")
        setShowCustomInput(false)
      }

      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      setTradeError(errorMessage)
      
      // Announce error for screen readers
      announceTradeError(errorMessage)
      
      toast({
        title: "Trade Failed",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      })
      throw err
    } finally {
      setIsTrading(false)
    }
  }

  const clearError = () => setTradeError(null)
  const { connected: wsConnected, prices: livePrices, subscribe, unsubscribe } = usePriceStreamContext()
  const { toast } = useToast()
  
  // Get SOL price for calculations
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 208  // State
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null)

  // Use centralized position hook
  const tokenHolding = usePosition(tokenAddress)

  const [loadingToken, setLoadingToken] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [customSolAmount, setCustomSolAmount] = useState("")
  const [selectedSolAmount, setSelectedSolAmount] = useState<number | null>(null)
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [lastTradeSuccess, setLastTradeSuccess] = useState(false)
  const [customSellPercentage, setCustomSellPercentage] = useState("")
  const [lastTrade, setLastTrade] = useState<{side: 'buy' | 'sell', amount: number, timestamp: number} | null>(null)

  const presetSolAmounts = [1, 5, 10, 20]
  const presetBalancePercentages = [1, 5, 10, 25] // % of balance
  const sellPercentages = [25, 50, 75, 100]

  // Load last trade from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`lastTrade_${tokenAddress}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Only use if less than 24 hours old
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setLastTrade(parsed)
        }
      } catch (e) {
        // Invalid data, ignore
      }
    }
  }, [tokenAddress])

  // Handle URL params for quick sell (from portfolio quick actions)
  useEffect(() => {
    const action = searchParams.get('action')
    const percent = searchParams.get('percent')

    if (action === 'sell' && percent) {
      const percentNum = parseInt(percent)
      if (!isNaN(percentNum) && percentNum > 0 && percentNum <= 100) {
        setSelectedPercentage(percentNum)
        setCustomSellPercentage(percentNum.toString())
      }
    }
  }, [searchParams])

  // Load token details - use proper token details API
  const loadTokenDetails = useCallback(async (isRefresh = false) => {
    if (!tokenAddress) return

    if (!isRefresh) {
      setLoadingToken(true)
    } else {
      setIsRefreshing(true)
    }
    
    try {
      // Use the proper token details API
      const token = await api.getTokenDetails(tokenAddress)
      
      if (token) {
        setTokenDetails({
          tokenAddress: token.address || token.mint || tokenAddress,
          tokenSymbol: token.symbol,
          tokenName: token.name,
          price: parseFloat(token.lastPrice || '0'),
          priceChange24h: parseFloat(token.priceChange24h || '0'),
          priceChangePercent24h: parseFloat(token.priceChange24h || '0'),
          volume24h: parseFloat(token.volume24h || '0'),
          marketCap: parseFloat(token.marketCapUsd || '0'),
          imageUrl: token.imageUrl || token.logoURI || null,
          lastUpdated: token.lastTs || new Date().toISOString()
        })
      } else {
        throw new Error('Token not found')
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
        description: "Failed to load token information. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoadingToken(false)
      setIsRefreshing(false)
    }
  }, [tokenAddress, toast])

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

      if (amountSol > userBalance) {
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

      const holdingQuantity = parseFloat(tokenHolding.qty)
      if (isNaN(holdingQuantity) || holdingQuantity <= 0) {
        toast({
          title: "Invalid Holdings",
          description: "Your token balance appears to be invalid. Try refreshing your portfolio.",
          variant: "destructive"
        })
        return
      }

      const sellQuantity = (holdingQuantity * selectedPercentage) / 100
      amountSol = sellQuantity * tokenDetails.price // Sell quantity in USD

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

    // Convert to token quantity for backend
    let tokenQuantity: number
    if (action === 'buy') {
      // For buy: convert SOL amount to USD then to token quantity
      // The backend expects token quantity, not SOL amount
      // amountSol * solPrice gives us USD value, then divide by token price
      const amountUsd = amountSol * solPrice
      tokenQuantity = amountUsd / tokenDetails.price

      import('@/lib/error-logger').then(({ errorLogger }) => {
        errorLogger.info('Buy calculation performed', {
          action: 'buy_calculation',
          metadata: {
            amountSol,
            solPrice: solPrice || 250,
            amountUsd,
            tokenPrice: tokenDetails.price,
            tokenQuantity,
            component: 'TradingPanel'
          }
        })
      })
    } else {
      // For sell: amountSol is already the token quantity (calculated as percentage of holdings)
      tokenQuantity = (tokenBalance * (selectedPercentage || 0)) / 100
    }

    // Round to max 9 decimal places to match backend validation
    tokenQuantity = Math.round(tokenQuantity * 1e9) / 1e9

    try {
      let result
      if (action === 'buy') {
        result = await executeBuy(tokenAddress, tokenQuantity)
      } else {
        result = await executeSell(tokenAddress, tokenQuantity)
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
      <div className="p-6 rounded-lg bg-card border border-border/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!tokenDetails) {
    return (
      <div className="p-6 rounded-lg bg-card border border-border/50">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load token information. Please try again.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Get current price - use live WebSocket price if available, otherwise fall back to static price
  const livePrice = livePrices.get(tokenAddress)
  const currentPrice = livePrice ? livePrice.price : (tokenDetails.price || 0)
  const balance = userBalance
  const tokenBalance = tokenHolding ? parseFloat(tokenHolding.qty) : 0

  return (
    <div className="p-4 sm:p-6 rounded-lg bg-card border border-border/50">
      <div className="space-y-4 sm:space-y-6">
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
        <div className="flex flex-col items-end">
          <AnimatedNumber
            value={currentPrice}
            prefix="$"
            decimals={8}
            className="font-mono text-2xl font-bold text-foreground"
            colorize={false}
            glowOnChange={true}
          />
          {solPrice > 0 && (
            <div className="text-xs text-muted-foreground">
              {formatSolEquivalent(currentPrice, solPrice)}
            </div>
          )}
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
          <div className="space-y-1">
            <div className="text-sm text-muted-foreground">
              Holdings: {formatTokenQuantity(tokenHolding.qty)} {tokenDetails.tokenSymbol}
            </div>
            <div className="text-xs text-muted-foreground">
              Value: <UsdWithSol usd={parseFloat(tokenHolding.qty) * currentPrice} className="inline" compact />
            </div>
          </div>
        )}
      </div>

      <Tabs defaultValue={searchParams.get('action') === 'sell' ? 'sell' : 'buy'} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-14 sm:h-12 gap-1">
          <TabsTrigger value="buy" className="tab-buy font-bold text-base sm:text-sm h-12 sm:h-auto">
            Buy
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className="tab-sell font-bold text-base sm:text-sm h-12 sm:h-auto"
            disabled={!tokenHolding || tokenBalance <= 0}
          >
            Sell
          </TabsTrigger>
        </TabsList>

        {/* Repeat Last Trade Button - Shows for both tabs */}
        {lastTrade && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-primary/30 hover:bg-primary/10 text-xs"
              onClick={() => {
                if (lastTrade.side === 'buy') {
                  // Set the buy amount and trigger buy
                  const solAmount = lastTrade.amount * solPrice / (tokenDetails?.price || 1)
                  setSelectedSolAmount(solAmount)
                  setCustomSolAmount("")
                } else {
                  // Set the sell percentage and trigger sell
                  // lastTrade.amount is token quantity, need to calculate percentage
                  if (tokenHolding) {
                    const percentage = (lastTrade.amount / parseFloat(tokenHolding.qty)) * 100
                    setSelectedPercentage(Math.min(100, Math.round(percentage)))
                  }
                }
              }}
            >
              <RefreshCw className="h-3 w-3 mr-2" />
              Repeat Last {lastTrade.side === 'buy' ? 'Buy' : 'Sell'}
            </Button>
          </div>
        )}

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

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {presetSolAmounts.map((amount) => (
                <Button
                  key={amount}
                  size="lg"
                  variant={selectedSolAmount === amount ? "default" : "outline"}
                  className={cn(
                    "h-14 sm:h-12 font-mono text-lg sm:text-base transition-all relative active:scale-95",
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
                  aria-label={
                    amount > balance
                      ? `${amount} SOL - Insufficient balance, you have ${balance.toFixed(2)} SOL available`
                      : `Select ${amount} SOL to spend${selectedSolAmount === amount ? ', currently selected' : ''}`
                  }
                  aria-pressed={selectedSolAmount === amount}
                  title={amount > balance ? `Insufficient balance (need ${amount} SOL)` : undefined}
                >
                  {amount} SOL
                  {amount > balance && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" aria-hidden="true" />
                  )}
                </Button>
              ))}
            </div>

            {/* Balance Percentage Presets */}
            <div className="pt-2 border-t border-border/50">
              <Label className="text-xs text-muted-foreground mb-2 block">Or % of balance</Label>
              <div className="grid grid-cols-4 gap-2">
                {presetBalancePercentages.map((percent) => {
                  const solAmount = (balance * percent) / 100
                  return (
                    <Button
                      key={`balance-${percent}`}
                      size="sm"
                      variant={selectedSolAmount === solAmount ? "default" : "outline"}
                      className={cn(
                        "h-10 text-xs font-semibold transition-all active:scale-95",
                        selectedSolAmount === solAmount
                          ? "bg-accent/80 text-accent-foreground"
                          : "bg-card hover:bg-muted"
                      )}
                      onClick={() => {
                        setSelectedSolAmount(solAmount)
                        setCustomSolAmount("")
                      }}
                      disabled={solAmount <= 0}
                    >
                      {percent}%
                      <span className="block text-xs opacity-70 font-normal">
                        {solAmount.toFixed(1)}
                      </span>
                    </Button>
                  )
                })}
              </div>
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
                  aria-label="Custom SOL amount to spend"
                  aria-describedby="custom-amount-help"
                />
                <div id="custom-amount-help" className="sr-only">
                  Enter the amount of SOL you want to spend. Maximum available: {balance.toFixed(2)} SOL
                </div>
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
                selectedSolAmount && solPrice && currentPrice
                  ? formatTokenQuantity((selectedSolAmount * solPrice) / currentPrice)
                  : customSolAmount && solPrice && currentPrice
                    ? formatTokenQuantity((Number.parseFloat(customSolAmount) * solPrice) / currentPrice)
                    : ""
              }
              readOnly
              className="font-mono bg-muted"
              aria-label={`Tokens you will receive: ${
                selectedSolAmount && solPrice && currentPrice
                  ? ((selectedSolAmount * solPrice) / currentPrice).toFixed(0)
                  : customSolAmount && solPrice && currentPrice
                    ? ((Number.parseFloat(customSolAmount) * solPrice) / currentPrice).toFixed(0)
                    : "0"
              } ${tokenDetails?.tokenSymbol || 'tokens'}`}
            />
          </div>

          <Separator className="my-6" />

          {/* Price info */}
          <div className="rounded-none bg-muted/50 p-4 space-y-3 border border-border" role="region" aria-label="Token pricing information">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Price</span>
              <div className="flex flex-col items-end">
                <span className="font-mono text-sm" aria-label={`Current price: ${formatPriceUSD(currentPrice).replace('$', '')} dollars`}>
                  {formatPriceUSD(currentPrice)}
                </span>
                {solPrice > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatSolEquivalent(currentPrice, solPrice)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Market Cap</span>
              <div className="flex flex-col items-end">
                <span className="font-mono text-sm" aria-label={`Market capitalization: ${tokenDetails.marketCap ? formatNumber(tokenDetails.marketCap) : 'Not available'}`}>
                  {tokenDetails.marketCap ? `$${formatNumber(tokenDetails.marketCap)}` : 'N/A'}
                </span>
                {tokenDetails.marketCap && solPrice > 0 && (
                  <SolEquiv usd={tokenDetails.marketCap} className="text-xs" />
                )}
              </div>
            </div>
          </div>

          <Button
            className="w-full btn-buy h-16 sm:h-14 text-xl sm:text-lg font-bold active:scale-[0.98] transition-transform"
            size="lg"
            onClick={() => handleTrade('buy')}
            disabled={
              isTrading ||
              isRefreshing ||
              (!selectedSolAmount && !customSolAmount) ||
              !tokenDetails?.tokenSymbol
            }
            aria-label={
              isTrading ? 'Processing buy order' :
              !tokenDetails ? 'Loading token information' :
              !tokenDetails.tokenSymbol ? 'Select a token to trade' :
              (!selectedSolAmount && !customSolAmount) ? 'Enter amount to buy' :
              `Buy ${tokenDetails.tokenSymbol} for ${selectedSolAmount || customSolAmount} SOL`
            }
            aria-describedby="buy-button-help"
          >
            <TrendingUp className="mr-2 h-6 w-6 sm:h-5 sm:w-5" aria-hidden="true" />
            {isTrading ? 'Processing...' :
             !tokenDetails ? 'Loading Token...' :
             !tokenDetails.tokenSymbol ? 'Select a Token' :
             `Buy ${tokenDetails.tokenSymbol}`}
          </Button>
          <div id="buy-button-help" className="sr-only">
            {(!selectedSolAmount && !customSolAmount) 
              ? 'Select or enter an amount to enable buying'
              : `This will purchase ${tokenDetails?.tokenSymbol || 'tokens'} at the current market price`
            }
          </div>
        </TabsContent>

        <TabsContent value="sell" className="space-y-4 mt-4">
          {!tokenHolding || parseFloat(tokenHolding.qty || '0') <= 0 ? (
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
              <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
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
                  {formatTokenQuantity(tokenHolding.qty)} {tokenDetails?.tokenSymbol || 'tokens'}
                </div>
                <div className={`text-sm ${parseFloat(tokenHolding.unrealizedUsd) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <div>{formatUSD(parseFloat(tokenHolding.unrealizedUsd))}</div>
                  {solPrice > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {formatSolEquivalent(Math.abs(parseFloat(tokenHolding.unrealizedUsd)), solPrice)}
                    </div>
                  )}
                  <div>({parseFloat(tokenHolding.unrealizedPercent).toFixed(2)}%)</div>
                </div>
              </div>
              <div className="space-y-4">
                <Label className="text-sm font-bold">Amount (% of holdings)</Label>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {sellPercentages.map((percent) => (
                    <Button
                      key={percent}
                      variant={selectedPercentage === percent ? "default" : "outline"}
                      className={cn(
                        "h-14 sm:h-12 font-mono text-lg sm:text-base transition-all active:scale-95",
                        selectedPercentage === percent
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 ring-2 ring-destructive ring-offset-2"
                          : "bg-card hover:bg-muted"
                      )}
                      onClick={() => {
                        setSelectedPercentage(percent)
                        setCustomSellPercentage("")
                      }}
                    >
                      {percent === 100 ? "ALL" : `${percent}%`}
                    </Button>
                  ))}
                </div>

                {/* Custom Percentage Slider */}
                <div className="pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs text-muted-foreground">Custom Percentage</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={customSellPercentage}
                        onChange={(e) => {
                          const val = e.target.value
                          setCustomSellPercentage(val)
                          if (val && !isNaN(parseFloat(val))) {
                            setSelectedPercentage(Math.min(100, Math.max(0, parseFloat(val))))
                          }
                        }}
                        placeholder="0"
                        className="w-16 h-8 text-xs text-center font-mono"
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  </div>
                  <Slider
                    value={[selectedPercentage || 0]}
                    onValueChange={(value) => {
                      setSelectedPercentage(value[0])
                      setCustomSellPercentage(value[0].toString())
                    }}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0%</span>
                    <span className="font-semibold">
                      {selectedPercentage || 0}% = {formatTokenQuantity((tokenBalance * (selectedPercentage || 0)) / 100)} tokens
                    </span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="sell-amount" className="text-sm font-bold">Selling ({tokenDetails.tokenSymbol})</Label>
                <Input
                  id="sell-amount"
                  type="text"
                  value={selectedPercentage ? formatTokenQuantity((tokenBalance * selectedPercentage) / 100) : ""}
                  readOnly
                  className="font-mono bg-muted"
                  aria-label={`Tokens to sell: ${selectedPercentage ? formatTokenQuantity((tokenBalance * selectedPercentage) / 100) : "0"} ${tokenDetails.tokenSymbol}`}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="receive-sol" className="text-sm font-bold">You'll receive (SOL)</Label>
                <Input
                  id="receive-sol"
                  type="text"
                  value={selectedPercentage && solPrice > 0 ? (((tokenBalance * selectedPercentage) / 100) * currentPrice / solPrice).toFixed(6) : ""}
                  readOnly
                  className="font-mono bg-muted"
                  aria-label={`SOL you will receive: ${selectedPercentage && solPrice > 0 ? (((tokenBalance * selectedPercentage) / 100) * currentPrice / solPrice).toFixed(6) : "0"} SOL`}
                />
              </div>

              <div className="space-y-3 rounded-lg bg-muted/20 p-4 text-sm border border-border/50" role="region" aria-label="Token selling information">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-mono" aria-label={`Current price: ${formatPriceUSD(currentPrice).replace('$', '')} dollars`}>{formatPriceUSD(currentPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Holdings</span>
                  <span className="font-mono" aria-label={`Total holdings: ${formatTokenQuantity(tokenBalance)} ${tokenDetails.tokenSymbol}`}>{formatTokenQuantity(tokenBalance)} {tokenDetails.tokenSymbol}</span>
                </div>
                {tokenHolding && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Cost</span>
                    <span className="font-mono" aria-label={`Average cost: ${formatPriceUSD(parseFloat(tokenHolding.avgCostUsd)).replace('$', '')} dollars`}>{formatPriceUSD(parseFloat(tokenHolding.avgCostUsd))}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full btn-sell h-16 sm:h-14 text-xl sm:text-lg font-bold active:scale-[0.98] transition-transform"
                size="lg"
                onClick={() => handleTrade('sell')}
                disabled={
                  isTrading ||
                  isRefreshing ||
                  !selectedPercentage ||
                  !tokenDetails?.tokenSymbol
                }
                aria-label={
                  isTrading ? 'Processing sell order' :
                  !tokenDetails ? 'Loading token information' :
                  !tokenDetails.tokenSymbol ? 'Select a token to trade' :
                  !selectedPercentage ? 'Select percentage to sell' :
                  `Sell ${selectedPercentage}% of ${tokenDetails.tokenSymbol} for ${((tokenBalance * selectedPercentage) / 100 * currentPrice).toFixed(6)} SOL`
                }
                aria-describedby="sell-button-help"
              >
                <TrendingDown className="mr-2 h-6 w-6 sm:h-5 sm:w-5" aria-hidden="true" />
                {isTrading ? 'Processing...' :
                 !tokenDetails ? 'Loading Token...' :
                 !tokenDetails.tokenSymbol ? 'Select a Token' :
                 `Sell ${tokenDetails.tokenSymbol}`}
              </Button>
              <div id="sell-button-help" className="sr-only">
                {!selectedPercentage 
                  ? 'Select a percentage of your holdings to sell'
                  : `This will sell ${selectedPercentage}% of your ${tokenDetails?.tokenSymbol || 'tokens'} at the current market price`
                }
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Screen reader announcements for trading actions */}
      <ScreenReaderAnnouncements 
        politeMessage={announcement}
        urgentMessage={urgentAnnouncement}
      />
      </div>
    </div>
  )
}

export const TradingPanel = memo(TradingPanelComponent)
