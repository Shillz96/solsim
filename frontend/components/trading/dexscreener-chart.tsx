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
  const [isLoading, setIsLoading] = useState(false)
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
    setIsLoading(false)
  }

  return (
    <Card className="h-full overflow-hidden border-border relative">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading chart...</span>
          </div>
        </div>
      )}
      
      {/* DexScreener iframe with optimized parameters to reduce console warnings */}
      <iframe
        ref={iframeRef}
        src={`https://dexscreener.com/solana/${currentToken}?embed=1&theme=dark&trades=0&info=0&timezone=UTC`}
        className="h-full w-full"
        style={{ 
          minHeight: "700px",
          touchAction: "pan-x pan-y", // Improve touch handling
        }}
        title={`DexScreener chart for ${currentToken}`}
        aria-label="Token price chart"
        onLoad={handleIframeLoad}
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    </Card>
  )
}
