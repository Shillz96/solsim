'use client'

/**
 * Responsive Mobile Room Layout
 * 
 * UX Best Practices:
 * - Swipeable tabs for chart/data switching
 * - Sticky navigation pills
 * - Smooth transitions with Framer Motion
 * - Touch-optimized controls (44px minimum)
 * - Visual feedback for active state
 * - Optimized for one-handed use
 */

import { useState } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DexScreenerChart } from '@/components/trading/dexscreener-chart'
import { MarketDataPanels } from '@/components/trading/market-data-panels'
import { BarChart3, LineChart, TrendingUp } from 'lucide-react'

interface ResponsiveMobileLayoutProps {
  tokenAddress: string
}

type MobileView = 'chart' | 'data'

export function ResponsiveMobileLayout({ tokenAddress }: ResponsiveMobileLayoutProps) {
  const [activeView, setActiveView] = useState<MobileView>('chart')
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  const handleSwipe = (event: any, info: PanInfo) => {
    // Swipe threshold: 50px
    const threshold = 50

    if (info.offset.x > threshold) {
      // Swiped right - go to chart
      if (activeView === 'data') {
        setSwipeDirection('right')
        setActiveView('chart')
      }
    } else if (info.offset.x < -threshold) {
      // Swiped left - go to data
      if (activeView === 'chart') {
        setSwipeDirection('left')
        setActiveView('data')
      }
    }
  }

  const slideVariants = {
    enter: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: 'left' | 'right') => ({
      x: direction === 'left' ? '-100%' : '100%',
      opacity: 0
    })
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Sticky Navigation Pills */}
      <div className="flex-shrink-0 mb-3">
        <div className="bg-background/50 backdrop-blur-sm rounded-xl border-3 border-outline shadow-[4px_4px_0_var(--outline-black)] p-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setActiveView('chart')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-3 border-outline transition-all font-mario font-bold text-sm",
                "min-h-[44px]", // Touch target
                activeView === 'chart'
                  ? "bg-star text-outline shadow-[3px_3px_0_var(--outline-black)] scale-[0.98]"
                  : "bg-sky/30 text-outline/70 shadow-[2px_2px_0_var(--outline-black)] hover:bg-sky/50"
              )}
            >
              <LineChart className="h-5 w-5" />
              <span className="hidden sm:inline">Chart</span>
            </button>

            <button
              onClick={() => setActiveView('data')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-3 border-outline transition-all font-mario font-bold text-sm",
                "min-h-[44px]", // Touch target
                activeView === 'data'
                  ? "bg-star text-outline shadow-[3px_3px_0_var(--outline-black)] scale-[0.98]"
                  : "bg-sky/30 text-outline/70 shadow-[2px_2px_0_var(--outline-black)] hover:bg-sky/50"
              )}
            >
              <BarChart3 className="h-5 w-5" />
              <span className="hidden sm:inline">Market</span>
            </button>
          </div>
        </div>
      </div>

      {/* Swipeable Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleSwipe}
          className="h-full"
        >
          <AnimatePresence mode="wait" custom={swipeDirection}>
            {activeView === 'chart' ? (
              <motion.div
                key="chart"
                custom={swipeDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.3 }}
                className="h-full"
              >
                {/* Chart View */}
                <div className="h-full flex flex-col gap-3">
                  {/* Chart - Responsive height based on screen size */}
                  <div className="h-[50vh] sm:h-[55vh] md:h-[60vh] lg:h-[65vh] min-h-[350px] max-h-[700px] overflow-hidden rounded-xl border-3 border-outline shadow-[4px_4px_0_var(--outline-black)]">
                    <DexScreenerChart tokenAddress={tokenAddress} />
                  </div>

                  {/* Quick Stats Preview - Better on tablets */}
                  <div className="flex-1 min-h-[120px] overflow-hidden rounded-xl border-3 border-outline shadow-[4px_4px_0_var(--outline-black)] bg-sky/20 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-mario font-bold text-sm sm:text-base text-outline">
                        Quick Stats
                      </h3>
                      <button
                        onClick={() => setActiveView('data')}
                        className="text-xs sm:text-sm text-outline/70 hover:text-outline flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-outline/30 hover:border-outline transition-all"
                      >
                        View All
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-outline/60">
                      Swipe left or tap <span className="font-bold">Market</span> to see trades, holders & more
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="data"
                custom={swipeDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'tween', duration: 0.3 }}
                className="h-full"
              >
                {/* Data View */}
                <div className="h-full overflow-hidden rounded-xl border-3 border-outline shadow-[4px_4px_0_var(--outline-black)]">
                  <MarketDataPanels tokenMint={tokenAddress} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Swipe Indicator Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none z-10">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              activeView === 'chart' 
                ? "bg-star w-6 shadow-[2px_2px_0_var(--outline-black)]" 
                : "bg-outline/30"
            )}
          />
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              activeView === 'data' 
                ? "bg-star w-6 shadow-[2px_2px_0_var(--outline-black)]" 
                : "bg-outline/30"
            )}
          />
        </div>
      </div>
    </div>
  )
}
