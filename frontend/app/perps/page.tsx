"use client"

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, AlertCircle, Loader2, XCircle, Timer, DollarSign, Activity } from "lucide-react"
import * as api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { PerpTokenSelector } from "@/components/trading/perp-token-selector"
import { DexScreenerChart } from "@/components/trading/dexscreener-chart"
import { TokenLogo } from "@/components/ui/token-logo"
import { useSearchParams } from "next/navigation"

export default function PerpsPage() {
  return (
    <AuthGuard requireAuth={true}>
      <PerpsContent />
    </AuthGuard>
  )
}

function PerpsContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()

  const [selectedToken, setSelectedToken] = useState(searchParams.get("token") || "")
  const [selectedTokenMeta, setSelectedTokenMeta] = useState<any>(null)
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG")
  const [leverage, setLeverage] = useState(10)
  const [marginAmount, setMarginAmount] = useState("")
  const [positions, setPositions] = useState<any[]>([])
  const [tradeHistory, setTradeHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [positionsLoading, setPositionsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [balance, setBalance] = useState(0)
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions")
  const [tokenMetadataCache, setTokenMetadataCache] = useState<Record<string, any>>({})
  const [solPrice, setSolPrice] = useState(180) // Will be fetched from API
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Load user balance and SOL price
  useEffect(() => {
    if (user?.id) {
      api.getWalletBalance(user.id).then(data => {
        setBalance(parseFloat(data.balance))
      }).catch(console.error)
    }

    // Fetch SOL price
    const solMint = "So11111111111111111111111111111111111111112"
    api.getTokenMetadata(solMint).then(meta => {
      if (meta.priceUsd) {
        setSolPrice(meta.priceUsd)
      }
    }).catch(console.error)

    // Refresh SOL price every 30 seconds
    const priceInterval = setInterval(() => {
      api.getTokenMetadata(solMint).then(meta => {
        if (meta.priceUsd) {
          setSolPrice(meta.priceUsd)
        }
      }).catch(console.error)
    }, 30000)

    return () => clearInterval(priceInterval)
  }, [user])

  // Load token metadata when selected token changes
  useEffect(() => {
    if (selectedToken) {
      if (tokenMetadataCache[selectedToken]) {
        setSelectedTokenMeta(tokenMetadataCache[selectedToken])
      } else {
        api.getTokenMetadata(selectedToken).then(meta => {
          setSelectedTokenMeta(meta)
          setTokenMetadataCache(prev => ({ ...prev, [selectedToken]: meta }))
        }).catch(console.error)
      }
    }
  }, [selectedToken])

  // Load positions
  const loadPositions = async () => {
    if (!user?.id) return
    setPositionsLoading(true)
    try {
      const data = await api.getPerpPositions(user.id)
      setPositions(data)

      // Load metadata for all position tokens
      const uniqueMints = [...new Set(data.map((p: any) => p.mint))] as string[]
      for (const mint of uniqueMints) {
        if (!tokenMetadataCache[mint]) {
          try {
            const meta = await api.getTokenMetadata(mint)
            setTokenMetadataCache(prev => ({ ...prev, [mint]: meta }))
          } catch (error) {
            console.error(`Failed to load metadata for ${mint}:`, error)
          }
        }
      }
    } catch (error) {
      console.error("Failed to load positions:", error)
    } finally {
      setPositionsLoading(false)
    }
  }

  // Load trade history
  const loadTradeHistory = async () => {
    if (!user?.id) return
    setHistoryLoading(true)
    try {
      const data = await api.getPerpTradeHistory(user.id, 50)
      setTradeHistory(data)
    } catch (error) {
      console.error("Failed to load trade history:", error)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadPositions()
    // Poll positions every 10 seconds
    const interval = setInterval(loadPositions, 10000)
    return () => clearInterval(interval)
  }, [user])

  // Load trade history when tab is opened
  useEffect(() => {
    if (activeTab === "history" && user?.id) {
      loadTradeHistory()
    }
  }, [activeTab, user])

  // Calculate portfolio stats
  const portfolioStats = useMemo(() => {
    const totalPnL = positions.reduce((sum, pos) => sum + parseFloat(pos.unrealizedPnL || 0), 0)
    const totalMargin = positions.reduce((sum, pos) => sum + parseFloat(pos.marginAmount || 0), 0)
    const totalPositionValue = positions.reduce((sum, pos) =>
      sum + (parseFloat(pos.positionSize || 0) * parseFloat(pos.currentPrice || 0)), 0
    )

    return {
      totalPnL,
      totalMargin,
      totalPositionValue,
      positionCount: positions.length,
    }
  }, [positions])

  // Calculate estimated liquidation price
  const estimatedLiqPrice = useMemo(() => {
    if (!selectedTokenMeta?.priceUsd || !marginAmount || !leverage) return null

    const price = selectedTokenMeta.priceUsd
    if (side === "LONG") {
      return price * (1 - 1/leverage + 0.05)
    } else {
      return price * (1 + 1/leverage - 0.05)
    }
  }, [selectedTokenMeta, marginAmount, leverage, side])

  // Calculate position size in tokens
  const estimatedPositionSize = useMemo(() => {
    if (!selectedTokenMeta?.priceUsd || !marginAmount) return null

    const marginInUsd = parseFloat(marginAmount) * solPrice * leverage
    return marginInUsd / selectedTokenMeta.priceUsd
  }, [selectedTokenMeta, marginAmount, leverage, solPrice])

  // Calculate estimated PnL for different price movements
  const estimatedPnlScenarios = useMemo(() => {
    if (!selectedTokenMeta?.priceUsd || !marginAmount || !estimatedPositionSize) return null

    const currentPrice = selectedTokenMeta.priceUsd
    const scenarios = [
      { label: "+10%", priceChange: 0.10 },
      { label: "+25%", priceChange: 0.25 },
      { label: "-10%", priceChange: -0.10 },
      { label: "-25%", priceChange: -0.25 },
    ]

    return scenarios.map(scenario => {
      const newPrice = currentPrice * (1 + scenario.priceChange)
      const priceDiff = newPrice - currentPrice
      const pnl = priceDiff * estimatedPositionSize * (side === "SHORT" ? -1 : 1)
      return { ...scenario, pnl }
    })
  }, [selectedTokenMeta, marginAmount, estimatedPositionSize, side])

  const handleOpenPosition = async () => {
    // Clear previous errors
    setErrorMessage(null)

    // Validation
    if (!user?.id || !selectedToken || !marginAmount) {
      const error = "Please select a token and enter margin amount"
      setErrorMessage(error)
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      })
      return
    }

    const marginNum = parseFloat(marginAmount)
    if (isNaN(marginNum) || marginNum <= 0) {
      const error = "Please enter a valid margin amount"
      setErrorMessage(error)
      toast({
        title: "Invalid Amount",
        description: error,
        variant: "destructive",
      })
      return
    }

    if (marginNum > balance) {
      const error = `Insufficient balance. You have ${balance.toFixed(2)} SOL available`
      setErrorMessage(error)
      toast({
        title: "Insufficient Balance",
        description: error,
        variant: "destructive",
      })
      return
    }

    if (marginNum < 0.01) {
      const error = "Minimum margin is 0.01 SOL"
      setErrorMessage(error)
      toast({
        title: "Amount Too Low",
        description: error,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await api.openPerpPosition({
        userId: user.id,
        mint: selectedToken,
        side,
        leverage,
        marginAmount,
      })

      toast({
        title: "Position Opened!",
        description: `Opened ${leverage}x ${side} position with ${marginAmount} SOL margin`,
      })

      // Reload positions and balance
      await loadPositions()
      const balanceData = await api.getWalletBalance(user.id)
      setBalance(parseFloat(balanceData.balance))

      // Reset form
      setMarginAmount("")
      setErrorMessage(null)
    } catch (error: any) {
      const errorMsg = error.message || "Failed to open position"
      setErrorMessage(errorMsg)
      toast({
        title: "Failed to Open Position",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClosePosition = async (positionId: string) => {
    if (!user?.id) return

    try {
      const result = await api.closePerpPosition({
        userId: user.id,
        positionId,
      })

      toast({
        title: "Position Closed!",
        description: `PnL: ${parseFloat(result.pnl).toFixed(2)} USD`,
      })

      // Reload
      await loadPositions()
      const balanceData = await api.getWalletBalance(user.id)
      setBalance(parseFloat(balanceData.balance))
    } catch (error: any) {
      toast({
        title: "Failed to Close Position",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Get leverage risk color
  const getLeverageRiskColor = (lev: number) => {
    if (lev <= 2) return "bg-green-600 hover:bg-green-700"
    if (lev <= 5) return "bg-yellow-600 hover:bg-yellow-700"
    if (lev <= 10) return "bg-orange-600 hover:bg-orange-700"
    return "bg-red-600 hover:bg-red-700"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-2 sm:p-4">
      <div className="max-w-[1800px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Perpetual Trading</h1>
            <p className="text-muted-foreground text-sm">Trade with up to 20x leverage</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Available Balance</div>
            <div className="text-xl sm:text-2xl font-bold">
              {balance.toFixed(4)} SOL
              <span className="text-sm text-muted-foreground ml-2">
                (${(balance * solPrice).toFixed(2)})
              </span>
            </div>
          </div>
        </div>

        {/* Portfolio Stats */}
        {positions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Open Positions</span>
                </div>
                <div className="text-2xl font-bold mt-1">{portfolioStats.positionCount}</div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total Margin</span>
                </div>
                <div className="text-2xl font-bold mt-1">{portfolioStats.totalMargin.toFixed(2)} SOL</div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Position Value</span>
                </div>
                <div className="text-2xl font-bold mt-1">${portfolioStats.totalPositionValue.toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card className="transition-all hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total PnL</span>
                </div>
                <div className={`text-2xl font-bold mt-1 transition-colors ${portfolioStats.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioStats.totalPnL >= 0 ? '+' : ''}${portfolioStats.totalPnL.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Chart Section - Left (8 columns on desktop) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Price Ticker */}
            {selectedTokenMeta && (
              <Card className="transition-all hover:shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TokenLogo
                        src={selectedTokenMeta.logoURI}
                        alt={selectedTokenMeta.symbol}
                        mint={selectedToken}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="text-xl font-bold">{selectedTokenMeta.symbol}</div>
                        <div className="text-sm text-muted-foreground">{selectedTokenMeta.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono">
                        ${selectedTokenMeta.priceUsd?.toFixed(selectedTokenMeta.priceUsd < 1 ? 6 : 2) || 'N/A'}
                      </div>
                      {selectedTokenMeta.priceChange24h !== undefined && (
                        <div className={`flex items-center justify-end gap-1 text-sm font-semibold transition-colors ${selectedTokenMeta.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedTokenMeta.priceChange24h >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {selectedTokenMeta.priceChange24h >= 0 ? '+' : ''}
                          {selectedTokenMeta.priceChange24h.toFixed(2)}% (24h)
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chart */}
            <Card className="overflow-hidden">
              <div className="h-[400px] sm:h-[500px]">
                {selectedToken ? (
                  <DexScreenerChart tokenAddress={selectedToken} />
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Select a token to view chart
                  </div>
                )}
              </div>
            </Card>

            {/* Risk Warning */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>High Risk:</strong> Leverage trading can result in liquidation and loss of all margin. Only trade with funds you can afford to lose.
              </AlertDescription>
            </Alert>
          </div>

          {/* Trading Panel - Right (4 columns on desktop) */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Open Position</CardTitle>
              <CardDescription>Select token and parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Token Selection */}
              <div className="space-y-2">
                <Label>Token</Label>
                <PerpTokenSelector
                  value={selectedToken}
                  onChange={setSelectedToken}
                />
              </div>

              {/* Side Selection */}
              <div className="space-y-2">
                <Label>Direction</Label>
                <Tabs value={side} onValueChange={(v) => setSide(v as "LONG" | "SHORT")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="LONG" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      LONG
                    </TabsTrigger>
                    <TabsTrigger value="SHORT" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                      <TrendingDown className="mr-2 h-4 w-4" />
                      SHORT
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Leverage Selection with Risk Indicators */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Leverage: {leverage}x</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    leverage <= 2 ? 'bg-green-100 text-green-700' :
                    leverage <= 5 ? 'bg-yellow-100 text-yellow-700' :
                    leverage <= 10 ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {leverage <= 2 ? 'Low Risk' : leverage <= 5 ? 'Medium Risk' : leverage <= 10 ? 'High Risk' : 'Very High Risk'}
                  </span>
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 5, 10, 20].map((lev) => (
                    <Button
                      key={lev}
                      variant={leverage === lev ? "default" : "outline"}
                      onClick={() => setLeverage(lev)}
                      size="sm"
                      className={leverage === lev ? getLeverageRiskColor(lev) : ""}
                    >
                      {lev}x
                    </Button>
                  ))}
                </div>
              </div>

              {/* Margin Amount */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Margin (SOL)</span>
                  <span className="text-xs text-muted-foreground font-normal">
                    Balance: {balance.toFixed(4)} SOL
                  </span>
                </Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={marginAmount}
                  onChange={(e) => {
                    setMarginAmount(e.target.value)
                    setErrorMessage(null)
                  }}
                  step="0.01"
                  min="0"
                  className={errorMessage ? "border-red-500" : ""}
                />

                {/* Quick presets */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[25, 50, 75, 100].map((percent) => (
                    <Button
                      key={percent}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        const amount = (balance * percent / 100).toFixed(4)
                        setMarginAmount(amount)
                        setErrorMessage(null)
                      }}
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                {/* Position info */}
                {estimatedPositionSize && (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Position Size:</span>
                      <span className="font-mono">~{estimatedPositionSize.toFixed(2)} {selectedTokenMeta?.symbol}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Position Value:</span>
                      <span className="font-mono">${(estimatedPositionSize * (selectedTokenMeta?.priceUsd || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              {/* Estimated Liquidation Price */}
              {estimatedLiqPrice && (
                <Alert className="bg-orange-50 dark:bg-orange-950/20 border-orange-200">
                  <Timer className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-xs">
                    <strong>Est. Liquidation Price:</strong> ${estimatedLiqPrice.toFixed(6)}
                  </AlertDescription>
                </Alert>
              )}

              {/* PnL Scenarios */}
              {estimatedPnlScenarios && marginAmount && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Estimated PnL Scenarios</Label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {estimatedPnlScenarios.map((scenario, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded-lg border ${
                          scenario.pnl >= 0
                            ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                            : "bg-red-50 dark:bg-red-950/20 border-red-200"
                        }`}
                      >
                        <div className="text-muted-foreground">{scenario.label}</div>
                        <div
                          className={`font-mono font-semibold ${
                            scenario.pnl >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {scenario.pnl >= 0 ? "+" : ""}${scenario.pnl.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                className={`w-full transition-all duration-200 ${
                  side === "LONG"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
                size="lg"
                onClick={handleOpenPosition}
                disabled={loading || !selectedToken || !marginAmount || parseFloat(marginAmount || "0") <= 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Opening Position...
                  </>
                ) : (
                  <>
                    {side === "LONG" ? <TrendingUp className="mr-2 h-5 w-5" /> : <TrendingDown className="mr-2 h-5 w-5" />}
                    Open {leverage}x {side} Position
                  </>
                )}
              </Button>

              {/* High leverage warning */}
              {leverage >= 10 && (
                <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>High Leverage Warning:</strong> {leverage}x leverage carries extreme risk of liquidation.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Positions & History Section */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="positions">
                  Open Positions ({positions.length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  Trade History
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {activeTab === "positions" ? (
              positionsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : positions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No open positions</p>
                  <p className="text-sm">Open your first perpetual position to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {positions.map((pos) => {
                    const tokenMeta = tokenMetadataCache[pos.mint]
                    const roe = ((parseFloat(pos.unrealizedPnL) / parseFloat(pos.marginAmount)) * 100)
                    const isNearLiquidation = parseFloat(pos.marginRatio) < 2.0

                    return (
                      <div
                        key={pos.id}
                        className={`border rounded-lg p-4 space-y-3 transition-all duration-200 hover:shadow-md ${isNearLiquidation ? 'border-red-500 bg-red-50 dark:bg-red-950/20 animate-pulse' : 'hover:border-primary/50'}`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <TokenLogo
                              src={tokenMeta?.logoURI}
                              alt={tokenMeta?.symbol || pos.mint.substring(0, 8)}
                              mint={pos.mint}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <div className="font-semibold">
                                {tokenMeta?.symbol || pos.mint.substring(0, 8)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {tokenMeta?.name || 'Unknown Token'}
                              </div>
                            </div>
                            <Badge
                              variant={pos.side === "LONG" ? "default" : "destructive"}
                              className={pos.side === "LONG" ? "bg-green-600" : "bg-red-600"}
                            >
                              {pos.side}
                            </Badge>
                            <Badge variant="outline">{pos.leverage.toString()}x</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleClosePosition(pos.id)}
                            className="hover:bg-red-100 dark:hover:bg-red-950"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Close
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs">Entry Price</div>
                            <div className="font-mono font-semibold">
                              ${parseFloat(pos.entryPrice).toFixed(6)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Current Price</div>
                            <div className="font-mono font-semibold">
                              ${parseFloat(pos.currentPrice).toFixed(6)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Position Size</div>
                            <div className="font-mono font-semibold">
                              {parseFloat(pos.positionSize).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Unrealized PnL</div>
                            <div
                              className={`font-mono font-bold ${
                                parseFloat(pos.unrealizedPnL) >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {parseFloat(pos.unrealizedPnL) >= 0 ? '+' : ''}${parseFloat(pos.unrealizedPnL).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">ROE</div>
                            <div
                              className={`font-mono font-bold ${
                                roe >= 0 ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {roe >= 0 ? '+' : ''}{roe.toFixed(2)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-muted-foreground text-xs">Liq. Price</div>
                            <div className="font-mono font-semibold text-orange-600">
                              ${parseFloat(pos.liquidationPrice).toFixed(6)}
                            </div>
                          </div>
                        </div>

                        {/* Enhanced Liquidation Warning */}
                        {isNearLiquidation && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="flex items-center justify-between">
                              <span>
                                <strong>LIQUIDATION WARNING!</strong> Margin ratio: {parseFloat(pos.marginRatio).toFixed(2)}x
                                {parseFloat(pos.marginRatio) < 1.5 && " - Liquidation imminent!"}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="ml-2"
                                onClick={() => handleClosePosition(pos.id)}
                              >
                                Close Now
                              </Button>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : tradeHistory.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No trade history</p>
                  <p className="text-sm">Your closed positions will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tradeHistory.map((trade) => {
                    const tokenMeta = tokenMetadataCache[trade.mint]
                    const pnl = trade.pnl ? parseFloat(trade.pnl) : null

                    return (
                      <div key={trade.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <TokenLogo
                              src={tokenMeta?.logoURI}
                              alt={tokenMeta?.symbol || trade.mint.substring(0, 8)}
                              mint={trade.mint}
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="font-semibold">
                              {tokenMeta?.symbol || trade.mint.substring(0, 8)}
                            </span>
                            <Badge
                              variant={trade.side === "LONG" ? "default" : "destructive"}
                              className={trade.side === "LONG" ? "bg-green-600" : "bg-red-600"}
                            >
                              {trade.side}
                            </Badge>
                            <Badge variant="outline">{trade.action}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(trade.timestamp).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-muted-foreground text-xs">Entry</div>
                            <div className="font-mono">${parseFloat(trade.entryPrice).toFixed(6)}</div>
                          </div>
                          {trade.exitPrice && (
                            <div>
                              <div className="text-muted-foreground text-xs">Exit</div>
                              <div className="font-mono">${parseFloat(trade.exitPrice).toFixed(6)}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-muted-foreground text-xs">Size</div>
                            <div className="font-mono">{parseFloat(trade.quantity).toFixed(2)}</div>
                          </div>
                          {pnl !== null && (
                            <div>
                              <div className="text-muted-foreground text-xs">PnL</div>
                              <div className={`font-mono font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
