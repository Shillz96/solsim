"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Gift, Coins, TrendingUp, Calendar, CheckCircle, Clock, AlertCircle, Timer, Wallet } from "lucide-react"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { formatUSD, formatNumber } from "@/lib/format"
import { WalletConnectButton } from "@/components/wallet/wallet-connect-button"

interface RewardsCardProps {
  userId: string
  walletAddress?: string
}

export function RewardsCard({ userId, walletAddress }: RewardsCardProps) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedClaim, setSelectedClaim] = useState<Backend.RewardClaim | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState<string>("")
  const [canClaim, setCanClaim] = useState(true)

  // Get user's reward claims
  const { data: rewardClaims, isLoading: claimsLoading } = useQuery({
    queryKey: ['reward-claims', userId],
    queryFn: () => api.getUserRewardClaims(userId),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Get reward statistics
  const { data: rewardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['reward-stats'],
    queryFn: () => api.getRewardStats(),
    refetchInterval: 60000, // Refresh every minute
  })

  // Claim rewards mutation
  const claimMutation = useMutation({
    mutationFn: (request: Backend.RewardsClaimRequest) => api.claimRewards(request),
    onSuccess: (data) => {
      toast({
        title: "Rewards Claimed!",
        description: `Successfully claimed ${data.amount} $vSOL tokens`,
      })
      // Refresh claims data and user data
      queryClient.invalidateQueries({ queryKey: ['reward-claims', userId] })
      queryClient.invalidateQueries({ queryKey: ['user', userId] })
      setSelectedClaim(null)
      setCanClaim(false) // Start cooldown
    },
    onError: (error: any) => {
      // Handle cooldown error specifically
      if (error.message?.includes("cooldown") || error.message?.includes("wait")) {
        toast({
          title: "Claim Cooldown Active",
          description: error.message || "Please wait before claiming again",
          variant: "destructive",
        })
      } else if (error.message?.includes("holder") || error.message?.includes("vSOL tokens")) {
        toast({
          title: "Token Holder Verification Failed",
          description: error.message || "You must hold vSOL tokens to claim rewards",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Claim Failed",
          description: error.message || "Failed to claim rewards",
          variant: "destructive",
        })
      }
    },
  })

  // REMOVED: Cooldown timer - Users can now claim anytime
  // Always enable claiming if wallet is connected
  useEffect(() => {
    setCanClaim(true)
    setCooldownRemaining("")
  }, [rewardClaims])

  const handleClaim = (claim: Backend.RewardClaim) => {
    if (!walletAddress) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to claim rewards",
        variant: "destructive",
      })
      return
    }

    claimMutation.mutate({
      userId,
      epoch: claim.epoch,
      wallet: walletAddress,
    })
  }

  // Get current epoch (simple calculation - you might want to make this more sophisticated)
  const getCurrentEpoch = () => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const weekNumber = Math.ceil(((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) / 7)
    return weekNumber
  }

  // Get current week date range for display
  const getCurrentWeekRange = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    return `${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`
  }

  const currentEpoch = getCurrentEpoch()
  const currentWeekRange = getCurrentWeekRange()
  const unclaimedRewards = rewardClaims?.filter(claim => claim.status === 'PENDING' || !claim.claimedAt) || []
  const claimedRewards = rewardClaims?.filter(claim => claim.status === 'COMPLETED' && claim.claimedAt) || []
  const totalUnclaimed = unclaimedRewards.reduce((sum, claim) => sum + parseFloat(claim.amount), 0)

  if (claimsLoading || statsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Rewards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          vSOL Token Rewards
        </CardTitle>
        <CardDescription>
          Earn $vSOL tokens based on your trading activity. 1 point = 1,000 vSOL. Claim anytime!
        </CardDescription>
        {/* Wallet Status in Header */}
        {!walletAddress && (
          <div className="pt-2">
            <WalletConnectButton 
              size="sm"
              variant="outline"
              className="w-full"
              onWalletConnected={(address) => {
                toast({
                  title: "Wallet Connected!",
                  description: "You can now claim your rewards",
                })
              }}
            />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Reward Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Coins className="h-4 w-4" />
              Unclaimed Rewards
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(totalUnclaimed)} $vSOL
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Claim Status
            </div>
            <div className="text-lg font-bold flex items-center gap-2">
              <Badge variant="default" className="bg-green-500/20 text-green-600 border-green-500/30">
                Ready
              </Badge>
            </div>
          </div>
        </div>

        {/* Global Stats */}
        {rewardStats && (
          <div className="p-4 rounded-lg bg-muted/50">
            <h4 className="font-medium mb-3">Global Reward Stats</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Total Claimed</div>
                <div className="font-medium">{formatNumber(rewardStats.totalAmount)} $vSOL</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total Claims</div>
                <div className="font-medium">{rewardStats.totalClaims}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Pending Claims</div>
                <div className="font-medium">{rewardStats.pendingClaims}</div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Main Claim Button - Always visible when wallet connected */}
        {walletAddress && (
          <div className="space-y-4">
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                // Get current epoch
                const now = new Date()
                const startOfYear = new Date(now.getFullYear(), 0, 1)
                const dayNumber = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
                
                claimMutation.mutate({
                  userId,
                  epoch: dayNumber,
                  wallet: walletAddress,
                })
              }}
              disabled={claimMutation.isPending || !canClaim}
            >
              {claimMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Claiming Rewards...
                </>
              ) : !canClaim ? (
                <>
                  <Timer className="h-4 w-4 mr-2" />
                  Wait {cooldownRemaining}
                </>
              ) : (
                <>
                  <Gift className="h-4 w-4 mr-2" />
                  Claim Rewards Now
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Rewards are calculated based on your trading activity, volume, and win rate.
            </p>
          </div>
        )}

        <Separator />

        {/* Unclaimed Rewards */}
        {unclaimedRewards.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Unclaimed Rewards ({unclaimedRewards.length})
            </h4>
            <div className="space-y-2">
              {unclaimedRewards.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">Week {claim.epoch}</Badge>
                    <div>
                      <div className="font-medium">{formatNumber(parseFloat(claim.amount))} $vSOL</div>
                      <div className="text-sm text-muted-foreground">
                        Available to claim
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleClaim(claim)}
                    disabled={claimMutation.isPending || !walletAddress}
                  >
                    {claimMutation.isPending ? "Claiming..." : "Claim"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Claimed Rewards */}
        {claimedRewards.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Claimed Rewards ({claimedRewards.length})
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {claimedRewards.map((claim) => (
                <div key={claim.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Week {claim.epoch}</Badge>
                    <div>
                      <div className="font-medium">{formatNumber(parseFloat(claim.amount))} $vSOL</div>
                      <div className="text-sm text-muted-foreground">
                        Claimed {claim.claimedAt ? new Date(claim.claimedAt).toLocaleDateString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  {claim.txSig && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(`https://solscan.io/tx/${claim.txSig}`, '_blank')}
                    >
                      View Tx
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Rewards Message */}
        {(!rewardClaims || rewardClaims.length === 0) && (
          <Alert>
            <TrendingUp className="h-4 w-4" />
            <AlertDescription>
              Start trading to earn $vSOL token rewards! Trade more to earn points (1 point = 1,000 vSOL). Claim your rewards anytime!
            </AlertDescription>
          </Alert>
        )}

        {/* Wallet Connection Warning */}
        {!walletAddress && unclaimedRewards.length > 0 && (
          <Alert variant="destructive" className="space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="flex-1">
                <AlertDescription className="mb-3">
                  Connect your Solana wallet to claim your rewards.
                </AlertDescription>
                <WalletConnectButton 
                  size="sm"
                  variant="default"
                  className="w-full"
                  onWalletConnected={(address) => {
                    toast({
                      title: "Wallet Connected!",
                      description: "You can now claim your rewards",
                    })
                  }}
                />
              </div>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}