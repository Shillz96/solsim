/**
 * Enhanced Notification System with better UX patterns
 * 
 * Provides contextual notifications, progress feedback, and user-friendly error handling
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, AlertCircle, Info, AlertTriangle, X, 
  TrendingUp, TrendingDown, Wallet, Zap, Clock, ExternalLink
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatUSD, safePercent } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

/**
 * Enhanced notification types for trading context
 */
export type NotificationType = 
  | 'success' 
  | 'error' 
  | 'warning' 
  | 'info'
  | 'trade-success'
  | 'trade-error'
  | 'portfolio-update'
  | 'price-alert'

export interface EnhancedNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
  timestamp?: Date
  metadata?: {
    symbol?: string
    amount?: number
    price?: number
    pnl?: number
    txHash?: string
    actionUrl?: string
    actionLabel?: string
  }
  persistent?: boolean
  onAction?: () => void
  onDismiss?: () => void
}

/**
 * Trading-specific toast notifications
 */
export const TradeNotifications = {
  /**
   * Successful trade notification with details
   */
  tradeSuccess: (
    symbol: string, 
    action: 'buy' | 'sell', 
    amount: number, 
    price: number,
    txHash?: string
  ) => {
    const { toast } = useToast()
    
    return toast({
      title: `${action === 'buy' ? 'Purchase' : 'Sale'} Successful`,
      description: (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {action === 'buy' ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className="font-semibold">
              {action === 'buy' ? 'Bought' : 'Sold'} {amount.toFixed(6)} {symbol}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Price: {formatUSD(price)} per token
          </div>
          {txHash && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`https://solscan.io/tx/${txHash}`} target="_blank">
                <ExternalLink className="h-3 w-3 mr-1" />
                View Transaction
              </Link>
            </Button>
          )}
        </div>
      ),
      duration: 8000,
    })
  },

  /**
   * Portfolio milestone notification
   */
  portfolioMilestone: (milestone: string, currentValue: number) => {
    const { toast } = useToast()
    
    return toast({
      title: "🎉 Portfolio Milestone!",
      description: (
        <div className="space-y-2">
          <p className="font-semibold">{milestone}</p>
          <p className="text-sm text-muted-foreground">
            Current value: {formatUSD(currentValue)}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/portfolio">
              View Portfolio
            </Link>
          </Button>
        </div>
      ),
      duration: 10000,
    })
  },

  /**
   * Price alert notification
   */
  priceAlert: (
    symbol: string, 
    currentPrice: number, 
    targetPrice: number, 
    direction: 'above' | 'below'
  ) => {
    const { toast } = useToast()
    
    return toast({
      title: `💰 Price Alert: ${symbol}`,
      description: (
        <div className="space-y-2">
          <p>
            {symbol} is now {direction} your target of {formatUSD(targetPrice)}
          </p>
          <p className="font-semibold">
            Current price: {formatUSD(currentPrice)}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/room/${symbol}`}>
              Trade {symbol}
            </Link>
          </Button>
        </div>
      ),
      duration: 0, // Persistent until dismissed
    })
  },

  /**
   * Connection error with retry
   */
  connectionError: (onRetry?: () => void) => {
    const { toast } = useToast()
    
    return toast({
      variant: "destructive",
      title: "Connection Issue",
      description: (
        <div className="space-y-2">
          <p>Unable to connect to real-time data</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry Connection
            </Button>
          )}
        </div>
      ),
      duration: 0,
    })
  }
}

/**
 * In-app notification banner for important updates
 */
export const NotificationBanner: React.FC<{
  notification: EnhancedNotification
  onDismiss?: () => void
}> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(true)

  const getIconAndColors = (type: NotificationType) => {
    switch (type) {
      case 'success':
      case 'trade-success':
        return {
          icon: CheckCircle,
          className: "border-green-200 bg-green-50 text-green-800"
        }
      case 'error':
      case 'trade-error':
        return {
          icon: AlertCircle,
          className: "border-red-200 bg-red-50 text-red-800"
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          className: "border-yellow-200 bg-yellow-50 text-yellow-800"
        }
      case 'portfolio-update':
        return {
          icon: Wallet,
          className: "border-blue-200 bg-blue-50 text-blue-800"
        }
      case 'price-alert':
        return {
          icon: TrendingUp,
          className: "border-purple-200 bg-purple-50 text-purple-800"
        }
      default:
        return {
          icon: Info,
          className: "border-blue-200 bg-blue-50 text-blue-800"
        }
    }
  }

  const { icon: Icon, className } = getIconAndColors(notification.type)

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => onDismiss?.(), 300)
      }, notification.duration)
      
      return () => clearTimeout(timer)
    }
  }, [notification.duration, onDismiss])

  if (!isVisible) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className={cn("rounded-lg border p-4", className)}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold">{notification.title}</h4>
              <p className="text-sm opacity-90">{notification.message}</p>
            </div>
            
            {!notification.persistent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsVisible(false)
                  setTimeout(() => onDismiss?.(), 300)
                }}
                className="p-1 h-auto"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Trading-specific metadata */}
          {notification.metadata && (
            <div className="flex items-center gap-4 text-sm">
              {notification.metadata.symbol && (
                <Badge variant="outline">
                  {notification.metadata.symbol}
                </Badge>
              )}
              
              {notification.metadata.amount && (
                <span className="font-mono">
                  {notification.metadata.amount.toFixed(6)}
                </span>
              )}
              
              {notification.metadata.price && (
                <span className="font-mono">
                  {formatUSD(notification.metadata.price)}
                </span>
              )}
              
              {notification.metadata.pnl !== undefined && (
                <span className={cn(
                  "font-semibold",
                  notification.metadata.pnl >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {notification.metadata.pnl >= 0 ? '+' : ''}
                  {notification.metadata.pnl.toFixed(2)}%
                </span>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {notification.metadata?.actionUrl && notification.metadata?.actionLabel && (
              <Button variant="outline" size="sm" asChild>
                <Link href={notification.metadata.actionUrl}>
                  {notification.metadata.actionLabel}
                </Link>
              </Button>
            )}
            
            {notification.onAction && (
              <Button variant="outline" size="sm" onClick={notification.onAction}>
                Take Action
              </Button>
            )}
          </div>

          {/* Timestamp */}
          {notification.timestamp && (
            <div className="flex items-center gap-1 text-xs opacity-70">
              <Clock className="h-3 w-3" />
              {notification.timestamp.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Global notification provider
 */
export const NotificationProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([])

  const addNotification = (notification: Omit<EnhancedNotification, 'id' | 'timestamp'>) => {
    const newNotification: EnhancedNotification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
    }
    
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]) // Keep max 5 notifications
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <>
      {children}
      
      {/* Notification overlay */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-notification">
        <AnimatePresence>
          {notifications.map((notification) => (
            <NotificationBanner
              key={notification.id}
              notification={notification}
              onDismiss={() => removeNotification(notification.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </>
  )
}

/**
 * Error boundary notification
 */
export const ErrorBoundaryNotification: React.FC<{
  error: Error
  onRetry: () => void
  onReport: () => void
}> = ({ error, onRetry, onReport }) => {
  return (
    <Card className="max-w-notification mx-auto">
      <CardContent className="p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">Something went wrong</h3>
              <p className="text-sm text-muted-foreground">
                We encountered an unexpected error. This has been logged for investigation.
              </p>
            </div>
            
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Technical details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                {error.message}
              </pre>
            </details>
            
            <div className="flex gap-2">
              <Button onClick={onRetry} size="sm">
                Try Again
              </Button>
              <Button variant="outline" onClick={onReport} size="sm">
                Report Issue
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}