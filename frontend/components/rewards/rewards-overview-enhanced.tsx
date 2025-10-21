"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DataCard, DataCardGrid } from "@/components/ui/data-card"
import { ProgressCard } from "@/components/ui/progress-card"
import {
  Gift, Coins, TrendingUp, Calendar, Clock, AlertCircle,
  Wallet, CheckCircle, Info, Zap, Trophy, Target, Sparkles
} from "lucide-react"
import * as api from "@/lib/api"
import * as Backend from "@/lib/types/backend"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { usePortfolio } from "@/hooks/use-portfolio"
import { formatNumber, formatUSD } from "@/lib/format"
import { cn } from "@/lib/utils"
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner"
import { motion, AnimatePresence } from "framer-motion"

export function RewardsOverviewEnhanced() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuth()
  const { connected, publicKey } = useWallet()
  const [isClaimingAll, setIsClaimingAll] = useState(false)
  const [timeUntilNextClaim, setTimeUntilNextClaim] = useState("")

  // Get user's reward claims
  const { data: rewardClaims, isLoading: claimsLoading } = useQuery({
    queryKey: ['reward-claims', user?.id],
    queryFn: () => user ? api.getUserRewardClaims(user.id) : Promise.resolve([]),
    enabled: !!user?.id,
    refetchInterval: 30000,
  })

  // Get reward statistics
  const { data: rewardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['reward-stats'],
    queryFn: () => api.getRewardStats(),
    refetchInterval: 60000,
  })

  // Get user's portfolio for tier calculation
  const { data: portfolio } = usePortfolio()

  // Claim rewards mutation
  const claimMutation = useMutation({
    mutationFn: (request: Backend.RewardsClaimRequest) => api.claimRewards(request),
    onSuccess: (data) => {
      toast({
        title: "Rewards Claimed! 🎉",
        description: `Successfully claimed ${formatNumber(parseFloat(data.amount))} $vSOL tokens`,
      })
      queryClient.invalidateQueries({ queryKey: ['reward-claims', user?.id] })
    },
    onError: (error: any) => {
      const isEmailVerificationError = error.message?.includes("verification") ||
                                        error.message?.includes("verify your email")

      toast({
        title: isEmailVerificationError ? "Email Verification Required" : "Claim Failed",
        description: isEmailVerificationError
          ? "Please verify your email address before claiming rewards. Check your inbox for the verification link."
          : error.message || "Failed to claim rewards",
        variant: "destructive",
      })
    },
  })

  const handleClaimAll = async () => {
    if (!connected) {
      toast({
        title: "Wallet Required",
        description: "Please connect your wallet to claim rewards",
        variant: "destructive",
      })
      return
    }

    const unclaimedRewards = rewardClaims?.filter(claim =>
      claim.status === 'PENDING' || !claim.claimedAt
    ) || []

    if (unclaimedRewards.length === 0) return

    if (!user || !publicKey) return;

    setIsClaimingAll(true)
    try {
      for (const claim of unclaimedRewards) {
        await claimMutation.mutateAsync({
          userId: user.id,
          epoch: claim.epoch,
          wallet: publicKey.toBase58(),
        })
      }
    } finally {
      setIsClaimingAll(false)
    }
  }

  // Calculate current epoch (daily)
  const getCurrentEpoch = () => {
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const dayNumber = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))
    return dayNumber
  }

  // Get current day for display
  const getCurrentDayDisplay = () => {
    const now = new Date()
    return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const currentEpoch = getCurrentEpoch()
  const currentDayDisplay = getCurrentDayDisplay()

  // Countdown timer for next claim
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const diff = tomorrow.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeUntilNextClaim(`${hours}h ${minutes}m ${seconds}s`)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  const unclaimedRewards = rewardClaims?.filter(claim => claim.status === 'PENDING' || !claim.claimedAt) || []
  const claimedRewards = rewardClaims?.filter(claim => claim.status === 'COMPLETED' && claim.claimedAt) || []
  const totalUnclaimed = unclaimedRewards.reduce((sum, claim) => sum + parseFloat(claim.amount), 0)
  const totalClaimed = claimedRewards.reduce((sum, claim) => sum + parseFloat(claim.amount), 0)

  // Calculate user tier based on trading volume
  const getUserTier = () => {
    const totalVolume = portfolio?.totals?.totalVolume || 0
    if (totalVolume >= 1000000) return { name: "Diamond", level: "platinum", icon: "💎", multiplier: 2.0, nextTier: 0 }
    if (totalVolume >= 500000) return { name: "Platinum", level: "platinum", icon: "🔮", multiplier: 1.75, nextTier: 1000000 }
    if (totalVolume >= 100000) return { name: "Gold", level: "gold", icon: "🏆", multiplier: 1.5, nextTier: 500000 }
    if (totalVolume >= 50000) return { name: "Silver", level: "silver", icon: "🥈", multiplier: 1.25, nextTier: 100000 }
    if (totalVolume >= 10000) return { name: "Bronze", level: "bronze", icon: "🥉", multiplier: 1.1, nextTier: 50000 }
    return { name: "Novice", level: "bronze", icon: "🌟", multiplier: 1.0, nextTier: 10000 }
  }

  const userTier = getUserTier()
  const totalVolume = portfolio?.totals?.totalVolume || 0

  if (!isAuthenticated || !user) {
    return (
      <div className="stat-card py-12">
        <div className="text-center space-y-4">
          <Gift className="h-12 w-12 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Sign In to View Rewards</h3>
            <p className="text-sm text-muted-foreground">Connect your account to start earning $vSOL tokens</p>
          </div>
        </div>
      </div>
    )
  }

  if (claimsLoading || statsLoading) {
    return (
      <div className="stat-card py-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Email Verification Banner */}
      {user && !user.emailVerified && (
        <EmailVerificationBanner email={user.email} />
      )}

      {/* Enhanced Main Stats Grid with 2025 Design Patterns */}
      <DataCardGrid columns={4}>
        {/* Unclaimed Rewards with Animated Glow Effect */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.02 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 blur-xl rounded-2xl"></div>
          <DataCard
            variant="stat"
            title="Available Rewards"
            value={
              <motion.div
                key={totalUnclaimed}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-baseline gap-2"
              >
                <motion.span
                  className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent"
                  animate={{
                    textShadow: [
                      "0 0 20px rgba(139, 92, 246, 0.5)",
                      "0 0 40px rgba(139, 92, 246, 0.8)",
                      "0 0 20px rgba(139, 92, 246, 0.5)"
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {formatNumber(totalUnclaimed)}
                </motion.span>
                <span className="text-sm text-muted-foreground">vSOL</span>
              </motion.div>
            }
            icon={
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Coins className="h-5 w-5 text-primary" />
              </motion.div>
            }
          >
            {unclaimedRewards.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  size="sm"
                  className="w-full mt-4 relative overflow-hidden group"
                  onClick={handleClaimAll}
                  disabled={isClaimingAll || claimMutation.isPending || !connected}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 group-hover:from-primary/30 group-hover:to-purple-500/30 transition-all duration-300"></span>
                  <Sparkles className="h-4 w-4 mr-2 relative z-10" />
                  <span className="relative z-10">
                    {isClaimingAll ? "Claiming..." : `Claim All (${unclaimedRewards.length})`}
                  </span>
                </Button>
              </motion.div>
            )}
          </DataCard>
        </motion.div>

        {/* Total Earned - Enhanced with Gradient Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
        >
          <DataCard
            variant="stat"
            title="Total Earned"
            subtitle="Lifetime rewards"
            value={
              <motion.span
                className="text-2xl font-bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {formatNumber(totalClaimed + totalUnclaimed)}
              </motion.span>
            }
            icon={
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 10, -10, 0]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Trophy className="h-5 w-5 text-yellow-500" />
              </motion.div>
            }
            trend={totalClaimed > 0 ? "up" : "neutral"}
          />
        </motion.div>

        {/* Current Tier Card - Enhanced with Floating Animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          className="relative"
        >
          <div className={cn(
            "absolute inset-0 rounded-2xl blur-xl",
            userTier.level === "platinum" && "bg-gradient-to-r from-purple-500/20 to-pink-500/20",
            userTier.level === "gold" && "bg-gradient-to-r from-yellow-500/20 to-orange-500/20",
            userTier.level === "silver" && "bg-gradient-to-r from-gray-400/20 to-slate-500/20",
            userTier.level === "bronze" && "bg-gradient-to-r from-orange-600/20 to-red-500/20"
          )}></div>
          <DataCard
            variant="tier"
            tierLevel={userTier.level as any}
            title="Current Tier"
            value={
              <motion.div
                className="flex items-center gap-2"
                animate={{ y: [-2, 2, -2] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <span className="text-3xl">{userTier.icon}</span>
                <span className="font-bold text-xl">{userTier.name}</span>
              </motion.div>
            }
          >
            <div className="text-sm text-muted-foreground mt-2">
              <span className="font-semibold text-foreground">{userTier.multiplier}x</span> reward multiplier
            </div>
          </DataCard>
        </motion.div>

        {/* Countdown Timer - Enhanced with Live Pulse */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
        >
          <DataCard
            variant="info"
            title="Next Epoch"
            subtitle={`Day ${currentEpoch} of the year`}
            value={
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                {currentDayDisplay}
              </motion.div>
            }
            icon={<Calendar className="h-5 w-5" />}
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="relative"
              >
                <Clock className="h-3 w-3" />
                <div className="absolute inset-0 bg-green-500 rounded-full blur-md opacity-50"></div>
              </motion.div>
              <span>Resets in: <span className="font-mono font-bold text-sm text-foreground bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">{timeUntilNextClaim}</span></span>
            </div>
          </DataCard>
        </motion.div>
      </DataCardGrid>

      {/* Progress to Next Tier */}
      {userTier.nextTier > 0 && (
        <ProgressCard
          title="Progress to Next Tier"
          current={totalVolume}
          max={userTier.nextTier}
          unit="USD"
          icon={<Target className="h-5 w-5" />}
          color="primary"
        />
      )}

      {/* Two Column Layout for Additional Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unclaimed Rewards List - Ultra Modern Cards */}
        {unclaimedRewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 blur-2xl rounded-3xl"></div>
            <div className="relative backdrop-blur-sm bg-card/80 border border-border/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Gift className="h-6 w-6 text-primary" />
                  </motion.div>
                  Unclaimed Rewards
                </h3>
                <Badge className="bg-gradient-to-r from-primary to-purple-500 text-white border-0">
                  {unclaimedRewards.length} Available
                </Badge>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                  {unclaimedRewards.map((claim, index) => (
                    <motion.div
                      key={claim.id}
                      initial={{ opacity: 0, x: -50, rotateX: -15 }}
                      animate={{ opacity: 1, x: 0, rotateX: 0 }}
                      exit={{ opacity: 0, scale: 0.8, rotateX: 15 }}
                      transition={{
                        delay: index * 0.05,
                        type: "spring",
                        stiffness: 100,
                        damping: 15
                      }}
                      whileHover={{
                        scale: 1.02,
                        transition: { duration: 0.2 }
                      }}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                      <div className="relative bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl p-4 flex items-center justify-between hover:border-primary/50 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <motion.div
                            className="relative"
                            animate={{
                              boxShadow: [
                                "0 0 0 0 rgba(139, 92, 246, 0.4)",
                                "0 0 0 10px rgba(139, 92, 246, 0)",
                                "0 0 0 0 rgba(139, 92, 246, 0)"
                              ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <div className="p-3 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20">
                              <Coins className="h-5 w-5 text-primary" />
                            </div>
                          </motion.div>
                          <div>
                            <div className="font-bold text-lg">
                              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                                {formatNumber(parseFloat(claim.amount))}
                              </span>
                              <span className="ml-2 text-sm text-muted-foreground">vSOL</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Epoch {claim.epoch}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!connected) {
                              toast({
                                title: "Wallet Required",
                                description: "Please connect your wallet to claim rewards",
                                variant: "destructive",
                              })
                              return
                            }
                            if (!user || !publicKey) return;
                            claimMutation.mutate({
                              userId: user.id,
                              epoch: claim.epoch,
                              wallet: publicKey.toBase58(),
                            })
                          }}
                          disabled={claimMutation.isPending || !connected}
                          className="relative overflow-hidden group/btn"
                        >
                          <span className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300"></span>
                          <span className="relative z-10">Claim</span>
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {/* Global Stats - Enhanced with grid layout */}
        {rewardStats && (
          <div className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Platform Statistics
              </h3>
              <div className="live-indicator w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="data-card">
                <div className="text-2xl font-bold number-display">{formatNumber(rewardStats.totalAmount)}</div>
                <p className="text-xs text-muted-foreground">vSOL Distributed</p>
              </div>
              <div className="data-card">
                <div className="text-2xl font-bold number-display">{rewardStats.totalClaims}</div>
                <p className="text-xs text-muted-foreground">Total Claims</p>
              </div>
              <div className="data-card">
                <div className="text-2xl font-bold number-display">{rewardStats.pendingClaims}</div>
                <p className="text-xs text-muted-foreground">Pending Claims</p>
              </div>
              <div className="data-card">
                <div className="text-2xl font-bold number-display">
                  {rewardStats.totalClaims > 0 ?
                    formatNumber(rewardStats.totalAmount / rewardStats.totalClaims) :
                    '0'
                  }
                </div>
                <p className="text-xs text-muted-foreground">Avg Claim</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wallet Connection Warning - Enhanced styling */}
      {!connected && unclaimedRewards.length > 0 && (
        <Alert variant="destructive" className="mt-8 border-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Connect your Solana wallet to claim your rewards</span>
            <Button size="sm" variant="outline" className="btn-enhanced">
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}