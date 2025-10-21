"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SimplePageHeaderProps {
  title: string
  subtitle: string
  icon?: ReactNode
  actions?: ReactNode
  className?: string
}

export function SimplePageHeader({ 
  title, 
  subtitle, 
  icon,
  actions,
  className
}: SimplePageHeaderProps) {
  return (
    <motion.div 
      className={cn("mb-6 sm:mb-8", className)}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-blue-500/5 rounded-lg -z-10"></div>
        <div className="p-4 sm:p-6 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              {icon && (
                <div className="p-2 sm:p-3 rounded-lg bg-primary/20">
                  {icon}
                </div>
              )}
              <div>
                <h1
                  className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text"
                  style={{ viewTransitionName: 'page-title' } as React.CSSProperties}
                >
                  {title}
                </h1>
                <p className="text-sm sm:text-lg text-muted-foreground">{subtitle}</p>
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-2 self-start sm:self-center">
                {actions}
              </div>
            )}
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-primary via-blue-500 to-accent rounded-full"></div>
        </div>
      </div>
    </motion.div>
  )
}

// Portfolio-specific actions component
export function PortfolioPageActions() {
  return (
    <motion.div 
      className="flex items-center gap-2 p-2 rounded-lg bg-card/50 border border-border/50"
      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.1)" }}
      transition={{ duration: 0.2 }}
    >
      <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      <span className="text-xs sm:text-sm font-medium">Live</span>
    </motion.div>
  )
}