"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, TrendingDown, AlertCircle, Loader2, XCircle } from "lucide-react"
import * as api from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { TokenSearch } from "@/components/trading/token-search"
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
  const [side, setSide] = useState<"LONG" | "SHORT">("LONG")
  const [leverage, setLeverage] = useState(10)
  const [marginAmount, setMarginAmount] = useState("")
  const [positions, setPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [positionsLoading, setPositionsLoading] = useState(false)
  const [balance, setBalance] = useState(0)

  // Load user balance
  useEffect(() => {
    if (user?.id) {
      api.getWalletBalance(user.id).then(data => {
        setBalance(parseFloat(data.balance))
      }).catch(console.error)
    }
  }, [user])

  // Load positions
  const loadPositions = async () => {
    if (!user?.id) return
    setPositionsLoading(true)
    try {
      const data = await api.getPerpPositions(user.id)
      setPositions(data)
    } catch (error) {
      console.error("Failed to load positions:", error)
    } finally {
      setPositionsLoading(false)
    }
  }

  useEffect(() => {
    loadPositions()
    // Poll positions every 10 seconds
    const interval = setInterval(loadPositions, 10000)
    return () => clearInterval(interval)
  }, [user])

  const handleOpenPosition = async () => {
    if (!user?.id || !selectedToken || !marginAmount) {
      toast({
        title: "Error",
        description: "Please select a token and enter margin amount",
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
        description: `Opened ${leverage}x ${side} position`,
      })

      // Reload positions and balance
      await loadPositions()
      const balanceData = await api.getWalletBalance(user.id)
      setBalance(parseFloat(balanceData.balance))

      // Reset form
      setMarginAmount("")
    } catch (error: any) {
      toast({
        title: "Failed to Open Position",
        description: error.message,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Perpetual Trading</h1>
            <p className="text-muted-foreground">Trade with up to 20x leverage</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Available Balance</div>
            <div className="text-2xl font-bold">{balance.toFixed(2)} SOL</div>
          </div>
        </div>

        {/* Warning */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Leverage trading is high risk. You can lose all your margin if the position is liquidated.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Panel */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Open Position</CardTitle>
              <CardDescription>Select token and parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Token Selection */}
              <div className="space-y-2">
                <Label>Token</Label>
                <TokenSearch />
              </div>

              {/* Side Selection */}
              <div className="space-y-2">
                <Label>Direction</Label>
                <Tabs value={side} onValueChange={(v) => setSide(v as "LONG" | "SHORT")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="LONG" className="data-[state=active]:bg-green-600">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      LONG
                    </TabsTrigger>
                    <TabsTrigger value="SHORT" className="data-[state=active]:bg-red-600">
                      <TrendingDown className="mr-2 h-4 w-4" />
                      SHORT
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Leverage Selection */}
              <div className="space-y-2">
                <Label>Leverage: {leverage}x</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 5, 10, 20].map((lev) => (
                    <Button
                      key={lev}
                      variant={leverage === lev ? "default" : "outline"}
                      onClick={() => setLeverage(lev)}
                      size="sm"
                    >
                      {lev}x
                    </Button>
                  ))}
                </div>
              </div>

              {/* Margin Amount */}
              <div className="space-y-2">
                <Label>Margin (SOL)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={marginAmount}
                  onChange={(e) => setMarginAmount(e.target.value)}
                  step="0.01"
                  min="0"
                />
                <div className="text-xs text-muted-foreground">
                  Position Size: {marginAmount && !isNaN(parseFloat(marginAmount))
                    ? (parseFloat(marginAmount) * leverage).toFixed(2)
                    : "0.00"} SOL
                </div>
              </div>

              {/* Submit Button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleOpenPosition}
                disabled={loading || !selectedToken || !marginAmount}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening...
                  </>
                ) : (
                  `Open ${side} Position`
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Positions Table */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>
                {positions.length} position{positions.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {positionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No open positions
                </div>
              ) : (
                <div className="space-y-3">
                  {positions.map((pos) => (
                    <div
                      key={pos.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={pos.side === "LONG" ? "default" : "destructive"}
                          >
                            {pos.side}
                          </Badge>
                          <span className="font-mono text-sm">
                            {pos.mint.substring(0, 8)}...
                          </span>
                          <Badge variant="outline">{pos.leverage.toString()}x</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleClosePosition(pos.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Close
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-muted-foreground">Entry</div>
                          <div className="font-mono">
                            ${parseFloat(pos.entryPrice).toFixed(6)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Current</div>
                          <div className="font-mono">
                            ${parseFloat(pos.currentPrice).toFixed(6)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Size</div>
                          <div className="font-mono">
                            {parseFloat(pos.positionSize).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">PnL</div>
                          <div
                            className={`font-mono ${
                              parseFloat(pos.unrealizedPnL) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            ${parseFloat(pos.unrealizedPnL).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Margin Ratio Warning */}
                      {parseFloat(pos.marginRatio) < 1.5 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Warning: Close to liquidation! Margin ratio:{" "}
                            {parseFloat(pos.marginRatio).toFixed(2)}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
