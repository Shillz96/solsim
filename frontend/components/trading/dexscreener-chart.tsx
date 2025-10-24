"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface DexScreenerChartProps {
  tokenAddress?: string
}

export function DexScreenerChart({
  tokenAddress = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
}: DexScreenerChartProps) {
  const [isLoading, setIsLoading] = useState(true) // Start with loading true
  const [currentToken, setCurrentToken] = useState(tokenAddress)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Handle token changes with smooth transition
  useEffect(() => {
    if (tokenAddress !== currentToken) {
      setIsLoading(true)
      // Delay the actual token change to prevent jarring transitions
      const timer = setTimeout(() => {
        setCurrentToken(tokenAddress)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [tokenAddress, currentToken])

  // Handle iframe load events
  const handleIframeLoad = () => {
    // Small delay to ensure content is rendered
    setTimeout(() => {
      setIsLoading(false)
    }, 300)
  }

  return (
    <Card className="h-full overflow-hidden border-4 border-[var(--outline-black)] rounded-lg relative p-0" style={{ boxShadow: '6px 6px 0 var(--outline-black)' }}>
      {/* Preconnect to DexScreener for faster loading */}
      <link rel="preconnect" href="https://dexscreener.com" />
      <link rel="dns-prefetch" href="https://dexscreener.com" />

      {/* Loading overlay with better UX */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 h-12 w-12 border-2 border-green-500/20 border-b-green-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="text-center">
              <span className="text-sm font-medium">Loading Chart</span>
              <p className="text-xs text-muted-foreground mt-1">Fetching from DexScreener...</p>
            </div>
          </div>
        </div>
      )}

      {/* DexScreener iframe with optimized parameters */}
      <iframe
        ref={iframeRef}
        src={`https://dexscreener.com/solana/${currentToken}?embed=1&theme=light&trades=0&info=0&timezone=UTC`}
        className="h-full w-full block"
        style={{
          minHeight: "100%",
          height: "100%",
          touchAction: "pan-x pan-y",
          display: "block",
          verticalAlign: "top",
        }}
        title={`DexScreener chart for ${currentToken}`}
        aria-label="Token price chart"
        onLoad={handleIframeLoad}
        sandbox="allow-scripts allow-same-origin allow-forms"
        loading="eager"
      />
    </Card>
  )
}
