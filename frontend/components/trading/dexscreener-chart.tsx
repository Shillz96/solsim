"use client"

import { Card } from "@/components/ui/card"

interface DexScreenerChartProps {
  tokenAddress?: string
}

export function DexScreenerChart({
  tokenAddress = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
}: DexScreenerChartProps) {
  return (
    <Card className="h-full overflow-hidden border-border">
      <iframe
        src={`https://dexscreener.com/solana/${tokenAddress}?embed=1&theme=dark&trades=0&info=0`}
        className="h-full w-full"
        style={{ minHeight: "700px" }}
        title={`DexScreener chart for ${tokenAddress}`}
        aria-label="Token price chart"
      />
    </Card>
  )
}
