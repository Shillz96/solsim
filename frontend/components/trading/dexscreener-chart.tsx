"use client"

import { useState, useEffect, useRef } from "react"

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
    <div className="h-full w-full overflow-hidden relative bg-white">
      {/* Preconnect to DexScreener for faster loading */}
      <link rel="preconnect" href="https://dexscreener.com" />
      <link rel="dns-prefetch" href="https://dexscreener.com" />

      {/* Loading overlay with better UX */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-12 w-12 border-4 border-[var(--luigi-green)]/20 border-t-[var(--luigi-green)] rounded-full animate-spin"></div>
              <div className="absolute inset-0 h-12 w-12 border-2 border-[var(--mario-red)]/20 border-b-[var(--mario-red)] rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <div className="text-center">
              <span className="text-sm font-bold font-mario">Loading Chart</span>
              <p className="text-xs text-muted-foreground mt-1">Fetching from DexScreener...</p>
            </div>
          </div>
        </div>
      )}

      {/* DexScreener iframe with optimized parameters */}
      <iframe
        ref={iframeRef}
        src={`https://dexscreener.com/solana/${currentToken}?embed=1&theme=light&trades=0&info=0&timezone=UTC`}
        className="h-full w-full block border-0"
        style={{
          minHeight: "100%",
          height: "100%",
          width: "100%",
          touchAction: "pan-x pan-y",
          display: "block",
          verticalAlign: "top",
          border: "none",
          margin: 0,
          padding: 0,
        }}
        title={`DexScreener chart for ${currentToken}`}
        aria-label="Token price chart"
        onLoad={handleIframeLoad}
        sandbox="allow-scripts allow-same-origin allow-forms"
        loading="eager"
      />
      
      {/* Custom attribution overlay with better styling */}
      <div className="absolute bottom-2 right-2 z-20">
        <div className="bg-[var(--outline-black)]/90 text-white px-2 py-1 rounded text-[10px] font-bold border border-white/20">
          Tracked by DexScreener
        </div>
      </div>
    </div>
  )
}
