import type React from "react"
import type { Metadata } from "next"
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google"
import localFont from "next/font/local"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { NavBar } from "@/components/navigation/nav-bar"
import { BottomNavBar } from "@/components/navigation/bottom-nav-bar"
import { SlidingTrendingTicker } from "@/components/trading/sliding-trending-ticker"
import { AppProviders } from "@/components/providers"
import WindowManager from "@/components/window/WindowManager"
import FloatingWindows from "@/components/window/FloatingWindows"

import "./theme.css"
import "./globals.css"
import "./wallet-modal-override.css"

// Simplified font configuration
const radnikaNext = localFont({
  src: "./fonts/Radnika-Medium.otf",
  variable: "--font-radnika-next",
  display: 'swap',
  preload: true,
})

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-ibm-plex-sans",
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: 'swap',
})

export const metadata: Metadata = {
  title: "1UP SOL - Solana Paper Trading Game",
  description: "Level up your trading skills! Practice Solana trading, earn XP, compete on leaderboards. Real-time market data, zero financial risk.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.svg', type: 'image/svg+xml' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    shortcut: '/favicon.ico',
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover", // iOS safe area insets (notch, home indicator)
  themeColor: "#A6D8FF", // Mario Sky Blue - light mode only (no dark mode support per design)
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body
        className={`${radnikaNext.variable} ${ibmPlexSans.variable} ${jetbrainsMono.variable} font-sans`}
        style={{
          // iOS safe area insets for notch and home indicator
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <AppProviders>
          {/* Z-Index Hierarchy:
             * WindowManager (z-[100]): Modal windows and overlays
             * Header elements (z-50): NavBar, Ticker, BottomNavBar, Skip Link
             * Content (z-auto): Main content area
          */}
          <WindowManager>
            <div>
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-mario-red-500 focus:text-white focus:rounded focus:shadow-mario focus:font-mario focus:text-sm focus:border-2 focus:border-white"
              >
                Skip to main content
              </a>
              <NavBar aria-label="Primary navigation" />
              <SlidingTrendingTicker />
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
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
