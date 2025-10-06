"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, TrendingUp, Wallet, Trophy, Twitter, Github, Plus, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"

interface MarketPrice {
  symbol: string
  price: number
  change24h: number
}

export function BottomNavBar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([
    { symbol: "SOL", price: 142.56, change24h: 5.23 },
    { symbol: "BTC", price: 67234.12, change24h: -2.15 },
    { symbol: "ETH", price: 3456.78, change24h: 3.45 },
  ])

  // Prevent hydration mismatch by only rendering theme toggle after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/trade", icon: TrendingUp, label: "Trade" },
    { href: "/portfolio", icon: Wallet, label: "Portfolio" },
    { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  ]

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around h-16 relative">
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "glow-primary")} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}

          <Link
            href="/create"
            className="flex flex-col items-center justify-center -mt-8 transition-transform hover:scale-105 active:scale-95"
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/50 glow-primary">
              <Plus className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-medium text-primary mt-1">Create</span>
          </Link>

          {navItems.slice(2).map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "glow-primary")} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Desktop/Tablet Bottom Info Bar */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex h-12 items-center justify-between px-4 max-w-[2400px]">
          {/* Left: Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://x.com/solsim_fun"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Twitter className="h-4 w-4 hover:glow-primary" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Github className="h-4 w-4 hover:glow-primary" />
            </a>
            <span className="text-xs text-muted-foreground">© 2025 Sol Sim</span>
          </div>

          {/* Center: Market Prices */}
          <div className="flex items-center gap-6">
            {marketPrices.map((market) => (
              <div key={market.symbol} className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">{market.symbol}</span>
                <span className="text-xs font-semibold text-foreground">${market.price.toLocaleString()}</span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    market.change24h > 0 ? "text-green-500" : market.change24h < 0 ? "text-red-500" : "text-gray-500",
                  )}
                >
                  {market.change24h > 0 ? "+" : ""}
                  {market.change24h.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>

          {/* Right: Theme Toggle & Quick Trade */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle Button - Only render after mount to prevent hydration mismatch */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
            <Link
              href="/trade"
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
            >
              <TrendingUp className="h-3 w-3" />
              Quick Trade
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
