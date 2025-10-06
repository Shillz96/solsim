import type React from "react"
import type { Metadata } from "next"
import { IBM_Plex_Sans, JetBrains_Mono } from "next/font/google"
import localFont from "next/font/local"
import "@/styles/globals.css"
import { NavBar } from "@/components/navigation/nav-bar"
import { BottomNavBar } from "@/components/navigation/bottom-nav-bar"
import { ThemeProvider } from "@/components/theme-provider"
import { GlobalErrorBoundary } from "@/components/error-boundary-enhanced"
import { QueryProvider } from "@/lib/query-provider"
import { PWAProvider, PWAInstallPrompt, PWAUpdatePrompt } from "@/lib/pwa-utils"

const radnikaNext = localFont({
  src: "./fonts/Radnika-Medium.otf",
  variable: "--font-radnika-next",
})
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-ibm-plex-sans",
})
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-jetbrains-mono",
})

export const metadata: Metadata = {
  title: "Sol Sim - Solana Paper Trading",
  description: "Practice Solana trading without risk. Real-time market data, zero financial risk.",
  generator: "v0.app",
}

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${radnikaNext.variable} ${ibmPlexSans.variable} ${jetBrainsMono.variable} font-sans`}>
        <GlobalErrorBoundary>
          <QueryProvider>
            <PWAProvider>
              <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
                <NavBar />
                <main className="min-h-screen pt-16 pb-20 md:pb-12">{children}</main>
                <BottomNavBar />
                <PWAInstallPrompt />
                <PWAUpdatePrompt />
              </ThemeProvider>
            </PWAProvider>
          </QueryProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  )
}
