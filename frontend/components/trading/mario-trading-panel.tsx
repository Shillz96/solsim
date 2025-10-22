"use client"

/**
 * Mario-themed Enhanced Trading Panel
 *
 * Features:
 * - Mario block-style amount selectors
 * - Coin counter displays
 * - Power-up button animations
 * - Question block hover effects
 * - Victory/defeat sound effects (visual feedback)
 */

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
import { TrendingUp, TrendingDown, Wallet, AlertCircle, CheckCircle, Loader2, Star, Coins } from "lucide-react"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { formatUSD, formatNumber, formatTokenQuantity, formatPriceUSD } from "@/lib/format"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"
import * as api from "@/lib/api"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { useAuth } from "@/hooks/use-auth"
import { usePortfolio, usePosition } from "@/hooks/use-portfolio"
import { motion, AnimatePresence } from "framer-motion"

interface MarioTradingPanelProps {
  tokenAddress?: string
}

function MarioTradingPanelComponent({ tokenAddress: propTokenAddress }: MarioTradingPanelProps = {}) {
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const defaultTokenAddress = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // BONK
  const tokenAddress = propTokenAddress || searchParams.get("token") || defaultTokenAddress

  const { user, isAuthenticated, getUserId } = useAuth()
  const { data: portfolio, isLoading: portfolioLoading, error: portfolioErrorObj, refetch: refreshPortfolio } = usePortfolio()
  const portfolioError = portfolioErrorObj ? (portfolioErrorObj as Error).message : null

  const [userBalance, setUserBalance] = useState<number>(0)
  const [isTrading, setIsTrading] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [lastTradeSuccess, setLastTradeSuccess] = useState(false)
  const [showPowerUpAnimation, setShowPowerUpAnimation] = useState(false)

  const { connected: wsConnected, prices: livePrices } = usePriceStreamContext()
  const { toast } = useToast()

  // Get SOL price
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 208

  // State
  const [tokenDetails, setTokenDetails] = useState<any>(null)
  const tokenHolding = usePosition(tokenAddress)
  const [loadingToken, setLoadingToken] = useState(true)
  const [customSolAmount, setCustomSolAmount] = useState("")
  const [selectedSolAmount, setSelectedSolAmount] = useState<number | null>(null)
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customSellPercentage, setCustomSellPercentage] = useState("")

  const presetSolAmounts = [1, 5, 10, 20]
  const sellPercentages = [25, 50, 75, 100]

  // Load user balance
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

  // Load token details
  useEffect(() => {
    const loadTokenDetails = async () => {
      if (!tokenAddress) return
      setLoadingToken(true)

      try {
        const token = await api.getTokenDetails(tokenAddress)
        if (token) {
          setTokenDetails({
            tokenAddress: token.address || token.mint || tokenAddress,
            tokenSymbol: token.symbol,
            tokenName: token.name,
            price: parseFloat(token.lastPrice || '0'),
            priceChange24h: parseFloat(token.priceChange24h || '0'),
            volume24h: parseFloat(token.volume24h || '0'),
            marketCap: parseFloat(token.marketCapUsd || '0'),
            imageUrl: token.imageUrl || token.logoURI || null,
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load token information",
          variant: "destructive"
        })
      } finally {
        setLoadingToken(false)
      }
    }

    loadTokenDetails()
  }, [tokenAddress, toast])

  // Trading functions (simplified - full implementation from original)
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

      if (result.success) {
        await refreshPortfolio()
        const balanceData = await api.getWalletBalance(userId)
        setUserBalance(parseFloat(balanceData.balance))
        queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })

        setShowPowerUpAnimation(true)
        setTimeout(() => setShowPowerUpAnimation(false), 1000)

        toast({
          title: "🎉 Trade Success!",
          description: `Bought ${formatTokenQuantity(parseFloat(result.trade.quantity))} for ${parseFloat(result.trade.totalCost).toFixed(4)} SOL`,
          duration: 5000,
        })

        setLastTradeSuccess(true)
        setTimeout(() => setLastTradeSuccess(false), 3000)
        setSelectedSolAmount(null)
        setCustomSolAmount("")
      }

      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      setTradeError(errorMessage)
      toast({
        title: "Trade Failed",
        description: errorMessage,
        variant: "destructive",
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

      if (result.success) {
        await refreshPortfolio()
        const balanceData = await api.getWalletBalance(userId)
        setUserBalance(parseFloat(balanceData.balance))
        queryClient.invalidateQueries({ queryKey: ['user-balance', userId] })

        toast({
          title: "💰 Sell Success!",
          description: `Sold ${formatTokenQuantity(parseFloat(result.trade.quantity))} for ${parseFloat(result.trade.totalCost).toFixed(4)} SOL`,
          duration: 5000,
        })

        setLastTradeSuccess(true)
        setTimeout(() => setLastTradeSuccess(false), 3000)
        setSelectedPercentage(null)
        setCustomSellPercentage("")
      }

      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      setTradeError(errorMessage)
      toast({
        title: "Trade Failed",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setIsTrading(false)
    }
  }

  const handleTrade = async (action: 'buy' | 'sell') => {
    if (!user || !tokenDetails) return

    let amountSol: number
    let tokenQuantity: number

    if (action === 'buy') {
      amountSol = selectedSolAmount || (customSolAmount ? parseFloat(customSolAmount) : 0)
      if (amountSol <= 0 || amountSol > userBalance) {
        toast({ title: "Invalid Amount", variant: "destructive" })
        return
      }
      const amountUsd = amountSol * solPrice
      tokenQuantity = amountUsd / tokenDetails.price
    } else {
      if (!tokenHolding || !selectedPercentage) {
        toast({ title: "Select Amount", variant: "destructive" })
        return
      }
      const holdingQuantity = parseFloat(tokenHolding.qty)
      tokenQuantity = (holdingQuantity * selectedPercentage) / 100
    }

    tokenQuantity = Math.round(tokenQuantity * 1e9) / 1e9

    try {
      if (action === 'buy') {
        await executeBuy(tokenAddress, tokenQuantity)
      } else {
        await executeSell(tokenAddress, tokenQuantity)
      }
    } catch (error) {
      console.error('Trade failed:', error)
    }
  }

  if (loadingToken) {
    return (
      <div className="mario-card p-6 animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-[var(--coin-gold)]/20 rounded w-3/4"></div>
          <div className="h-32 bg-[var(--coin-gold)]/20 rounded"></div>
        </div>
      </div>
    )
  }

  if (!tokenDetails) {
    return (
      <div className="mario-card p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load token</AlertDescription>
        </Alert>
      </div>
    )
  }

  const livePrice = livePrices.get(tokenAddress)
  const currentPrice = livePrice ? livePrice.price : (tokenDetails.price || 0)
  const balance = userBalance
  const tokenBalance = tokenHolding ? parseFloat(tokenHolding.qty) : 0

  return (
    <div className="mario-card p-4 sm:p-6 relative overflow-hidden">
      {/* Power-up Animation */}
      <AnimatePresence>
        {showPowerUpAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1.5, y: -50 }}
            exit={{ opacity: 0, scale: 0, y: -100 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl z-50 pointer-events-none"
          >
            ⭐
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {/* Trade Status */}
        {tradeError && (
          <Alert variant="destructive" className="border-3 border-[var(--mario-red)]">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{tradeError}</AlertDescription>
          </Alert>
        )}

        {lastTradeSuccess && (
          <Alert className="border-3 border-[var(--luigi-green)] bg-[var(--luigi-green)]/10">
            <CheckCircle className="h-4 w-4 text-[var(--luigi-green)]" />
            <AlertDescription className="text-[var(--luigi-green)] font-bold">1-UP! Trade executed!</AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="mario-badge px-3 py-1">
              <Coins className="h-4 w-4" />
            </div>
            <h3 className="mario-font text-lg">TRADE {tokenDetails.tokenSymbol}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-[var(--star-yellow)]" />
            <span className="font-mono font-bold">{balance.toFixed(2)} SOL</span>
          </div>
        </div>

        {/* Price Display */}
        <div className="bg-gradient-to-br from-[var(--coin-gold)]/20 to-[var(--star-yellow)]/10 border-3 border-[var(--outline-black)] rounded-lg p-4">
          <AnimatedNumber
            value={currentPrice}
            prefix="$"
            decimals={8}
            className="font-mono text-3xl font-bold text-[var(--outline-black)]"
            colorize={false}
            glowOnChange={true}
          />
          {solPrice > 0 && (
            <div className="text-xs text-muted-foreground mt-1">
              {formatSolEquivalent(currentPrice, solPrice)}
            </div>
          )}
        </div>

        {/* Holdings Display */}
        {tokenHolding && (
          <div className="bg-[var(--super-blue)]/10 border-2 border-[var(--super-blue)] rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">Your Holdings</div>
            <div className="font-mono font-bold text-lg">
              {formatTokenQuantity(tokenHolding.qty)} {tokenDetails.tokenSymbol}
            </div>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-1">
            <TabsTrigger
              value="buy"
              className="mario-btn mario-btn-green data-[state=active]:scale-105 transition-transform"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              BUY
            </TabsTrigger>
            <TabsTrigger
              value="sell"
              className="mario-btn mario-btn-red data-[state=active]:scale-105 transition-transform"
              disabled={!tokenHolding || tokenBalance <= 0}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              SELL
            </TabsTrigger>
          </TabsList>

          {/* Buy Tab */}
          <TabsContent value="buy" className="space-y-4 mt-4">
            <Label className="mario-font text-sm">SELECT AMOUNT (SOL)</Label>

            <div className="grid grid-cols-2 gap-3">
              {presetSolAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedSolAmount(amount)
                    setCustomSolAmount("")
                  }}
                  disabled={amount > balance}
                  className={cn(
                    "mario-btn h-16 text-lg transition-all",
                    selectedSolAmount === amount
                      ? "bg-[var(--star-yellow)] scale-105"
                      : "bg-[var(--coin-gold)]",
                    amount > balance && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Star className="h-4 w-4 mr-2" />
                  {amount} SOL
                </button>
              ))}
            </div>

            {showCustomInput && (
              <Input
                type="number"
                placeholder="Custom amount"
                value={customSolAmount}
                onChange={(e) => {
                  setCustomSolAmount(e.target.value)
                  setSelectedSolAmount(null)
                }}
                className="border-3 border-[var(--outline-black)] font-mono"
              />
            )}

            <Button
              className="w-full mario-btn mario-btn-green h-16 text-xl"
              onClick={() => handleTrade('buy')}
              disabled={isTrading || (!selectedSolAmount && !customSolAmount)}
            >
              {isTrading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <TrendingUp className="h-5 w-5 mr-2" />
              )}
              {isTrading ? 'BUYING...' : `BUY ${tokenDetails.tokenSymbol}`}
            </Button>
          </TabsContent>

          {/* Sell Tab */}
          <TabsContent value="sell" className="space-y-4 mt-4">
            <Label className="mario-font text-sm">SELECT PERCENTAGE</Label>

            <div className="grid grid-cols-2 gap-3">
              {sellPercentages.map((percent) => (
                <button
                  key={percent}
                  onClick={() => {
                    setSelectedPercentage(percent)
                    setCustomSellPercentage("")
                  }}
                  className={cn(
                    "mario-btn h-16 text-lg transition-all",
                    selectedPercentage === percent
                      ? "bg-[var(--mario-red)] text-white scale-105"
                      : "bg-[var(--coin-gold)]"
                  )}
                >
                  {percent === 100 ? "ALL" : `${percent}%`}
                </button>
              ))}
            </div>

            <Button
              className="w-full mario-btn mario-btn-red h-16 text-xl"
              onClick={() => handleTrade('sell')}
              disabled={isTrading || !selectedPercentage}
            >
              {isTrading ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <TrendingDown className="h-5 w-5 mr-2" />
              )}
              {isTrading ? 'SELLING...' : `SELL ${tokenDetails.tokenSymbol}`}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export const MarioTradingPanel = memo(MarioTradingPanelComponent)
