"use client"

import { motion } from "framer-motion"
import { Check, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ShareProgressIndicatorProps {
  shareCount: number
  maxShares?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ShareProgressIndicator({ 
  shareCount, 
  maxShares = 3, 
  size = 'md',
  className 
}: ShareProgressIndicatorProps) {
  const sizeClasses = {
    sm: {
      container: 'h-6 gap-1',
      dot: 'w-5 h-5',
      icon: 'h-3 w-3',
      text: 'text-[10px]'
    },
    md: {
      container: 'h-8 gap-1.5',
      dot: 'w-6 h-6',
      icon: 'h-3.5 w-3.5',
      text: 'text-xs'
    },
    lg: {
      container: 'h-10 gap-2',
      dot: 'w-8 h-8',
      icon: 'h-4 w-4',
      text: 'text-sm'
    }
  }

  const classes = sizeClasses[size]

  return (
    <div className={cn("inline-flex items-center", classes.container, className)}>
      {Array.from({ length: maxShares }).map((_, index) => {
        const isComplete = index < shareCount
        const isCurrent = index === shareCount

        return (
          <motion.div
            key={index}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05, type: "spring" }}
            className={cn(
              "rounded-full flex items-center justify-center border-2 border-outline transition-all",
              classes.dot,
              isComplete 
                ? "bg-luigi text-white shadow-[2px_2px_0_var(--outline-black)]" 
                : isCurrent
                ? "bg-star/50 text-outline shadow-[1px_1px_0_var(--outline-black)] animate-pulse"
                : "bg-background text-outline/40"
            )}
          >
            {isComplete ? (
              <Check className={classes.icon} />
            ) : (
              <Share2 className={classes.icon} />
            )}
          </motion.div>
        )
      })}
      
      <span className={cn("ml-1 font-mario font-bold text-outline", classes.text)}>
        {shareCount}/{maxShares}
      </span>
    </div>
  )
}
