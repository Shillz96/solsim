'use client'

import { Loader2 } from 'lucide-react'

interface ChartFallbackProps {
  tokenSymbol?: string
  error?: boolean
}

export function ChartFallback({ tokenSymbol, error = false }: ChartFallbackProps) {
  return (
    <div className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] bg-[#FFFAE9] overflow-hidden flex items-center justify-center" style={{ minHeight: '500px' }}>
      <div className="flex flex-col items-center gap-4 p-8">
        {error ? (
          <>
            <div className="text-4xl">📊</div>
            <div className="text-sm font-bold text-[var(--mario-red)]">Chart Unavailable</div>
            <div className="text-xs text-muted-foreground text-center max-w-[200px]">
              Unable to load chart for {tokenSymbol || 'this token'}. Please try refreshing the page.
            </div>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-[var(--mario-red)]" />
            <div className="text-sm font-bold">Loading chart...</div>
            {tokenSymbol && (
              <div className="text-xs text-muted-foreground">
                Fetching {tokenSymbol} data...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
