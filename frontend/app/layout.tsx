"use client"

import "./theme.css"
import "./globals.css"
import "./wallet-modal-override.css"
import AmbientOverlay from "./ambient-overlay"
import { WindowManager } from "@/components/window"
import { FloatingWindows } from "@/components/window"
import { NavBar } from "@/components/navigation/nav-bar"
import { BottomNavBar } from "@/components/navigation/bottom-nav-bar"
import { SlidingTrendingTicker } from "@/components/trading/sliding-trending-ticker"
import { PortfolioPositionsTicker } from "@/components/portfolio/portfolio-positions-ticker"
import { AppProviders } from "@/components/providers"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { WebVitals } from "@/components/analytics/web-vitals"
import { LowBalanceAlert } from "@/components/rewards/low-balance-alert"

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isScrollable, setIsScrollable] = useState(false)
  
  // Pages that should be scrollable
  const scrollablePages = [
    '/',
    '/portfolio',
    '/leaderboard',
    '/trending',
    '/docs',
    '/roadmap',
    '/rewards',
    '/profile/settings'
  ]
  
  // Only apply scrollable logic after mount to prevent hydration mismatch
  useEffect(() => {
    setIsScrollable(scrollablePages.includes(pathname))
  }, [pathname])

  // Suppress Mixed Content warnings for HTTP IP addresses that are handled gracefully
  useEffect(() => {
    const originalError = console.error
    const originalWarn = console.warn
    
    console.error = (...args) => {
      const message = args[0]?.toString() || ''
      // Suppress Mixed Content warnings for HTTP IP addresses
      if (message.includes('Mixed Content') && message.includes('66.135.23.176')) {
        return
      }
      originalError.apply(console, args)
    }
    
    console.warn = (...args) => {
      const message = args[0]?.toString() || ''
      // Suppress Mixed Content warnings for HTTP IP addresses
      if (message.includes('Mixed Content') && message.includes('66.135.23.176')) {
        return
      }
      originalWarn.apply(console, args)
    }

    return () => {
      console.error = originalError
      console.warn = originalWarn
    }
  }, [])
  
  return (
    <>
      <div>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-rewards-timer focus:px-4 focus:py-2 focus:bg-mario-red-500 focus:text-white focus:rounded focus:shadow-mario focus:font-mario focus:text-sm focus:border-2 focus:border-white"
        >
          Skip to main content
        </a>
        <NavBar aria-label="Primary navigation" />
        <SlidingTrendingTicker />
        <PortfolioPositionsTicker />
      </div>
      <main
        id="main-content"
        className="relative scrollbar-none z-content main-content-height"
        style={{
          marginTop: 'calc(var(--navbar-height, 56px) + var(--trending-ticker-height, 60px) + var(--portfolio-ticker-height, 36px))',
          overflow: isScrollable ? 'auto' : 'hidden',
          touchAction: 'pan-y', // Optimize touch scrolling on mobile
        }}
        role="main"
      >
        {children}
      </main>
      <BottomNavBar aria-label="Mobile navigation" />
      {/* Floating windows render here, positioned absolutely over the page */}
      <FloatingWindows />
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#FFFAE9" />
        
        {/* Primary Meta Tags */}
        <meta name="title" content="1UP SOL - Mario-themed Solana Paper Trading Game" />
        <meta name="description" content="1UP your Solana trading skills! Mario-themed paper trading game with real-time prices, FIFO accounting, and earn rewards. Practice trading without risk!" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://1upsol.fun/" />
        <meta property="og:title" content="1UP SOL - Mario-themed Solana Paper Trading Game" />
        <meta property="og:description" content="1UP your Solana trading skills! Mario-themed paper trading game with real-time prices, FIFO accounting, and earn rewards. Practice trading without risk!" />
        <meta property="og:site_name" content="1UP SOL" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://1upsol.fun/" />
        <meta name="twitter:title" content="1UP SOL - Mario-themed Solana Paper Trading Game" />
        <meta name="twitter:description" content="1UP your Solana trading skills! Mario-themed paper trading game with real-time prices, FIFO accounting, and earn rewards. Practice trading without risk!" />
        <meta name="twitter:creator" content="@1upsolfun" />
        
        <title>1UP SOL - Mario Paper Trading</title>
      </head>
      <body className={cn("h-full bg-background text-foreground antialiased")}>
        <AmbientOverlay />
        <AppProviders>
          <WebVitals />
          <LowBalanceAlert />
          <WindowManager>
            <LayoutContent>
              {children}
            </LayoutContent>
          </WindowManager>
        </AppProviders>
      </body>
    </html>
  )
}
