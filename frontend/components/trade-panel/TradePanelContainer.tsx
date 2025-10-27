/**
 * Trade Panel Container
 * Main orchestrating component for the refactored trade panel
 */

"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, marioStyles } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { usePriceStreamContext } from '@/lib/price-stream-provider'
import { useToast } from '@/hooks/use-toast'
import * as api from '@/lib/api'

// Import hooks
import { useTradePanelState } from './hooks/useTradePanelState'
import { useTradeExecution } from './hooks/useTradeExecution'
import { usePositionPnL } from './hooks/usePositionPnL'

// Import components
import { TradePanelHeader } from './TradePanelHeader'
import { TradePanelPrice } from './TradePanelPrice'
import { TradePanelStatsBar } from './TradePanelStatsBar'
import { TradePanelBuyTab } from './TradePanelBuyTab'
import { TradePanelSellTab } from './TradePanelSellTab'

// Import utilities
import { 
  calculateBuyEstimate, 
  calculateSellQuantity,
  calculateSellEstimate, 
  roundTokenQuantity,
  validateBuyAmount,
  validateSellPercentage 
} from './utils/calculations'
import type { TokenDetails } from './types'


interface TradePanelContainerProps {
  tokenAddress?: string
  volume24h?: number
  holders?: number
  userRank?: number | null
}

