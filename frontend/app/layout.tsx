import type React from "react"
import type { Metadata } from "next"
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google"
import localFont from "next/font/local"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { NavBar } from "@/components/navigation/nav-bar"
import { BottomNavBar } from "@/components/navigation/bottom-nav-bar"
import { RealtimeTradeStrip } from "@/components/trading/realtime-trade-strip"
import { AppProviders } from "@/components/providers"

import "./theme.css"
import "./globals.css"
import "./wallet-modal-override.css"

// Typography: IBM Plex Sans Bold for headings, Radnika Next for body
const radnikaNext = localFont({
  src: "./fonts/Radnika-Medium.otf",
  variable: "--font-radnika-next",
})
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-ibm-plex-sans",
})
// JetBrains Mono kept for code/monospace elements only
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "1UP SOL - Solana Paper Trading Game",
  description: "Level up your trading skills! Practice Solana trading, earn XP, compete on leaderboards. Real-time market data, zero financial risk.",
  generator: "v0.app",
}

export const viewport = {
  themeColor: "#A6D8FF", // Mario Sky Blue - light mode only!
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning={false}>
      <body
        className={`${radnikaNext.variable} ${ibmPlexSans.variable} ${jetBrainsMono.variable} font-sans`}
      >
        <AppProviders>
          <div className="sticky top-0 z-50">
            <NavBar aria-label="Primary navigation" />
            <RealtimeTradeStrip
              className="w-full"
              maxTrades={15}
            />
          </div>
          <main
            className="min-h-screen"
            style={{
              paddingBottom: 'var(--bottom-nav-height)'
            }}
            role="main"
          >
            {children}
          </main>
          <BottomNavBar aria-label="Mobile navigation" className="sticky bottom-0 z-50" />
        </AppProviders>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
