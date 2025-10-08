"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

/**
 * Dynamically imported Portfolio Chart
 * Reduces initial bundle size by ~300KB (recharts library)
 * Only loads when the chart component is visible
 */
const PortfolioChartComponent = dynamic(
  () => import("./portfolio-chart").then((mod) => ({ default: mod.PortfolioChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading chart...</span>
        </div>
      </div>
    ),
  }
)

export { PortfolioChartComponent as PortfolioChart }

