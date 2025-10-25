"use client"

import { WindowManager } from "@/components/window"
import { FloatingWindows } from "@/components/window"
import { NavBar } from "@/components/navigation/nav-bar"
import { BottomNavBar } from "@/components/navigation/bottom-nav-bar"
import { SlidingTrendingTicker } from "@/components/trading/sliding-trending-ticker"
import { AppProviders } from "@/components/providers"
import { cn } from "@/lib/utils"

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
      <body className={cn("h-full bg-[var(--background)] text-[var(--foreground)] antialiased")}>
        <AppProviders>
          <WindowManager>
            <div className="min-h-screen flex flex-col">
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-mario-red-500 focus:text-white focus:rounded focus:shadow-mario focus:font-mario focus:text-sm focus:border-2 focus:border-white"
              >
                Skip to main content
              </a>
              <NavBar aria-label="Primary navigation" />
              <SlidingTrendingTicker />
              {/* Spacer div to account for fixed ticker height */}
              <div style={{ height: 'var(--trending-ticker-height, 60px)' }} />
            </div>
            <main
              id="main-content"
              className="relative"
              style={{
                minHeight: 'calc(100dvh - var(--navbar-height, 56px) - var(--trending-ticker-height, 60px) - var(--bottom-nav-height, 64px))',
                touchAction: 'pan-y', // Optimize touch scrolling on mobile
              }}
              role="main"
            >
              {children}
            </main>
            <BottomNavBar aria-label="Mobile navigation" className="sticky bottom-0 z-50" />
            {/* Floating windows render here, positioned absolutely over the page */}
            <FloatingWindows />
          </WindowManager>
        </AppProviders>
      </body>
    </html>
  )
}
