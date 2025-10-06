"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, Activity } from "lucide-react"

export function PortfolioFilters() {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Quick Filters</h3>
      <div className="space-y-2">
        <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          All Positions
        </Button>
        <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
          <TrendingUp className="h-4 w-4 mr-2 text-secondary" />
          Gainers
        </Button>
        <Button variant="ghost" className="w-full justify-start text-sm" size="sm">
          <TrendingDown className="h-4 w-4 mr-2 text-destructive" />
          Losers
        </Button>
      </div>
    </Card>
  )
}
