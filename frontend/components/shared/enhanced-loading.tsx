/**
 * Enhanced Loading Components for Better UX
 * 
 * Provides skeleton loading states, shimmer effects, and contextual loading feedback
 */

import React from 'react'
import { motion } from 'framer-motion'
import { Loader2, TrendingUp, Activity, Wallet, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
  const icons = {
    default: Loader2,
    portfolio: Wallet,
    trading: TrendingUp,
    market: BarChart3
  }
  
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6', 
    lg: 'h-8 w-8'
  }
  
  const Icon = icons[variant]
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center space-y-3 p-6"
    >
      <Icon className={cn(sizes[size], "animate-spin text-primary")} />
      {message && (
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          {message}
        </p>
      )}
    </motion.div>
  )
}

/**
 * Enhanced card skeleton for portfolio metrics
 */
export const PortfolioMetricSkeleton: React.FC = () => {
  return (
    <Card className="p-6">
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
    <Card className="w-full max-w-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <ShimmerSkeleton width={120} height={20} />
            <ShimmerSkeleton width={160} height={16} />
          </div>
          <ShimmerSkeleton width={40} height={40} className="rounded-lg" />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <ShimmerSkeleton width={60} height={16} />
          <ShimmerSkeleton width="100%" height={48} className="rounded-lg" />
        </div>
        <div className="space-y-3">
          <div className="flex justify-between">
            <ShimmerSkeleton width={60} height={16} />
            <ShimmerSkeleton width={80} height={20} />
          </div>
          <ShimmerSkeleton width="100%" height={48} className="rounded-lg" />
          <ShimmerSkeleton width="100%" height={80} className="rounded-lg" />
        </div>
        <ShimmerSkeleton width="100%" height={48} className="rounded-lg" />
      </CardContent>
    </Card>
  )
}

/**
 * Table skeleton for position lists
 */
export const TableSkeleton: React.FC<{
  rows?: number
  columns?: number
}> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 pb-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <ShimmerSkeleton key={i} width={80} height={16} />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-4 gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="space-y-1">
              <ShimmerSkeleton width="80%" height={16} />
              {colIndex === 0 && <ShimmerSkeleton width="60%" height={12} />}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/**
 * Chart loading placeholder
 */
export const ChartLoadingSkeleton: React.FC<{
  height?: number
}> = ({ height = 400 }) => {
  return (
    <div 
      className="flex items-center justify-center border border-border/50 rounded-lg bg-card/50"
      style={{ height }}
    >
      <ContextualLoader 
        variant="market" 
        message="Loading chart data..." 
        size="lg" 
      />
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <Card className="p-8">
        <ContextualLoader message={message} size="lg" />
      </Card>
    </motion.div>
  )
}

/**
 * Enhanced empty state component
 */
export const EmptyState: React.FC<{
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}> = ({ icon, title, description, action }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-8 text-center space-y-4"
    >
      {icon && (
        <div className="p-3 rounded-full bg-muted">
          {icon}
        </div>
      )}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-muted-foreground max-w-md">{description}</p>
      </div>
      {action}
    </motion.div>
  )
}

/**
 * Progress indicator for multi-step processes
 */
export const StepProgress: React.FC<{
  currentStep: number
  totalSteps: number
  steps?: string[]
}> = ({ currentStep, totalSteps, steps }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium">
          {Math.round((currentStep / totalSteps) * 100)}%
        </span>
      </div>
      
      <div className="w-full bg-muted rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-primary h-2 rounded-full"
        />
      </div>
      
      {steps && (
        <div className="flex justify-between text-xs text-muted-foreground">
          {steps.map((step, index) => (
            <span
              key={index}
              className={cn(
                index < currentStep && "text-primary font-medium"
              )}
            >
              {step}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}