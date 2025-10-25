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
import { useTradingMode } from "@/lib/trading-mode-context"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { formatUSD, formatNumber, formatTokenQuantity, formatPriceUSD } from "@/lib/format"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"
import * as api from "@/lib/api"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { useAuth } from "@/hooks/use-auth"
import { usePortfolio, usePosition } from "@/hooks/use-portfolio"
import { motion, AnimatePresence } from "framer-motion"
// New advanced trading components
import { PositionStatsBox } from "./position-stats-box"
import { FeeDisplay } from "./fee-display"
import { EditablePresetButton } from "./editable-preset-button"

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

  const { activeBalance, refreshBalances, tradeMode } = useTradingMode()

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

  // Editable presets (load from localStorage)
  const [presetSolAmounts, setPresetSolAmounts] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mario-buy-preset-amounts')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          // Invalid saved data, use defaults
        }
      }
    }
    return [1, 5, 10, 20] // Default presets
  })

  const sellPercentages = [25, 50, 75, 100]

  // Save preset amounts to localStorage when they change
  const updatePresetAmount = (index: number, newValue: number) => {
    const newPresets = [...presetSolAmounts]
    newPresets[index] = newValue
    setPresetSolAmounts(newPresets)
    localStorage.setItem('mario-buy-preset-amounts', JSON.stringify(newPresets))
  }

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

    // Paper trading logic
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
    <div id="trade-panel" className="mario-card p-2 sm:p-3 lg:p-4 relative w-full border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] bg-gradient-to-br from-white to-amber-50/30">
      {/* Position Stats Box */}
      <PositionStatsBox
        tokenAddress={tokenAddress}
        tradeMode={tradeMode}
        className="mb-3"
      />

      {/* Power-up Animation */}
      <AnimatePresence>
        {showPowerUpAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1.5, y: -50 }}
            exit={{ opacity: 0, scale: 0, y: -100 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-5xl lg:text-6xl z-50 pointer-events-none"
          >
            ⭐
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2 sm:space-y-3">
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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <h3 className="mario-font text-xs sm:text-sm lg:text-base">TRADE {tokenDetails.tokenSymbol}</h3>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Wallet className="h-3 w-3 text-[var(--star-yellow)]" />
            <span className="font-mono font-bold">{balance.toFixed(2)} SOL</span>
          </div>
        </div>

        {/* Price Display - Enhanced Mario Theme */}
        <div className="bg-gradient-to-br from-[var(--star-yellow)] to-amber-300 border-4 border-[var(--outline-black)] rounded-[14px] p-3 shadow-[3px_3px_0_var(--outline-black)] relative overflow-hidden">
          {/* Coin decoration */}
          <div className="absolute top-1 right-1 text-2xl opacity-20">⭐</div>
          <div className="text-[9px] sm:text-[10px] font-mario font-bold text-[var(--outline-black)]/80 uppercase mb-1">
            Current Price
          </div>
          <AnimatedNumber
            value={currentPrice}
            prefix="$"
            decimals={8}
            className="font-mono text-sm sm:text-lg lg:text-xl font-bold text-[var(--outline-black)] break-all relative z-10"
            colorize={false}
            glowOnChange={true}
          />
          {solPrice > 0 && (
            <div className="text-[10px] sm:text-xs font-bold text-[var(--outline-black)]/60 mt-1">
              {formatSolEquivalent(currentPrice, solPrice)}
            </div>
          )}
        </div>

        {/* Holdings Display - Mario theme */}
        {tokenHolding && (
          <div className="bg-[var(--star-yellow)]/20 border-3 border-[var(--star-yellow)] rounded-lg p-2 shadow-[2px_2px_0_var(--outline-black)]">
            <div className="text-[10px] sm:text-xs text-[var(--outline-black)]/70 font-bold mb-0.5">Holdings</div>
            <div className="font-mono font-bold text-sm sm:text-base text-[var(--outline-black)] break-words">
              {formatTokenQuantity(tokenHolding.qty)} {tokenDetails.tokenSymbol}
            </div>
          </div>
        )}

        {/* Tabs - Ensure proper sizing on mobile */}
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-1">
            <TabsTrigger
              value="buy"
              className="mario-btn mario-btn-green data-[state=active]:scale-105 transition-transform text-xs sm:text-sm"
            >
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              BUY
            </TabsTrigger>
            <TabsTrigger
              value="sell"
              className="mario-btn mario-btn-red data-[state=active]:scale-105 transition-transform text-xs sm:text-sm"
              disabled={!tokenHolding || tokenBalance <= 0}
            >
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              SELL
            </TabsTrigger>
          </TabsList>

          {/* Buy Tab */}
          <TabsContent value="buy" className="space-y-2 mt-2">
            <Label className="mario-font text-[10px] sm:text-xs whitespace-nowrap">SELECT AMOUNT (SOL)</Label>

            {/* Estimated Tokens Display */}
            {(selectedSolAmount || customSolAmount) && currentPrice > 0 && solPrice > 0 && (
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 border-3 border-[var(--luigi-green)] rounded-lg p-2 shadow-[2px_2px_0_var(--outline-black)]">
                <div className="text-[9px] font-mario font-bold text-[var(--outline-black)]/70 uppercase mb-0.5">
                  You'll Receive
                </div>
                <div className="font-mono font-bold text-sm text-[var(--luigi-green)]">
                  ~{formatTokenQuantity(
                    ((selectedSolAmount || parseFloat(customSolAmount) || 0) * solPrice) / currentPrice
                  )} {tokenDetails.tokenSymbol}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {presetSolAmounts.map((amount, index) => (
                <EditablePresetButton
                  key={index}
                  value={amount}
                  index={index}
                  selected={selectedSolAmount === amount}
                  disabled={amount > balance}
                  maxValue={balance}
                  onSelect={(value) => {
                    setSelectedSolAmount(value)
                    setCustomSolAmount("")
                  }}
                  onUpdate={updatePresetAmount}
                  className="h-8 sm:h-10 lg:h-12"
                />
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

            {/* Fee Display for Buy */}
            <FeeDisplay
              solAmount={selectedSolAmount || parseFloat(customSolAmount) || 0}
              solPrice={solPrice}
              variant="buy"
              className="mb-2"
            />

            <Button
              className="w-full mario-btn mario-btn-green h-10 sm:h-11 lg:h-12 text-xs sm:text-sm whitespace-nowrap overflow-hidden"
              onClick={() => handleTrade('buy')}
              disabled={isTrading || (!selectedSolAmount && !customSolAmount)}
            >
              {isTrading ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 flex-shrink-0" />
                  <span className="truncate">BUYING...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">BUY {tokenDetails.tokenSymbol}</span>
                </>
              )}
            </Button>
          </TabsContent>

          {/* Sell Tab */}
          <TabsContent value="sell" className="space-y-2 mt-2">
            <Label className="mario-font text-[10px] sm:text-xs whitespace-nowrap">SELECT PERCENTAGE</Label>

            {/* Estimated SOL Display */}
            {tokenHolding && selectedPercentage && currentPrice > 0 && solPrice > 0 && (
              <div className="bg-gradient-to-br from-red-100 to-pink-100 border-3 border-[var(--mario-red)] rounded-lg p-2 shadow-[2px_2px_0_var(--outline-black)]">
                <div className="text-[9px] font-mario font-bold text-[var(--outline-black)]/70 uppercase mb-0.5">
                  You'll Receive
                </div>
                <div className="font-mono font-bold text-sm text-[var(--mario-red)]">
                  ~{((parseFloat(tokenHolding.qty) * selectedPercentage / 100 * currentPrice) / solPrice).toFixed(4)} SOL
                </div>
                <div className="text-[9px] font-bold text-[var(--outline-black)]/60">
                  ({formatTokenQuantity(parseFloat(tokenHolding.qty) * selectedPercentage / 100)} {tokenDetails.tokenSymbol})
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {sellPercentages.map((percent) => (
                <button
                  key={percent}
                  onClick={() => {
                    setSelectedPercentage(percent)
                    setCustomSellPercentage("")
                  }}
                  className={cn(
                    "mario-btn h-8 sm:h-10 lg:h-12 text-xs sm:text-sm transition-all flex items-center justify-center whitespace-nowrap px-2",
                    selectedPercentage === percent
                      ? "bg-[var(--mario-red)] text-white scale-105"
                      : "bg-[var(--coin-gold)]"
                  )}
                >
                  {percent === 100 ? "ALL" : `${percent}%`}
                </button>
              ))}
            </div>

            {/* Fee Display for Sell */}
            {tokenHolding && selectedPercentage && (
              <FeeDisplay
                solAmount={
                  (parseFloat(tokenHolding.qty) * selectedPercentage / 100 * tokenDetails.price) / solPrice
                }
                solPrice={solPrice}
                variant="sell"
                className="mb-2"
              />
            )}

            <Button
              className="w-full mario-btn mario-btn-red h-10 sm:h-11 lg:h-12 text-xs sm:text-sm whitespace-nowrap overflow-hidden"
              onClick={() => handleTrade('sell')}
              disabled={isTrading || !selectedPercentage}
            >
              {isTrading ? (
                <>
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1 flex-shrink-0" />
                  <span className="truncate">SELLING...</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                  <span className="truncate">SELL {tokenDetails.tokenSymbol}</span>
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </div>

    </div>
  )
}

export const MarioTradingPanel = memo(MarioTradingPanelComponent)
