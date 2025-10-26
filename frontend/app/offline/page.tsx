"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WifiOff, RefreshCw, TrendingUp, Wallet } from "lucide-react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { PortfolioResponse } from "@/lib/types/backend"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [lastOnline, setLastOnline] = useState<Date | null>(null)
  // For offline page, we can simulate having cached portfolio data
  const balance = { balance: '100.00' }
  const portfolio: PortfolioResponse | null = null

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine
      setIsOnline(online)
      if (!online && !lastOnline) {
        setLastOnline(new Date())
      } else if (online) {
        setLastOnline(null)
      }
    }

    // Initial check
    updateOnlineStatus()

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [lastOnline])

  const handleRetry = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
    }
    window.location.reload()
  }

  const formatLastOnline = () => {
    if (!lastOnline) return ''
    const now = new Date()
    const diff = now.getTime() - lastOnline.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m ago`
    return `${minutes}m ago`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-6"
      >
        {/* Mario-themed Header */}
        <div className="bg-gradient-to-r from-[var(--mario-red)]/20 to-[var(--star-yellow)]/20 border-4 border-outline rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)] relative overflow-hidden">
          <div className="absolute top-2 right-2 flex gap-2">
            <img src="/icons/mario/fire.png" alt="Fire" width={24} height={24} />
            <img src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-16 h-16 rounded-full bg-mario border-4 border-outline flex items-center justify-center shadow-[4px_4px_0_var(--outline-black)]"
            >
              <WifiOff className="h-8 w-8 text-white" />
            </motion.div>

            <h1 className="font-mario text-2xl text-outline">You're Offline</h1>
            <p className="text-outline font-bold text-center">
              Check your internet connection and try again. Some cached data is still available.
            </p>

            {!isOnline && lastOnline && (
              <div className="bg-star border-3 border-outline rounded-lg px-3 py-1 shadow-[2px_2px_0_var(--outline-black)]">
                <span className="text-xs font-mario font-bold text-outline">
                  Last online: {formatLastOnline()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Retry Button */}
        <div className="bg-card border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
          <Button 
            onClick={handleRetry} 
            className="w-full mario-btn bg-luigi text-white border-3 border-outline shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario"
            disabled={!isOnline}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isOnline ? 'Retry Connection' : 'Waiting for Connection...'}
          </Button>
        </div>

        {/* Show cached data if available */}
        {balance && (
          <div className="bg-card border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-luigi border-3 border-outline flex items-center justify-center shadow-[2px_2px_0_var(--outline-black)]">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <h2 className="font-mario font-bold text-outline">Cached Data</h2>
              <div className="bg-mario border-2 border-outline rounded px-2 py-1 shadow-[1px_1px_0_var(--outline-black)]">
                <span className="text-xs font-mario font-bold text-white">Offline</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-sky/20 border-3 border-outline rounded-lg shadow-[2px_2px_0_var(--outline-black)]">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-outline" />
                <span className="text-sm font-bold text-outline">Balance</span>
              </div>
              <span className="font-mono text-sm font-bold text-outline">{parseFloat(balance.balance).toFixed(2)} SOL</span>
            </div>

            <div className="text-xs text-center text-outline font-bold mt-4 bg-star/20 border-2 border-outline rounded-lg p-3 shadow-[1px_1px_0_var(--outline-black)]">
              📋 This data was cached when you were last online.<br />
              Reconnect to get the latest updates.
            </div>
          </div>
        )}

        <div className="text-center space-y-3 bg-card border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
          <p className="text-sm text-outline font-bold">
            💡 <strong>PWA Features Active:</strong>
          </p>
          <div className="text-xs text-outline space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-luigi font-bold">✓</span>
              <span>Cached portfolio data available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-luigi font-bold">✓</span>
              <span>Offline trading queue enabled</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-luigi font-bold">✓</span>
              <span>Background sync when online</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
