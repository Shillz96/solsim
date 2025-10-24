'use client'

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
import { useIsMobile } from "@/hooks/use-mobile"

import "./theme.css"
import "./globals.css"
import "./wallet-modal-override.css"

// Typography: IBM Plex Sans Bold for headings, Radnika Next for body
const radnikaNext = localFont({
  src: "./fonts/Radnika-Medium.otf",
  variable: "--font-radnika-next",
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  display: 'swap',
  preload: true,
})
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-ibm-plex-sans",
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'Segoe UI',
    'sans-serif',
  ],
  display: 'swap',
})
// JetBrains Mono kept for code/monospace elements only
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
  display: 'swap',
})

export const metadata: Metadata = {
  title: "1UP SOL - Solana Paper Trading Game",
  description: "Level up your trading skills! Practice Solana trading, earn XP, compete on leaderboards. Real-time market data, zero financial risk.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: '/navbarlogo.svg', type: 'image/svg+xml' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover", // iOS safe area insets (notch, home indicator)
  // Default to light mode Mario Sky Blue - client-side script will update based on user preference
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#A6D8FF" }, // Mario Sky Blue
    { media: "(prefers-color-scheme: dark)", color: "#1a365d" }   // Dark blue for dark mode
  ]
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      style={{
        // iOS safe area insets for notch/home indicator
        '--safe-area-inset-top': 'env(safe-area-inset-top, 0px)',
        '--safe-area-inset-bottom': 'env(safe-area-inset-bottom, 0px)',
        '--safe-area-inset-left': 'env(safe-area-inset-left, 0px)',
        '--safe-area-inset-right': 'env(safe-area-inset-right, 0px)',
      } as React.CSSProperties}
    >
      <body
        className={`${radnikaNext.variable} ${ibmPlexSans.variable} ${jetBrainsMono.variable} font-sans`}
      >
        <AppProviders>
          <WindowManager>
            {/* Z-Index Hierarchy (from lowest to highest):
             * NavBar/SlidingTrendingTicker: z-50 - Sticky navigation
             * Skip to main content link: z-[60] - Above navigation for accessibility
             * BottomNavBar: z-50 - Sticky bottom navigation
             * WindowManager: z-[100] - Modal/floating windows
             * FloatingWindows: rendered inside WindowManager
             */}
            {/* Skip to main content link for screen reader accessibility */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only absolute top-4 left-4 z-[60] bg-mario-red-500 text-white px-4 py-2 rounded-md font-mario text-sm shadow-mario focus:outline-none focus:ring-2 focus:ring-mario-red-300"
            >
              Skip to main content
            </a>
            <div className="sticky top-0 z-50">
              <NavBar aria-label="Primary navigation" />
              <SlidingTrendingTicker />
            </div>
            <main
              id="main-content"
              className="min-h-[calc(100vh-var(--navbar-height)-var(--bottom-nav-height))] relative"
              style={{
                paddingBottom: 'var(--bottom-nav-height, 60px)' // Fallback to 60px if variable not defined
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
