"use client"

import { useEffect, useState } from 'react'
import { env } from '../lib/env'
import { LAMPORTS_PER_SOL, lamportsToSolStr, formatLamportsAsSOL } from '../lib/format'

// Simplified version of PriceTick for demonstration
interface PriceTick {
  v: number;
  seq: number;
  mint: string;
  priceLamports: string;
  ts: number;
}

export function WebSocketTester() {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [priceTicks, setPriceTicks] = useState<PriceTick[]>([])

  useEffect(() => {
    console.log('🔍 [HARDENED WS TESTER] Component mounted with new infrastructure')
    console.log('🔍 [HARDENED WS TESTER] Environment validation:', {
      NEXT_PUBLIC_WS_URL: env.NEXT_PUBLIC_WS_URL,
      NEXT_PUBLIC_CHAIN: env.NEXT_PUBLIC_CHAIN,
      isBrowser: typeof window !== 'undefined',
      WebSocketAvailable: typeof WebSocket !== 'undefined'
    })

    // Demonstrate decimal formatting utilities
    console.log('🔍 [DECIMAL UTILS] Testing BigInt/lamports utilities:')
    const testLamports = "1500000000"; // 1.5 SOL in lamports
    console.log(`  ${testLamports} lamports = ${lamportsToSolStr(testLamports)} SOL`)
    console.log(`  Formatted: ${formatLamportsAsSOL(testLamports)}`)
    console.log(`  LAMPORTS_PER_SOL constant: ${LAMPORTS_PER_SOL}`)

    if (typeof window !== 'undefined' && typeof WebSocket !== 'undefined') {
      console.log('🔍 [HARDENED WS TESTER] Starting hardened WebSocket connection to:', env.NEXT_PUBLIC_WS_URL)
      
      let ws: WebSocket | null = null;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let tries = 0;
      let closed = false;

      const connect = () => {
        if (closed) return;
        
        console.log(`� [HARDENED WS] Connecting (attempt ${tries + 1})`)
        ws = new WebSocket(env.NEXT_PUBLIC_WS_URL)
        
        ws.onopen = () => {
          console.log('✅ [HARDENED WS] Connected with heartbeat support!')
          setConnected(true)
          tries = 0
          
          // Start heartbeat (25s interval for Railway/proxy compatibility)
          heartbeat = setInterval(() => {
            if (ws?.readyState === WebSocket.OPEN) {
              ws.send('{"t":"pong"}')
              console.log('💓 [HARDENED WS] Heartbeat sent')
            }
          }, 25000)

          // Subscribe to SOL for testing
          ws.send(JSON.stringify({
            type: "subscribe",
            mint: "So11111111111111111111111111111111111111112"
          }))
        }

        ws.onmessage = (event) => {
          try {
            // Handle ping-pong heartbeat
            if (event.data === "ping") {
              ws?.send('{"t":"pong"}')
              return
            }
            
            const msg = JSON.parse(event.data)
            console.log('📨 [HARDENED WS] Received:', msg.type || msg.t, msg)
            
            setMessages(prev => [...prev.slice(-9), { 
              timestamp: new Date().toLocaleTimeString(), 
              data: msg 
            }])

            // Handle price updates with decimal-safe conversion
            if (msg?.type === "price" || msg?.t === "price") {
              const priceTick: PriceTick = {
                v: 1,
                seq: Date.now(),
                mint: msg.mint,
                priceLamports: msg.priceLamports || convertUsdToLamports(msg.price || 0).toString(),
                ts: msg.timestamp || Date.now()
              }
              
              setPriceTicks(prev => [...prev.slice(-4), priceTick])
              
              // Demonstrate safe decimal conversion
              const solValue = lamportsToSolStr(priceTick.priceLamports)
              console.log(`💰 [DECIMAL SAFE] Price update: ${priceTick.mint} = ${solValue} SOL (${priceTick.priceLamports} lamports)`)
            }
          } catch (error) {
            console.error('❌ [HARDENED WS] Message parse error:', error)
          }
        }

        const reconnect = () => {
          if (closed) return
          
          setConnected(false)
          if (heartbeat) {
            clearInterval(heartbeat)
            heartbeat = null
          }
          
          // Exponential backoff with max 30s
          const delay = Math.min(30000, 1000 * Math.pow(2, tries++))
          console.log(`🔄 [HARDENED WS] Reconnecting in ${Math.round(delay / 1000)}s...`)
          setTimeout(connect, delay)
        }

        ws.onclose = (event) => {
          if (closed) return
          console.log(`🔌 [HARDENED WS] Closed: ${event.code} ${event.reason}`)
          reconnect()
        }
        
        ws.onerror = (error) => {
          if (closed) return
          console.error('❌ [HARDENED WS] Error:', error)
          reconnect()
        }
      }

      connect()

      // Cleanup
      return () => {
        console.log('🧹 [HARDENED WS] Cleaning up connection')
        closed = true
        setConnected(false)
        if (heartbeat) clearInterval(heartbeat)
        ws?.close()
      }
    }
  }, [])

  // Helper function for USD to lamports conversion (simplified)
  const convertUsdToLamports = (usdPrice: number): bigint => {
    const SOL_USD_ESTIMATE = 150 // This should come from actual SOL price
    const solPrice = usdPrice / SOL_USD_ESTIMATE
    return BigInt(Math.round(solPrice * Number(LAMPORTS_PER_SOL)))
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: connected ? 'green' : 'red', 
      color: 'white', 
      padding: '10px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '400px',
      borderRadius: '4px'
    }}>
      <div><strong>🔧 Hardened WebSocket Tester</strong></div>
      <div>Status: {connected ? '✅ Connected with heartbeat' : '❌ Disconnected'}</div>
      <div>URL: {env.NEXT_PUBLIC_WS_URL}</div>
      <div>Chain: {env.NEXT_PUBLIC_CHAIN}</div>
      
      {messages.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '10px' }}>
          <strong>Recent messages:</strong>
          {messages.map((msg, i) => (
            <div key={i} style={{ marginTop: '2px' }}>
              {msg.timestamp}: {msg.data.type || msg.data.t || 'unknown'}
            </div>
          ))}
        </div>
      )}

      {priceTicks.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '10px' }}>
          <strong>🧮 Decimal-safe prices:</strong>
          {priceTicks.map((tick, i) => (
            <div key={i} style={{ marginTop: '2px' }}>
              {tick.mint.slice(0, 8)}...: {formatLamportsAsSOL(tick.priceLamports)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}