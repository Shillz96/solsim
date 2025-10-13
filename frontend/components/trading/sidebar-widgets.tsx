"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  Users, 
  Activity, 
  Zap,
  ArrowRight,
  Star,
  Target,
  Trophy
} from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"

export function TradingStatsWidget() {
  const stats = [
    { label: "Active Traders", value: "2.4K", icon: Users, trend: "+12%" },
    { label: "24h Volume", value: "$1.2M", icon: Activity, trend: "+8.5%" },
    { label: "Live Positions", value: "847", icon: Target, trend: "+5.2%" },
    { label: "Win Rate", value: "68%", icon: Trophy, trend: "+2.1%" },
  ]

  return (
    <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-green-500/5"></div>
      
      <CardHeader className="relative z-10 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Trading Stats
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
              className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-primary/10">
                  <stat.icon className="h-3 w-3 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{stat.value}</div>
                <div className="text-xs text-green-500 flex items-center gap-1">
                  <TrendingUp className="h-2.5 w-2.5" />
                  {stat.trend}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-4 pt-3 border-t border-border/50">
          <Link href="/leaderboard">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              View Leaderboard
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function QuickActionsWidget() {
  const actions = [
    { 
      label: "Top Gainers", 
      icon: TrendingUp, 
      color: "text-green-500",
      bg: "bg-green-500/10",
      href: "/trending?filter=gainers"
    },
    { 
      label: "Most Active", 
      icon: Activity, 
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      href: "/trending?filter=volume"
    },
    { 
      label: "Watchlist", 
      icon: Star, 
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      href: "/portfolio?tab=watchlist"
    },
  ]

  return (
    <Card className="relative overflow-hidden border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5"></div>
      
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