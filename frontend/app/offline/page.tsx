"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WifiOff, RefreshCw, TrendingUp, Wallet } from "lucide-react"
import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { useBalance, usePortfolio } from "@/lib/api-hooks-v2"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(true)
  const [lastOnline, setLastOnline] = useState<Date | null>(null)
  const { data: balance } = useBalance()
  const { data: portfolio } = usePortfolio()

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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-6"
      >
        <Card className="p-8 text-center space-y-6">
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
            className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center"
          >
            <WifiOff className="h-8 w-8 text-muted-foreground" />
          </motion.div>

          <div>
            <h1 className="text-2xl font-bold mb-2">You're Offline</h1>
            <p className="text-muted-foreground">
              Check your internet connection and try again. Some cached data is still available.
            </p>
          </div>

          {!isOnline && lastOnline && (
            <Badge variant="secondary" className="mx-auto">
              Last online: {formatLastOnline()}
            </Badge>
          )}

          <Button 
            onClick={handleRetry} 
            className="w-full"
            disabled={!isOnline}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isOnline ? 'Retry Connection' : 'Waiting for Connection...'}
          </Button>
        </Card>

        {/* Show cached data if available */}
        {(balance || portfolio) && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Cached Portfolio Data</h2>
              <Badge variant="outline" className="text-xs">Offline</Badge>
            </div>

            {balance && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Balance</span>
                </div>
                <span className="font-mono text-sm">{parseFloat(balance).toFixed(2)} SOL</span>
              </div>
            )}

            {portfolio && (
              <>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">Total Value</span>
                  <span className="font-mono text-sm">
                    {portfolio.totalValue?.sol ? parseFloat(portfolio.totalValue.sol).toFixed(2) : '0.00'} SOL
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium">P&L</span>
                  <span className={`font-mono text-sm ${
                    portfolio.totalPnL?.sol && parseFloat(portfolio.totalPnL.sol) >= 0 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {portfolio.totalPnL?.sol ? parseFloat(portfolio.totalPnL.sol).toFixed(2) : '0.00'} SOL
                  </span>
                </div>

                <div className="text-xs text-center text-muted-foreground mt-4">
                  📋 This data was cached when you were last online.<br />
                  Reconnect to get the latest updates.
                </div>
              </>
            )}
          </Card>
        )}

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            💡 <strong>PWA Features Active:</strong>
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>✅ Cached portfolio data available</div>
            <div>✅ Offline trading queue enabled</div>
            <div>✅ Background sync when online</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}