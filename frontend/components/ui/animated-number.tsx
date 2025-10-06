"use client"

import * as React from 'react'
import { motion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedNumberProps {
  value: number
  className?: string
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  separator?: string
  formatLarge?: boolean
  colorize?: boolean // Colors positive numbers green, negative red
  glowOnChange?: boolean // Adds glow effect when number changes
}

export function AnimatedNumber({
  value,
  className,
  duration = 1,
  decimals = 2,
  prefix = '',
  suffix = '',
  separator = ',',
  formatLarge = false,
  colorize = false,
  glowOnChange = false
}: AnimatedNumberProps) {
  const [previousValue, setPreviousValue] = React.useState(value)
  const [isAnimating, setIsAnimating] = React.useState(false)
  
  const springValue = useSpring(value, {
    duration: duration * 1000,
    bounce: 0.2
  })
  
  const display = useTransform(springValue, (latest) => {
    if (formatLarge) {
      return formatLargeNumber(latest, decimals, separator)
    }
    return latest.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  })

  React.useEffect(() => {
    if (value !== previousValue) {
      setIsAnimating(true)
      setPreviousValue(value)
      springValue.set(value)
      
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, duration * 1000)
      
      return () => clearTimeout(timer)
    }
  }, [value, previousValue, springValue, duration])

  const getColorClass = () => {
    if (!colorize) return ''
    if (value > 0) return 'number-positive'
    if (value < 0) return 'number-negative'
    return ''
  }

  const formatLargeNumber = (num: number, decimals: number, separator: string): string => {
    const absNum = Math.abs(num)
    const sign = num < 0 ? '-' : ''
    
    if (absNum >= 1e12) {
      return `${sign}${(absNum / 1e12).toFixed(decimals)}T`
    } else if (absNum >= 1e9) {
      return `${sign}${(absNum / 1e9).toFixed(decimals)}B`
    } else if (absNum >= 1e6) {
      return `${sign}${(absNum / 1e6).toFixed(decimals)}M`
    } else if (absNum >= 1e3) {
      return `${sign}${(absNum / 1e3).toFixed(decimals)}K`
    } else {
      return `${sign}${absNum.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })}`
    }
  }

  return (
    <motion.span
      className={cn(
        "number-display font-mono transition-all duration-300",
        getColorClass(),
        {
          'glow-primary': glowOnChange && isAnimating && value > previousValue,
          'glow-accent': glowOnChange && isAnimating && value < previousValue,
        },
        className
      )}
      initial={{ scale: 1 }}
      animate={{ 
        scale: isAnimating ? [1, 1.05, 1] : 1,
      }}
      transition={{ 
        duration: 0.3,
        ease: "easeInOut"
      }}
    >
      {prefix}
      <motion.span>
        {display}
      </motion.span>
      {suffix}
    </motion.span>
  )
}

// Sparkline component for mini charts
interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  className?: string
  color?: string
  showDots?: boolean
}

export function Sparkline({ 
  data, 
  width = 60, 
  height = 20, 
  className,
  color = 'var(--primary)',
  showDots = false
}: SparklineProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const pathVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { 
      pathLength: 1, 
      opacity: 1
    }
  }

  return (
    <motion.svg
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        variants={pathVariants}
        initial="hidden"
        animate="visible"
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
      {showDots && data.map((_, index) => {
        const x = (index / (data.length - 1)) * width
        const y = height - ((data[index] - min) / range) * height
        return (
          <motion.circle
            key={index}
            cx={x}
            cy={y}
            r="1.5"
            fill={color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          />
        )
      })}
    </motion.svg>
  )
}

// Enhanced loading skeleton with shimmer effect
interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({ 
  className, 
  variant = 'rectangular',
  animation = 'wave'
}: SkeletonProps) {
  const baseClasses = {
    text: "h-4 rounded",
    circular: "rounded-full aspect-square",
    rectangular: "rounded"
  }

  const animationClasses = {
    pulse: "animate-pulse",
    wave: "shimmer",
    none: ""
  }

  return (
    <div
      className={cn(
        "bg-muted",
        baseClasses[variant],
        animationClasses[animation],
        className
      )}
    />
  )
}
