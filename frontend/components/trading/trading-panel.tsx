"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, Wallet, Settings, AlertCircle, CheckCircle } from "lucide-react"
import { useAuth, useTrading, usePortfolio } from "@/lib/api-hooks-v2"
import { useToast } from "@/hooks/use-toast"
import marketService from "@/lib/market-service"
import type { TokenDetails } from "@/lib/types/api-types"
import type { PortfolioPosition } from "@/lib/portfolio-service"

interface TradingPanelProps {
  tokenAddress?: string
}

export function TradingPanel({ tokenAddress: propTokenAddress }: TradingPanelProps = {}) {
  const searchParams = useSearchParams()
  const defaultTokenAddress = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263" // BONK
  const tokenAddress = propTokenAddress || searchParams.get("token") || defaultTokenAddress

  // Hooks
  const { user } = useAuth()
  const { data: portfolio, refetch: refreshPortfolio } = usePortfolio()
  const { isTrading, tradeError, executeBuy, executeSell, clearError } = useTrading()
  const { toast } = useToast()

  // State
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null)
  const [tokenHolding, setTokenHolding] = useState<PortfolioPosition | null>(null)
  const [loadingToken, setLoadingToken] = useState(true)
  const [customSolAmount, setCustomSolAmount] = useState("")
  const [selectedSolAmount, setSelectedSolAmount] = useState<number | null>(null)
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null)
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [lastTradeSuccess, setLastTradeSuccess] = useState(false)

  const presetSolAmounts = [1, 5, 10, 20]
  const sellPercentages = [25, 50, 75, 100]

  // Load token details and user holding
  const loadTokenData = useCallback(async () => {
    if (!tokenAddress) return

    setLoadingToken(true)
    try {
      const [details] = await Promise.all([
        marketService.getTokenDetails(tokenAddress)
      ])
      
      setTokenDetails(details)

      // Find user's holding for this token
      if (portfolio?.positions) {
        const holding = portfolio.positions.find(p => p.tokenAddress === tokenAddress)
        setTokenHolding(holding || null)
      }
    } catch (error) {
      console.error('Failed to load token data:', error)
      toast({
        title: "Error",
        description: "Failed to load token information",
        variant: "destructive"
      })
    } finally {
      setLoadingToken(false)
    }
  }, [tokenAddress, portfolio, toast])

  useEffect(() => {
    loadTokenData()
  }, [loadTokenData])

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
      // Sell
      if (!selectedPercentage || !tokenHolding) {
        toast({
          title: "Invalid Selection",
          description: "Please select a percentage to sell",
          variant: "destructive"
        })
        return
      }

      const sellQuantity = (parseFloat(tokenHolding.quantity) * selectedPercentage) / 100
      amountSol = sellQuantity * parseFloat(tokenDetails.price.toString()) / 1e9 // Convert to SOL
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

      // Refresh data
      await Promise.all([
        refreshPortfolio(),
        loadTokenData()
      ])

      // Clear success indicator after 3 seconds
      setTimeout(() => setLastTradeSuccess(false), 3000)

    } catch (error) {
      console.error('Trade execution failed:', error)
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
    loadTokenData
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

  const currentPrice = parseFloat(tokenDetails.price.toString()) / 1e9 // Convert to readable price
  const balance = user ? parseFloat(user.virtualSolBalance) : 0
  const tokenBalance = tokenHolding ? parseFloat(tokenHolding.quantity) : 0

  return (
    <Card className="p-6 space-y-6">
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
          <h3 className="font-semibold text-lg">Trade {tokenDetails.tokenSymbol || 'Token'}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="font-mono">{balance.toFixed(2)} SOL</span>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold text-foreground">
            ${currentPrice.toFixed(8)}
          </span>
          {tokenDetails.priceChange24h && (
            <span className={`text-sm font-medium ${
              tokenDetails.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {tokenDetails.priceChange24h >= 0 ? '+' : ''}{tokenDetails.priceChange24h.toFixed(2)}%
            </span>
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

        <TabsContent value="buy" className="space-y-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Amount (SOL)</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setShowCustomInput(!showCustomInput)}
              >
                <Settings className="h-3 w-3 mr-1" />
                Custom
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {presetSolAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant={selectedSolAmount === amount ? "default" : "outline"}
                  className={`font-mono text-sm ${
                    selectedSolAmount === amount
                      ? "bg-accent text-accent-foreground hover:bg-accent/90"
                      : "bg-transparent"
                  }`}
                  onClick={() => {
                    setSelectedSolAmount(amount)
                    setCustomSolAmount("")
                  }}
                  disabled={amount > balance}
                >
                  {amount} SOL
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

          <div className="space-y-2">
            <Label htmlFor="token-amount">You'll receive ({tokenDetails.tokenSymbol})</Label>
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

          <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
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
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90" 
            size="lg"
            onClick={() => handleTrade('buy')}
            disabled={isTrading || (!selectedSolAmount && !customSolAmount)}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            {isTrading ? 'Processing...' : `Buy ${tokenDetails.tokenSymbol}`}
          </Button>
        </TabsContent>

        <TabsContent value="sell" className="space-y-4 mt-4">
          {!tokenHolding || tokenBalance <= 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You don't own any {tokenDetails.tokenSymbol || 'tokens'} to sell.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Amount (% of holdings)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {sellPercentages.map((percent) => (
                    <Button
                      key={percent}
                      variant={selectedPercentage === percent ? "default" : "outline"}
                      className={`font-mono text-sm ${
                        selectedPercentage === percent
                          ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          : "bg-transparent"
                      }`}
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
                className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                size="lg"
                onClick={() => handleTrade('sell')}
                disabled={isTrading || !selectedPercentage}
              >
                <TrendingDown className="mr-2 h-4 w-4" />
                {isTrading ? 'Processing...' : `Sell ${tokenDetails.tokenSymbol}`}
              </Button>
            </>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  )
}
