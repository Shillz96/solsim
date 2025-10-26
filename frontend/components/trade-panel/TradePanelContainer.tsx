/**
 * Trade Panel Container
 * Main orchestrating component for the refactored trade panel
 */

"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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
import { TradePanelPosition } from './TradePanelPosition'
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
}

export function TradePanelContainer({ tokenAddress: propTokenAddress }: TradePanelContainerProps = {}) {
  const searchParams = useSearchParams()
  const defaultTokenAddress = "GLsuNSkEAwKPFDCEGoHkceNbHCqu981rCwhS3VXcpump" // pump.fun token
  const tokenAddress = propTokenAddress || searchParams.get("token") || defaultTokenAddress

  const { user, isAuthenticated, getUserId } = useAuth()
  const { toast } = useToast()
  const { prices: livePrices } = usePriceStreamContext()

  // Custom hooks
  const tradePanelState = useTradePanelState()
  const { executeBuy, executeSell, addOptimisticTrade, isExecuting } = useTradeExecution()
  const { position, pnl, currentPrice, hasPosition } = usePositionPnL(tokenAddress)

  // Local state
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null)
  const [loadingToken, setLoadingToken] = useState(true)
  const [userBalance, setUserBalance] = useState<number>(0)
  const [showPowerUpAnimation, setShowPowerUpAnimation] = useState(false)

  // Get SOL price
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 208

  // Use live price if available, fallback to token details price for calculations
  const effectivePrice = currentPrice > 0 ? currentPrice : (tokenDetails?.price || 0)

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

    // Use live price if available, fallback to token details price
    const effectivePrice = currentPrice > 0 ? currentPrice : tokenDetails.price
    
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
          
          // Reload balance
          api.getWalletBalance(user.id).then(data => {
            setUserBalance(parseFloat(data.balance))
          })
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
    currentPrice, 
    tokenAddress,
    addOptimisticTrade,
    executeBuy,
    toast
  ])

  // Handle sell trade
  const handleSell = useCallback(async () => {
    if (!user || !tokenDetails || !position) return

    const percentage = tradePanelState.selectedPercentage
    if (!percentage) return

    // Validate
    const validation = validateSellPercentage(percentage, hasPosition)
    if (!validation.valid) {
      toast({ title: validation.error, variant: "destructive" })
      return
    }

    // Use live price if available, fallback to token details price
    const effectivePrice = currentPrice > 0 ? currentPrice : tokenDetails.price
    
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
    const holdingQty = parseFloat(position.qty)
    const tokenQuantity = roundTokenQuantity(calculateSellQuantity(holdingQty, percentage))

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
          
          // Reload balance
          api.getWalletBalance(user.id).then(data => {
            setUserBalance(parseFloat(data.balance))
          })
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
    position,
    tradePanelState,
    hasPosition,
    tokenAddress,
    currentPrice,
    addOptimisticTrade,
    executeSell,
    toast
  ])

  // Loading state
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

  // Error state
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

  return (
    <div id="trade-panel" className="flex flex-col w-full h-full relative">
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

      {/* Main Content - Fills all available space */}
      <div className="flex flex-col h-full space-y-2">
          {/* Trade Status */}
          {(tradePanelState.tradeError || tradePanelState.lastTradeSuccess) && (
            <div className="mb-2">
              {tradePanelState.tradeError && (
                <Alert variant="destructive" className={cn(marioStyles.border('sm'), 'border-[var(--mario-red)] py-2')}>
                  <AlertCircle className="h-3 w-3" />
                  <AlertDescription className="text-xs">{tradePanelState.tradeError}</AlertDescription>
                </Alert>
              )}

              {tradePanelState.lastTradeSuccess && (
                <Alert className={cn(
                  marioStyles.border('sm'),
                  'border-[var(--luigi-green)] bg-[var(--luigi-green)]/10 py-2'
                )}>
                  <CheckCircle className="h-3 w-3 text-[var(--luigi-green)]" />
                  <AlertDescription className={cn(marioStyles.bodyText('bold'), 'text-[var(--luigi-green)] text-xs')}>
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

          {/* Price Display */}
          <TradePanelPrice
            currentPrice={currentPrice}
            solPrice={solPrice}
          />

          {/* Position with Real-Time PnL */}
          <TradePanelPosition
            tokenSymbol={tokenDetails.tokenSymbol}
            position={position}
            pnl={pnl}
          />

          {/* Trading Tabs */}
          <Tabs defaultValue="buy" className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0">
              <TabsTrigger
                value="buy"
                className="trade-tab trade-tab-buy data-[state=active]:scale-105 data-[state=inactive]:trade-tab-inactive"
              >
                <TrendingUp className="h-4 w-4 mr-1.5" />
                BUY
              </TabsTrigger>
              <TabsTrigger
                value="sell"
                className="trade-tab trade-tab-sell data-[state=active]:scale-105 data-[state=inactive]:trade-tab-inactive"
                disabled={!hasPosition}
              >
                <TrendingDown className="h-4 w-4 mr-1.5" />
                SELL
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
                currentPrice={effectivePrice}
                solPrice={solPrice}
                balance={userBalance}
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
                holdingQty={position ? parseFloat(position.qty) : 0}
                currentPrice={effectivePrice}
                solPrice={solPrice}
                hasPosition={hasPosition}
              />
            </TabsContent>
          </Tabs>
        </div>
    </div>
  )
}
