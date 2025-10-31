'use client'

/**
 * Responsive Market Data Tabs Wrapper
 * 
 * UX Improvements:
 * - Horizontal scrolling tabs on mobile (no wrap)
 * - Touch-optimized buttons (44px min height)
 * - Snap scrolling for better UX
 * - Visual scroll indicators
 * - Fade-out edges for scrollable areas
 * - Active tab always visible (scroll into view)
 */

import { useRef, useEffect, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ResponsiveTabsProps {
  tabs: Array<{
    id: string
    label: string
    icon: ReactNode
    onClick: () => void
    isActive: boolean
  }>
  className?: string
}

export function ResponsiveTabs({ tabs, className }: ResponsiveTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLButtonElement>(null)

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current
      const activeTab = activeTabRef.current
      
      const containerRect = container.getBoundingClientRect()
      const tabRect = activeTab.getBoundingClientRect()
      
      // Check if tab is outside viewport
      if (tabRect.left < containerRect.left || tabRect.right > containerRect.right) {
        activeTab.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest', 
          inline: 'center' 
        })
      }
    }
  }, [tabs])

  return (
    <div className={cn("relative", className)}>
      {/* Fade Out Left Edge */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-sky/20 to-transparent z-10 pointer-events-none md:hidden" />
      
      {/* Scrollable Tab Container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 px-1"
        style={{
          // Hide scrollbar but keep functionality
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            ref={tab.isActive ? activeTabRef : null}
            onClick={tab.onClick}
            whileTap={{ scale: 0.95 }}
            className={cn(
              // Base styles
              "flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-lg border-3 border-outline transition-all font-mario font-bold text-xs whitespace-nowrap flex-shrink-0 snap-center",
              // Touch target
              "min-h-[44px] min-w-[80px] sm:min-w-[100px]",
              // Active state
              tab.isActive
                ? "bg-luigi text-white shadow-[3px_3px_0_var(--outline-black)] scale-[0.98]"
                : "bg-white text-outline shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 active:translate-y-0"
            )}
          >
            <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0">
              {tab.icon}
            </span>
            <span className="hidden sm:inline">{tab.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Fade Out Right Edge */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-sky/20 to-transparent z-10 pointer-events-none md:hidden" />
    </div>
  )
}

/**
 * Responsive Content Container
 * Ensures proper overflow handling and touch scrolling
 */
interface ResponsiveContentProps {
  children: ReactNode
  className?: string
}

export function ResponsiveContent({ children, className }: ResponsiveContentProps) {
  return (
    <div 
      className={cn(
        "flex-1 overflow-auto scrollbar-thin",
        // Momentum scrolling on iOS
        "overflow-y-scroll [-webkit-overflow-scrolling:touch]",
        className
      )}
    >
      {children}
    </div>
  )
}
