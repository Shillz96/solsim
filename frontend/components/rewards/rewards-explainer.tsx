"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Gift, TrendingUp, Trophy, Target, Zap, Calculator,
  DollarSign, Users, Calendar, CheckCircle, Info,
  Coins, ArrowRight, Star, Award
} from "lucide-react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

const tiers = [
  {
    name: "Novice",
    minVolume: 0,
    multiplier: 1.0,
    color: "text-pipe-500",
    bgColor: "bg-pipe-500/10",
    icon: "🌟",
    benefits: ["Base rewards rate", "Access to all features"]
  },
  {
    name: "Bronze",
    minVolume: 10000,
    multiplier: 1.1,
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
    icon: "🥉",
    benefits: ["10% bonus rewards", "Priority support"]
  },
  {
    name: "Silver",
    minVolume: 50000,
    multiplier: 1.25,
    color: "text-pipe-400",
    bgColor: "bg-pipe-400/10",
    icon: "🥈",
    benefits: ["25% bonus rewards", "Early access features"]
  },
  {
    name: "Gold",
    minVolume: 100000,
    multiplier: 1.5,
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    icon: "🏆",
    benefits: ["50% bonus rewards", "Exclusive insights"]
  },
  {
    name: "Platinum",
    minVolume: 500000,
    multiplier: 1.75,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    icon: "🔮",
    benefits: ["75% bonus rewards", "VIP features"]
  },
  {
    name: "Diamond",
    minVolume: 1000000,
    multiplier: 2.0,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    icon: "💎",
    benefits: ["100% bonus rewards", "Maximum benefits", "Elite trader status"]
  }
]

const rewardActivities = [
  {
    activity: "Executing Trades",
    points: "1 point per trade",
    icon: TrendingUp,
    description: "Earn 1 point for every trade you execute (1 point = 1,000 vSOL)"
  },
  {
    activity: "Trading Volume",
    points: "2 points per $100 volume",
    icon: DollarSign,
    description: "Earn 2 points for every $100 in trading volume (= 2,000 vSOL)"
  },
  {
    activity: "Win Rate Bonus",
    points: "10 points per 10% win rate",
    icon: Trophy,
    description: "Earn 10 points for every 10% win rate milestone (= 10,000 vSOL)"
  },
  {
    activity: "Maximum Reward",
    points: "200 points max (200,000 vSOL)",
    icon: Star,
    description: "Rewards are capped at 200,000 vSOL (200 points) per claim"
  }
]

export function RewardsExplainer() {
  return (
    <div className="space-y-6">
      {/* Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-card hover:shadow-card-hover transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            How vSOL Token Rewards Work
          </CardTitle>
          <CardDescription>
            Learn how to maximize your earnings on VirtualSol
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p>
              VirtualSol rewards active traders with $vSOL tokens based on their trading activity and performance.
              The more you trade and the better you perform, the more rewards you earn. Rewards are calculated
              daily and distributed at the end of each epoch.
            </p>
          </div>

          <Alert className="border-primary/20 bg-primary/5 backdrop-blur-sm">
            <Gift className="h-4 w-4 text-primary" />
            <AlertDescription>
              <strong>Important:</strong> $vSOL tokens are distributed on the Solana blockchain.
              You'll need a Solana wallet connected to claim your rewards. The rewards are sent
              directly to your wallet address once claimed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      </motion.div>

      {/* Earning Points */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-card hover:shadow-card-hover transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            How to Earn Reward Points
          </CardTitle>
          <CardDescription>
            Multiple ways to accumulate points throughout each day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {rewardActivities.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="flex gap-4 p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 hover:shadow-sm transition-[box-shadow,border-color] duration-200"
              >
                <div className="p-2 rounded-full bg-primary/10 h-fit">
                  <activity.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{activity.activity}</h4>
                    <Badge variant="secondary" className="ml-2">{activity.points}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Tier System */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-card hover:shadow-card-hover transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Tier System & Multipliers
          </CardTitle>
          <CardDescription>
            Higher trading volumes unlock better reward multipliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                className={cn(
                  "p-4 rounded-lg border border-border/50 transition-[box-shadow,border-color] duration-200",
                  "hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 cursor-default",
                  tier.bgColor
                )}
                style={{ transition: 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease' }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{tier.icon}</span>
                      <div>
                        <h4 className={cn("font-bold text-lg", tier.color)}>
                          {tier.name}
                        </h4>
                        <p className="text-sm text-muted-foreground font-medium">
                          ${tier.minVolume.toLocaleString()}+
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tier.benefits.map((benefit, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {tier.multiplier}x
                    </div>
                    <p className="text-xs text-muted-foreground">multiplier</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Calculation Example */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-card hover:shadow-card-hover transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Reward Calculation Example
          </CardTitle>
          <CardDescription>
            See how your rewards are calculated
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-3">
              <h4 className="font-semibold">Example Trader Rewards</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Number of Trades:</span>
                  <span className="font-medium">10 trades</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trade Points (1 per trade):</span>
                  <span className="font-medium">10 points</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trading Volume:</span>
                  <span className="font-medium">$5,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume Points (2 per $100):</span>
                  <span className="font-medium">100 points</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win Rate:</span>
                  <span className="font-medium">65%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win Rate Points (10 per 10%):</span>
                  <span className="font-medium">60 points</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Points:</span>
                  <span className="text-primary">170 points</span>
                </div>
                <div className="flex justify-between text-lg font-semibold text-green-500">
                  <span>vSOL Reward:</span>
                  <span>170,000 vSOL</span>
                </div>
              </div>
            </div>

            <Alert className="border-primary/20 bg-primary/5">
              <Zap className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong>Conversion Rate:</strong> 1 point = 1,000 vSOL tokens.
                Your rewards are calculated based on your trading activity and capped at 200,000 vSOL (200 points) per claim.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* Distribution Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm shadow-card hover:shadow-card-hover transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Distribution Schedule
          </CardTitle>
          <CardDescription>
            When and how rewards are distributed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <div>
                  <p className="font-medium">Daily Epochs</p>
                  <p className="text-sm text-muted-foreground">
                    Each epoch runs from 00:00 UTC to 23:59 UTC each day
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <div>
                  <p className="font-medium">Calculation Period</p>
                  <p className="text-sm text-muted-foreground">
                    Rewards are calculated at midnight UTC after each day ends
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <div>
                  <p className="font-medium">Claim Window</p>
                  <p className="text-sm text-muted-foreground">
                    Rewards can be claimed anytime after calculation (no expiry)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <div>
                  <p className="font-medium">Distribution Method</p>
                  <p className="text-sm text-muted-foreground">
                    Direct transfer to your connected Solana wallet
                  </p>
                </div>
              </div>
            </div>

            <Alert className="border-green-500/20 bg-green-500/5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <strong>No Rush:</strong> Your rewards are safely stored and can be claimed at any time.
                There's no penalty for claiming late, and unclaimed rewards accumulate.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  )
}