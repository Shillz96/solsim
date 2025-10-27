"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Activity, 
  Zap,
  ArrowRight,
  Star,
  Target,
  Trophy,
  Award,
  Crown,
  Medal,
  Percent,
  DollarSign
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { usePortfolio } from "@/hooks/use-portfolio"
import { AnimatedNumber } from "@/components/ui/animated-number"

export function PortfolioStatsWidget() {
  const { user } = useAuth()
  const { data: portfolio } = usePortfolio()

  if (!portfolio) {
    return (
      <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="h-8 bg-muted rounded w-1/2 mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalValue = parseFloat(portfolio.totals.totalValueUsd)
  const totalPnL = parseFloat(portfolio.totals.totalPnlUsd)
  const winRate = parseFloat(portfolio.totals.winRate)
  const totalTrades = portfolio.totals.totalTrades
  const activePositions = portfolio.positions.filter(p => parseFloat(p.qty) > 0).length

  const stats = [
    { 
      label: "Portfolio Value", 
      value: totalValue, 
      icon: DollarSign, 
      prefix: "$",
      decimals: 2,
      color: "text-sky",
      bg: "bg-sky/10"
    },
    { 
      label: "Total P&L", 
      value: totalPnL, 
      icon: totalPnL >= 0 ? TrendingUp : TrendingDown, 
      prefix: totalPnL >= 0 ? "+$" : "-$",
      decimals: 2,
      color: totalPnL >= 0 ? "text-luigi" : "text-mario",
      bg: totalPnL >= 0 ? "bg-luigi/10" : "bg-mario/10"
    },
    { 
      label: "Win Rate", 
      value: winRate, 
      icon: Percent, 
      suffix: "%",
      decimals: 1,
      color: winRate >= 50 ? "text-luigi" : "text-mario",
      bg: winRate >= 50 ? "bg-luigi/10" : "bg-mario/10"
    },
    { 
      label: "Active Positions", 
      value: activePositions, 
      icon: Target, 
      decimals: 0,
      color: "text-primary",
      bg: "bg-primary/10"
    },
  ]

  return (
    <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5"></div>
      
      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Portfolio Stats
          </CardTitle>
          <Badge variant="outline" className="text-xs bg-primary/10">
            Live
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-0">
        <div className="space-y-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-muted/20 rounded-[14px] hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${stat.bg}`}>
                  <stat.icon className={`h-3 w-3 ${stat.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${stat.color}`}>
                  <AnimatedNumber 
                    value={Math.abs(stat.value)} 
                    prefix={stat.prefix}
                    suffix={stat.suffix}
                    decimals={stat.decimals}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-border/50">
          <Link href="/warp-pipes">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              Start Trading
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function LeaderboardPreviewWidget() {
  const achievements = [
    { 
      label: "Top Performer", 
      rank: "12th", 
      icon: Trophy, 
      color: "text-star",
      bg: "bg-star/10"
    },
    { 
      label: "Best Streak", 
      value: "7 wins", 
      icon: Award, 
      color: "text-luigi",
      bg: "bg-luigi/10"
    },
    { 
      label: "Volume Trader", 
      rank: "Top 5%", 
      icon: Crown, 
      color: "text-purple-500",
      bg: "bg-purple-500/10"
    },
  ]

  return (
    <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
      
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="text-sm">Your Ranking</CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-0">
        <div className="space-y-2">
          {achievements.map((achievement, index) => (
            <motion.div
              key={achievement.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${achievement.bg}`}>
                  <achievement.icon className={`h-3 w-3 ${achievement.color}`} />
                </div>
                <span className="text-xs text-muted-foreground">{achievement.label}</span>
              </div>
              <div className="text-xs font-semibold">
                {achievement.rank || achievement.value}
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-border/50">
          <Link href="/leaderboard">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              View Full Leaderboard
              <Medal className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickPortfolioActionsWidget() {
  const actions = [
    { 
      label: "Trade Hub", 
      icon: Activity, 
      color: "text-sky",
      bg: "bg-sky/10",
      href: "/warp-pipes"
    },
    { 
      label: "Market Analysis", 
      icon: TrendingUp, 
      color: "text-luigi",
      bg: "bg-luigi/10",
      href: "/trending"
    },
    { 
      label: "Watchlist", 
      icon: Star, 
      color: "text-star",
      bg: "bg-star/10",
      href: "/portfolio?tab=watchlist"
    },
  ]

  return (
    <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-red-500/5"></div>
      
      <CardHeader className="relative z-10 pb-3">
        <CardTitle className="text-sm">Quick Actions</CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-0">
        <div className="space-y-2">
          {actions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={action.href}>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start gap-2 hover:bg-muted/50"
                >
                  <div className={`p-1.5 rounded ${action.bg}`}>
                    <action.icon className={`h-3 w-3 ${action.color}`} />
                  </div>
                  <span className="text-xs">{action.label}</span>
                  <ArrowRight className="h-3 w-3 ml-auto opacity-50" />
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}