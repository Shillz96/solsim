"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, X } from "lucide-react"
import { motion } from "framer-motion"

const ACTIVE_POSITIONS = [
  {
    id: "1",
    symbol: "BONK",
    name: "Bonk",
    amount: 1000000,
    entryPrice: 0.00001856,
    currentPrice: 0.00002156,
    pnl: 3.0,
    pnlPercent: 16.16,
  },
  {
    id: "2",
    symbol: "WIF",
    name: "dogwifhat",
    amount: 50,
    entryPrice: 2.89,
    currentPrice: 2.34,
    pnl: -27.5,
    pnlPercent: -19.03,
  },
]

export function ActivePositions() {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-lg">Active Positions</h3>
        <Badge variant="secondary" className="font-mono">
          {ACTIVE_POSITIONS.length} open
        </Badge>
      </div>

      <div className="space-y-3">
        {ACTIVE_POSITIONS.map((position) => (
          <motion.div
            key={position.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold font-heading">{position.symbol}</span>
                  {position.pnl > 0 ? (
                    <TrendingUp className="h-3 w-3 text-accent" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{position.name}</p>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground">Amount</p>
                <p className="font-mono font-semibold">{position.amount.toLocaleString()}</p>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground">Entry</p>
                <p className="font-mono">${position.entryPrice.toFixed(position.entryPrice < 1 ? 5 : 2)}</p>
              </div>

              <div className="text-sm">
                <p className="text-muted-foreground">Current</p>
                <p className="font-mono">${position.currentPrice.toFixed(position.currentPrice < 1 ? 5 : 2)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`font-mono text-lg font-bold ${position.pnl > 0 ? "text-accent" : "text-destructive"}`}>
                  {position.pnl > 0 ? "+" : ""}
                  {position.pnl.toFixed(2)} SOL
                </p>
                <p className={`text-sm font-medium font-mono ${position.pnl > 0 ? "text-accent" : "text-destructive"}`}>
                  {position.pnl > 0 ? "+" : ""}
                  {position.pnlPercent.toFixed(2)}%
                </p>
              </div>

              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  )
}
