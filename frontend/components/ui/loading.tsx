'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, TrendingUp, Activity, Wallet, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface LoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'basic' | 'enhanced' | 'shimmer'
  context?: 'portfolio' | 'trading' | 'market' | 'default'
  className?: string
}

/**
 * Unified Loading Component
 * Combines basic Mario loading with enhanced contextual loading
 */
export function Loading({ 
  message = "Loading...", 
  size = 'md', 
  variant = 'basic',
  context = 'default',
  className 
}: LoadingProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  const contextIcons = {
    default: Loader2,
    portfolio: Wallet,
    trading: TrendingUp,
    market: BarChart3
  }

  const Icon = contextIcons[context]

  if (variant === 'shimmer') {
    return <ShimmerSkeleton className={className} />
  }

  if (variant === 'enhanced') {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn("flex flex-col items-center justify-center space-y-3 p-6", className)}
      >
        <Icon className={cn(sizeClasses[size], "animate-spin text-primary")} />
        {message && (
          <p className="text-sm text-muted-foreground text-center max-w-xs font-mario">
            {message}
          </p>
        )}
      </motion.div>
    )
  }

  // Basic Mario loading (default)
  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <div className={`${sizeClasses[size]} border-4 border-[var(--outline-black)] border-t-[var(--star-yellow)] rounded-full animate-spin`} />
      <p className="mt-4 text-[var(--outline-black)] font-mario">{message}</p>
    </div>
  )
}

/**
 * Enhanced skeleton with shimmer effect
 */
export const ShimmerSkeleton: React.FC<{
  className?: string
  height?: string | number
  width?: string | number
}> = ({ className, height = '1rem', width = '100%' }) => {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-md bg-muted animate-pulse",
        className
      )}
      style={{ height, width }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
    </div>
  )
}

/**
 * Contextual loading spinner with messages
 */
export const ContextualLoader: React.FC<{
  message?: string
  variant?: 'default' | 'portfolio' | 'trading' | 'market'
  size?: 'sm' | 'md' | 'lg'
}> = ({ message, variant = 'default', size = 'md' }) => {
  return (
    <Loading 
      message={message}
      size={size}
      variant="enhanced"
      context={variant}
    />
  )
}

/**
 * Enhanced card skeleton for portfolio metrics
 */
export const PortfolioMetricSkeleton: React.FC = () => {
  return (
    <Card className="p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <ShimmerSkeleton width={32} height={32} className="rounded-lg" />
            <ShimmerSkeleton width={120} height={16} />
          </div>
          <div className="space-y-1">
            <ShimmerSkeleton width={100} height={32} />
            <ShimmerSkeleton width={80} height={14} />
          </div>
        </div>
        <ShimmerSkeleton width={60} height={24} className="rounded-full" />
      </div>
    </Card>
  )
}

/**
 * Trading form skeleton
 */
export const TradingFormSkeleton: React.FC = () => {
  return (
    <Card className="p-6 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShimmerSkeleton width={24} height={24} className="rounded" />
          <ShimmerSkeleton width={100} height={20} />
        </div>
        <div className="space-y-2">
          <ShimmerSkeleton width="100%" height={40} />
          <ShimmerSkeleton width="100%" height={40} />
        </div>
        <div className="flex gap-2">
          <ShimmerSkeleton width={80} height={36} className="rounded" />
          <ShimmerSkeleton width={80} height={36} className="rounded" />
        </div>
      </div>
    </Card>
  )
}

/**
 * Table skeleton
 */
export const TableSkeleton: React.FC<{
  rows?: number
  columns?: number
}> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <ShimmerSkeleton key={j} width="100%" height={20} />
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Chart loading skeleton
 */
export const ChartLoadingSkeleton: React.FC<{
  height?: number
}> = ({ height = 400 }) => {
  return (
    <div className="w-full" style={{ height }}>
      <ShimmerSkeleton width="100%" height={height} className="rounded-lg" />
    </div>
  )
}

/**
 * Page loading overlay
 */
export const PageLoadingOverlay: React.FC<{
  message?: string
}> = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <Loading message={message} variant="enhanced" size="lg" />
    </div>
  )
}

/**
 * Empty state component
 */
export const EmptyState: React.FC<{
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-mario text-[var(--outline-black)] mb-2">{title}</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">{description}</p>
      {action}
    </div>
  )
}

// Convenience exports for backward compatibility
export const MarioLoading = Loading
export { Loading as default }