export function TradePanelContainer({
  tokenAddress: propTokenAddress,
  volume24h,
  holders,
  userRank
}: TradePanelContainerProps = {}) {
  const searchParams = useSearchParams()
  const defaultTokenAddress = "GLsuNSkEAwKPFDCEGoHkceNbHCqu981rCwhS3VXcpump" // pump.fun token
  const tokenAddress = propTokenAddress || searchParams.get("token") || defaultTokenAddress

  const { user, isAuthenticated, getUserId } = useAuth()
  const { toast } = useToast()
  const { prices: livePrices, subscribe, unsubscribe } = usePriceStreamContext()

  // Custom hooks
  const tradePanelState = useTradePanelState()
  const { executeBuy, executeSell, addOptimisticTrade, isExecuting } = useTradeExecution()

  // Fetch token trading stats (bought/sold/position data)
  // NO polling - only refetch after trades complete for true real-time PnL
  const { data: tokenStats, refetch: refetchStats } = useQuery({
    queryKey: ['token-stats', user?.id, tokenAddress],
    queryFn: () => {
      if (!user?.id || !tokenAddress) return null
      return api.getTokenTradingStats(user.id, tokenAddress, 'PAPER')
    },
    enabled: !!user?.id && !!tokenAddress,
    staleTime: 10000, // 10 seconds
    refetchOnWindowFocus: false, // Don't refetch on focus
    // NO refetchInterval - we calculate PnL in real-time using WebSocket prices
  })

  // Local state
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null)
  const [loadingToken, setLoadingToken] = useState(true)
  const [userBalance, setUserBalance] = useState<number>(0)
  const [showPowerUpAnimation, setShowPowerUpAnimation] = useState(false)

  // Get SOL price
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 208

  // Get LIVE price from WebSocket for real-time PnL
  // Priority: 1. Live WebSocket price, 2. Token details price (fallback)
  const livePrice = livePrices.get(tokenAddress)?.price || tokenDetails?.price || 0

  // Calculate REAL-TIME PnL using live price + position data
  const qty = tokenStats ? parseFloat(tokenStats.currentHoldingQty) : 0
  const costBasis = tokenStats ? parseFloat(tokenStats.costBasis) : 0
  const currentValue = qty * livePrice
  const realtimeUnrealizedPnL = currentValue - costBasis
  const realtimePnLPercent = costBasis > 0 ? (realtimeUnrealizedPnL / costBasis) * 100 : 0
  const hasPosition = qty > 0

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
        console.error('Failed to load token details:', error)
      } finally {
        setLoadingToken(false)
      }
    }

    loadTokenDetails()
  }, [tokenAddress])

  // Ensure live price subscription for the active token
  useEffect(() => {
    if (!tokenAddress) return
    subscribe(tokenAddress)
    return () => {
      unsubscribe(tokenAddress)
    }
  }, [tokenAddress, subscribe, unsubscribe])

  // Handle buy trade
  const handleBuy = useCallback(async () => {
    if (!user || !tokenDetails) return

    const solAmount = tradePanelState.selectedSolAmount || parseFloat(tradePanelState.customSolAmount) || 0
    
    // Validate
    const validation = validateBuyAmount(solAmount, userBalance)
    if (!validation.valid) {
      toast({ title: validation.error, variant: "destructive" })
      return
    }

    // Use live WebSocket price for accurate trade execution
    const effectivePrice = livePrice

    // Validate price is available
    if (effectivePrice <= 0) {
      toast({
        title: "Price unavailable",
        description: "Unable to determine token price. Please try again.",
        variant: "destructive"
      })
      return
    }

    // Calculate token quantity
    const estimate = calculateBuyEstimate(solAmount, solPrice, effectivePrice)
    const tokenQuantity = roundTokenQuantity(estimate.tokenQuantity)

    // Set trading state
    tradePanelState.setTradingState(true)
    tradePanelState.setTradeErrorState(null)

    // Add optimistic update
    addOptimisticTrade(tokenAddress, 'BUY', tokenQuantity, effectivePrice)

    try {
      await executeBuy(
        tokenAddress,
        tokenQuantity,
        solAmount, // Pass solAmount for optimistic balance update
        () => {
          // Success callback
          tradePanelState.setTradeSuccessState(true)
          tradePanelState.resetBuySelection()
          setShowPowerUpAnimation(true)
          setTimeout(() => setShowPowerUpAnimation(false), 1000)

          // Reload balance and stats for real-time PnL update
          api.getWalletBalance(user.id).then(data => {
            setUserBalance(parseFloat(data.balance))
          })
          refetchStats() // Refetch position data after trade
        },

        (error) => {
          // Error callback
          tradePanelState.setTradeErrorState(error)
        }
      )
    } catch (error) {
      // Error already handled by executeBuy
    } finally {
      tradePanelState.setTradingState(false)
    }
  }, [
    user,
    tokenDetails,
    tradePanelState,
    userBalance,
    solPrice,
    livePrice,
    tokenAddress,
    addOptimisticTrade,
    executeBuy,
    refetchStats,
    toast
  ])

  // Handle sell trade
  const handleSell = useCallback(async () => {
    if (!user || !tokenDetails || !hasPosition) return

    const percentage = tradePanelState.selectedPercentage
    if (!percentage) return

    // Validate
    const validation = validateSellPercentage(percentage, hasPosition)
    if (!validation.valid) {
      toast({ title: validation.error, variant: "destructive" })
      return
    }

    // Use live WebSocket price for accurate trade execution
    const effectivePrice = livePrice

    // Validate price is available
    if (effectivePrice <= 0) {
      toast({
        title: "Price unavailable",
        description: "Unable to determine token price. Please try again.",
        variant: "destructive"
      })
      return
    }

    // Calculate token quantity using current position
    const tokenQuantity = roundTokenQuantity(calculateSellQuantity(qty, percentage))

    // Calculate expected SOL amount for optimistic update
    const sellEstimate = calculateSellEstimate(tokenQuantity, effectivePrice, solPrice)
    const expectedSolAmount = sellEstimate.solAmount

    // Set trading state
    tradePanelState.setTradingState(true)
    tradePanelState.setTradeErrorState(null)

    // Add optimistic update
    addOptimisticTrade(tokenAddress, 'SELL', tokenQuantity, effectivePrice)

    try {
      await executeSell(
        tokenAddress,
        tokenQuantity,
        expectedSolAmount, // Pass solAmount for optimistic balance update
        () => {
          // Success callback
          tradePanelState.setTradeSuccessState(true)
          tradePanelState.resetSellSelection()

          // Reload balance and stats for real-time PnL update
          api.getWalletBalance(user.id).then(data => {
            setUserBalance(parseFloat(data.balance))
          })
          refetchStats() // Refetch position data after trade
        },

        (error) => {
          // Error callback
          tradePanelState.setTradeErrorState(error)
        }
      )
    } catch (error) {
      // Error already handled by executeSell
    } finally {
      tradePanelState.setTradingState(false)
    }
  }, [
    user,
    tokenDetails,
    hasPosition,
    qty,
    tradePanelState,
    tokenAddress,
    livePrice,
    solPrice,
    addOptimisticTrade,
    executeSell,
    refetchStats,
    toast
  ])

  // Loading state
  if (loadingToken) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border-3 border-outline rounded-[14px] p-6 shadow-[3px_3px_0_var(--outline-black)] animate-pulse">
        <div className="space-y-4">
          <div className="h-6 bg-coin/20 rounded w-3/4"></div>
          <div className="h-32 bg-coin/20 rounded"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (!tokenDetails) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border-3 border-outline rounded-[14px] p-6 shadow-[3px_3px_0_var(--outline-black)]">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load token</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div id="trade-panel" className="flex flex-col w-full h-full relative">
      {/* Power-up Animation */}
      <AnimatePresence>
        {showPowerUpAnimation && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{ opacity: 1, scale: 1.5, y: -50 }}
            exit={{ opacity: 0, scale: 0, y: -100 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-5xl lg:text-6xl z-toast pointer-events-none"
          >
            ⭐
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content - Fills all available space */}
      <div className="flex flex-col h-full space-y-1.5">
          {/* Trade Status */}
          {(tradePanelState.tradeError || tradePanelState.lastTradeSuccess) && (
            <div className="mb-2">
              {tradePanelState.tradeError && (
                <Alert variant="destructive" className="border-2 border-mario py-2">
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-xs">{tradePanelState.tradeError}</AlertDescription>
                </Alert>
              )}

              {tradePanelState.lastTradeSuccess && (
                <Alert className="border-2 border-luigi bg-luigi/10 py-2">
                  <CheckCircle className="h-3 w-3 text-luigi" />
                  <AlertDescription className="font-bold text-luigi text-xs">
                    1-UP! Trade executed!
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Header */}
          <TradePanelHeader
            tokenSymbol={tokenDetails.tokenSymbol}
            balance={userBalance}
          />

          {/* Stats Bar - Bought | Sold | Holding | PnL */}
          <TradePanelStatsBar
            bought={tokenStats ? parseFloat(tokenStats.totalBoughtUsd) : 0}
            sold={tokenStats ? parseFloat(tokenStats.totalSoldUsd) : 0}
            holdingValue={currentValue}
            pnl={realtimeUnrealizedPnL}
            pnlPercent={realtimePnLPercent}
          />

          {/* Price Display */}
          <TradePanelPrice
            currentPrice={livePrice}
            solPrice={solPrice}
          />

          {/* Trading Tabs */}
          <Tabs defaultValue="buy" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger
                value="buy"
                className="flex-1 data-[state=active]:bg-luigi"
              >
                <TrendingUp className="h-4 w-4 mr-1.5" />
                Buy
              </TabsTrigger>
              <TabsTrigger
                value="sell"
                className="flex-1 data-[state=active]:bg-mario"
                disabled={!hasPosition}
              >
                <TrendingDown className="h-4 w-4 mr-1.5" />
                Sell
              </TabsTrigger>
            </TabsList>

            {/* Buy Tab */}
            <TabsContent value="buy">
              <TradePanelBuyTab
                buyPresets={tradePanelState.buyPresets}
                onUpdatePreset={tradePanelState.updateBuyPreset}
                selectedSolAmount={tradePanelState.selectedSolAmount}
                customSolAmount={tradePanelState.customSolAmount}
                showCustomInput={tradePanelState.showCustomInput}
                onSelectAmount={tradePanelState.selectBuyAmount}
                onCustomAmountChange={tradePanelState.setCustomBuyAmount}
                onToggleCustomInput={tradePanelState.setShowCustomInput}
                onBuy={handleBuy}
                isTrading={tradePanelState.isTrading}
                tokenSymbol={tokenDetails.tokenSymbol}
                currentPrice={livePrice}
                solPrice={solPrice}
                balance={userBalance}
                tokenAddress={tokenAddress}
                volume24h={volume24h}
                holders={holders}
                userRank={userRank}
              />
            </TabsContent>

            {/* Sell Tab */}
            <TabsContent value="sell">
              <TradePanelSellTab
                sellPresets={tradePanelState.sellPresets}
                selectedPercentage={tradePanelState.selectedPercentage}
                onSelectPercentage={tradePanelState.selectSellPercentage}
                onSell={handleSell}
                isTrading={tradePanelState.isTrading}
                tokenSymbol={tokenDetails.tokenSymbol}
                holdingQty={qty}
                currentPrice={livePrice}
                solPrice={solPrice}
                hasPosition={hasPosition}
                tokenAddress={tokenAddress}
                volume24h={volume24h}
                holders={holders}
                userRank={userRank}
              />
            </TabsContent>
          </Tabs>
        </div>
    </div>
  )
}
