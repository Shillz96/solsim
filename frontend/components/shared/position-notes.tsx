"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StickyNote, TrendingUp, Coins, BarChart3 } from "lucide-react"

interface PositionNote {
  tokenSymbol: string
  tokenAddress: string
  entryMarketCap: string
  currentMarketCap: string
  solAmount: number
  timestamp: string
}

// Example position notes
const POSITION_NOTES: PositionNote[] = [
  {
    tokenSymbol: "BONK",
    tokenAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    entryMarketCap: "$1.2B",
    currentMarketCap: "$1.4B",
    solAmount: 5,
    timestamp: "2h ago",
  },
  {
    tokenSymbol: "WIF",
    tokenAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    entryMarketCap: "$2.1B",
    currentMarketCap: "$2.3B",
    solAmount: 10,
    timestamp: "5h ago",
  },
]

interface PositionNotesProps {
  tokenAddress?: string
}

export function PositionNotes({ tokenAddress }: PositionNotesProps) {
  const filteredNotes = tokenAddress
    ? POSITION_NOTES.filter((note) => note.tokenAddress === tokenAddress)
    : POSITION_NOTES

  if (filteredNotes.length === 0) {
    return null
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <StickyNote className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Position Notes</h3>
        <Badge variant="secondary" className="text-xs ml-auto">
          {filteredNotes.length} Active
        </Badge>
      </div>

      <div className="space-y-3">
        {filteredNotes.map((note, index) => {
          const entryMC = Number.parseFloat(note.entryMarketCap.replace(/[$B]/g, ""))
          const currentMC = Number.parseFloat(note.currentMarketCap.replace(/[$B]/g, ""))
          const mcChange = ((currentMC - entryMC) / entryMC) * 100
          const isProfit = mcChange > 0

          return (
            <div
              key={index}
              className="rounded-lg border border-border bg-card p-3 space-y-2 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{note.tokenSymbol}</span>
                  <span className="text-xs text-muted-foreground">{note.timestamp}</span>
                </div>
                <Badge variant={isProfit ? "default" : "destructive"} className="text-xs">
                  {isProfit ? "+" : ""}
                  {mcChange.toFixed(2)}%
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Entry MC:</span>
                  <span className="font-mono text-foreground">{note.entryMarketCap}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Current MC:</span>
                  <span className="font-mono text-foreground">{note.currentMarketCap}</span>
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <Coins className="h-3 w-3 text-muted-foreground" />
                  <span className="text-muted-foreground">SOL Amount:</span>
                  <span className="font-mono text-foreground">{note.solAmount}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
