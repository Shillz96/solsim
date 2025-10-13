"use client"

import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useState, useEffect } from "react"

export function WebSocketDebugInfo() {
  const { connected, connecting, connectionState, error, prices } = usePriceStreamContext()
  const [envDebug, setEnvDebug] = useState<string>("")
  const [messageLog, setMessageLog] = useState<string[]>([])
  
  useEffect(() => {
    // Check environment variable access
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL
    setEnvDebug(wsUrl || "UNDEFINED")
    
    // Add WebSocket message logging
    if (typeof window !== 'undefined') {
      const originalWebSocket = window.WebSocket
      window.WebSocket = class extends originalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols)
          
          const originalOnMessage = this.onmessage
          this.addEventListener('message', (event) => {
            setMessageLog(prev => [...prev.slice(-4), `📨 ${event.data}`])
          })
        }
      }
    }
  }, [])

  const solPrice = prices.get('So11111111111111111111111111111111111111112')

  // DEBUG: Log what's actually in the prices map
  React.useEffect(() => {
    console.log('🔍 [DEBUG] Prices map state:', {
      size: prices.size,
      keys: Array.from(prices.keys()),
      solData: prices.get('So11111111111111111111111111111111111111112'),
      allPrices: Array.from(prices.entries())
    })
  }, [prices])

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50 max-h-96 overflow-auto">
      <h3 className="font-bold mb-2">🔍 WebSocket Debug</h3>
      <div className="space-y-1">
        <div>Status: <span className={connected ? "text-green-400" : "text-red-400"}>{connectionState}</span></div>
        <div>Connected: {connected ? "✅" : "❌"}</div>
        <div>Connecting: {connecting ? "🔄" : "⏹️"}</div>
        <div>WS URL: {envDebug}</div>
        <div>Error: {error || "None"}</div>
        <div>Prices: {prices.size} tokens</div>
        <div>SOL Price: ${solPrice?.price || "N/A"}</div>
        {Array.from(prices.entries()).slice(0, 3).map(([token, data]) => (
          <div key={token}>
            {token.slice(0, 8)}...: ${data.price.toFixed(4)}
          </div>
        ))}
        {messageLog.length > 0 && (
          <>
            <div className="font-bold mt-2">Recent Messages:</div>
            {messageLog.map((msg, i) => (
              <div key={i} className="text-xs text-gray-300 truncate">{msg}</div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}