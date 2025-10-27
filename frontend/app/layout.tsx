"use client"

import "./theme.css"
import "./globals.css"
import "./wallet-modal-override.css"
import { WindowManager } from "@/components/window"
import { FloatingWindows } from "@/components/window"
import { NavBar } from "@/components/navigation/nav-bar"
import { BottomNavBar } from "@/components/navigation/bottom-nav-bar"
import { SlidingTrendingTicker } from "@/components/trading/sliding-trending-ticker"
import { AppProviders } from "@/components/providers"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isScrollable, setIsScrollable] = useState(false)
  
  // Pages that should be scrollable
  const scrollablePages = ['/', '/portfolio', '/leaderboard', '/trending']
  
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
      </div>
      <main
        id="main-content"
        className="relative scrollbar-none z-content"
        style={{
          height: 'calc(100dvh - var(--navbar-height, 56px) - var(--trending-ticker-height, 60px) - var(--bottom-nav-height, 64px))',
          marginTop: 'calc(var(--navbar-height, 56px) + var(--trending-ticker-height, 60px))',
          overflow: isScrollable ? 'auto' : 'hidden',
          touchAction: 'pan-y', // Optimize touch scrolling on mobile
        }}
        role="main"
      >
        {children}
      </main>
      <BottomNavBar aria-label="Mobile navigation" className="sticky bottom-0 z-bottom-nav" />
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
        <meta name="theme-color" content="#ffffff" />
        <meta name="description" content="1UP SOL - Mario-themed Solana paper trading game" />
        <title>1UP SOL - Mario Paper Trading</title>
      </head>
      <body className={cn("h-full bg-background text-foreground antialiased")}>
        <AppProviders>
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
