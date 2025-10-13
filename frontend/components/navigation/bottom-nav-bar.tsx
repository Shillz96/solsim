"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, TrendingUp, Wallet, Trophy, Twitter, Github, Plus, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { usePriceStreamContext } from "@/lib/price-stream-provider"

// Percentage formatting now inline

interface MarketPrice {
  symbol: string
  price: number
  change24h: number
}

export function BottomNavBar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { prices, subscribe, unsubscribe } = usePriceStreamContext()
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([
    { symbol: "SOL", price: 100, change24h: 2.5 },
  ])

  // Prevent hydration mismatch by only rendering theme toggle after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Subscribe to SOL price updates
  useEffect(() => {
    const solMint = "So11111111111111111111111111111111111111112"
    subscribe(solMint)
    
    return () => {
      unsubscribe(solMint)
    }
  }, [subscribe, unsubscribe])

  // Use SOL price from price stream if available
  useEffect(() => {
    const solMint = "So11111111111111111111111111111111111111112" // SOL mint address
    const solPrice = prices.get(solMint)

    if (solPrice) {
      setMarketPrices([
        { symbol: "SOL", price: solPrice.price, change24h: solPrice.change24h }
      ])
    }
  }, [prices])

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/trade", icon: TrendingUp, label: "Trade" },
    { href: "/portfolio", icon: Wallet, label: "Portfolio" },
    { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  ]

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-2 border-border shadow-none md:hidden" style={{ backgroundColor: 'var(--background)', opacity: 1 }}>
        <div className="flex items-center justify-around h-16">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="relative"
              >
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-300 relative z-10",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <Icon className={cn(
                      "h-5 w-5 transition-all duration-300",
                      isActive && "glow-primary icon-morph"
                    )} />
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="bottomNavIndicator"
                          className="absolute -inset-2 rounded-full bg-primary/10 border border-primary/20"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <span className={cn(
                    "text-xs font-medium transition-all duration-300",
                    isActive && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </nav>

      {/* Desktop/Tablet Bottom Info Bar */}
      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-40 border-t-2 border-border shadow-none" style={{ backgroundColor: 'var(--background)', opacity: 1 }}>
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
              <div key={market.symbol} className="flex items-center gap-3 px-3 py-1 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-sm font-semibold text-foreground">{market.symbol}</span>
                </div>
                <span className="text-sm font-bold text-foreground">
                  ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded",
                    market.change24h > 0 
                      ? "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400" 
                      : market.change24h < 0 
                      ? "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400" 
                      : "text-gray-500 bg-gray-100 dark:bg-gray-800",
                  )}
                >
                  {market.change24h > 0 ? "+" : ""}
                  {market.change24h.toFixed(2)}%
                </span>
                <span className="text-xs text-muted-foreground">24h</span>
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
