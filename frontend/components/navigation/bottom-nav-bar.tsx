"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Home, TrendingUp, Wallet, Trophy, Gift, Eye, Zap, Map, Info, ChevronDown, BookOpen, AlertTriangle } from "lucide-react"
import { Twitter as XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useTradingMode } from "@/lib/trading-mode-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Percentage formatting now inline

interface MarketPrice {
  symbol: string
  price: number
  change24h: number
}

interface BottomNavBarProps {
  className?: string
}

export function BottomNavBar({ className }: BottomNavBarProps = {}) {
  const pathname = usePathname()
  const { prices, subscribe, unsubscribe } = usePriceStreamContext()
  const {
    tradeMode,
    activeBalance,
    isSwitchingMode,
    switchToRealTrading,
    switchToPaperTrading,
  } = useTradingMode()
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([
    { symbol: "SOL", price: 250, change24h: 0 }, // Default to reasonable price instead of 0
  ])
  const [showModeConfirm, setShowModeConfirm] = useState<boolean>(false)
  const [pendingMode, setPendingMode] = useState<'PAPER' | 'REAL' | null>(null)

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

    if (solPrice && solPrice.price > 0) {
      setMarketPrices([
        { symbol: "SOL", price: solPrice.price, change24h: solPrice.change24h || 0 }
      ])
    }
  }, [prices])

  // Fetch SOL price on mount as a fallback
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true')
        const data = await response.json()

        if (data.solana?.usd) {
          setMarketPrices(prev => {
            // Only update if we still have the default price
            if (prev[0]?.price === 250 || prev[0]?.price === 0) {
              return [{
                symbol: "SOL",
                price: data.solana.usd,
                change24h: data.solana.usd_24h_change || 0
              }]
            }
            return prev
          })
        }
      } catch (error) {
        console.warn('Failed to fetch SOL price:', error)
      }
    }

    fetchSolPrice()
  }, [])

  // Handle trading mode toggle
  const handleToggleMode = (newMode: 'PAPER' | 'REAL') => {
    if (newMode === tradeMode) return

    setPendingMode(newMode)
    setShowModeConfirm(true)
  }

  const handleConfirmModeSwitch = async () => {
    if (!pendingMode) return

    try {
      if (pendingMode === 'REAL') {
        await switchToRealTrading()
      } else {
        await switchToPaperTrading()
      }
      setShowModeConfirm(false)
      setPendingMode(null)
    } catch (error) {
      console.error('Error switching trading mode:', error)
      // Error handling - you might want to add a toast notification here
    }
  }

  const handleCancelModeSwitch = () => {
    setShowModeConfirm(false)
    setPendingMode(null)
  }

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/trade", icon: TrendingUp, label: "Trade" },
    { href: "/portfolio", icon: Wallet, label: "Portfolio" },
    { href: "/leaderboard", icon: Trophy, label: "Ranks" },
    { href: "/rewards", icon: Gift, label: "Rewards" },
  ]

  const infoItems = [
    { href: "/rewards", icon: Gift, label: "Rewards" },
    { href: "/docs", icon: BookOpen, label: "Docs" },
    { href: "/roadmap", icon: Map, label: "Roadmap" },
  ]

  const isInfoActive = infoItems.some(item => pathname === item.href)

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border/20 bg-[#FFFAE9] opacity-95 md:hidden",
        className
      )}>
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
                    "text-xs font-mario transition-all duration-300",
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

      {/* Floating Wallet Tracker Button (Mobile) */}
      <motion.div
        className="fixed bottom-20 right-4 z-50 md:hidden"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      >
        <Link href="/wallet-tracker">
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 bg-gradient-to-br from-primary to-primary/80"
          >
            <Eye className="h-6 w-6" />
          </Button>
        </Link>
      </motion.div>

      {/* Desktop/Tablet Bottom Info Bar */}
      <div className={cn(
        "hidden md:block fixed bottom-0 left-0 right-0 z-40 border-t border-border/20 bg-[#FFFAE9] opacity-95",
        className
      )}>
        <div className="mx-auto flex h-12 items-center justify-between px-4 max-w-content">
          {/* Left: Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://x.com/oneupsol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <XIcon className="h-4 w-4 hover:glow-primary" />
            </a>
            <span className="text-xs font-mario text-muted-foreground">© 2025 1UP SOL</span>
          </div>

          {/* Center: Market Prices */}
          <div className="flex items-center gap-4">
            {marketPrices.map((market) => (
              <div key={market.symbol} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs font-semibold text-foreground">{market.symbol}</span>
                </div>
                <span className="text-xs font-bold text-foreground">
                  ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded",
                    market.change24h > 0
                      ? "text-green-600 bg-green-100"
                      : market.change24h < 0
                      ? "text-red-600 bg-red-100"
                      : "text-muted-foreground bg-muted",
                  )}
                >
                  {market.change24h > 0 ? "+" : ""}
                  {market.change24h.toFixed(2)}%
                </span>
              </div>
            ))}
            
            {/* UP Token Info */}
            <div
              className="flex items-center gap-2 px-2 py-1 rounded-lg bg-muted cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={() => {
                const ca = "2mksd9Ci9XzBV4CrZ6Fo2SuAtHfrUg3cmdKRjZeApump"
                navigator.clipboard.writeText(ca)
                // Optional: You could add a toast notification here
              }}
              title="Click to copy contract address"
            >
              <div className="flex items-center gap-1.5">
                <div className="relative h-6 w-6">
                  <Image
                    src="/Socials PFP-1.png"
                    alt="UP Token Logo"
                    fill
                    className="object-contain"
                  />
                </div>
                <span className="text-xs font-semibold text-star">$UP</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono hover:text-foreground transition-colors">
                Coming Soon
              </span>
            </div>
          </div>

          {/* Right: Trading Mode Toggle, Wallet Tracker, Leaderboard, More Info Dropdown & Quick Trade */}
          <div className="flex items-center gap-4">
            {/* Trading Mode Toggle */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#FFFAE9] border-3 border-pipe-900 shadow-[2px_2px_0_var(--outline-black)]">
              <button
                onClick={() => handleToggleMode('PAPER')}
                disabled={isSwitchingMode}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-mario font-bold transition-all border-2 uppercase",
                  tradeMode === 'PAPER'
                    ? "bg-luigi-green-500 text-white border-luigi-green-700 shadow-[2px_2px_0_rgba(0,0,0,0.25)]"
                    : "bg-[#FFFAE9] text-pipe-900 border-pipe-700 hover:bg-white"
                )}
              >
                Paper
              </button>
              <button
                onClick={() => handleToggleMode('REAL')}
                disabled={isSwitchingMode}
                className={cn(
                  "px-2.5 py-1 rounded text-[10px] font-mario font-bold transition-all flex items-center gap-1 border-2 uppercase",
                  tradeMode === 'REAL'
                    ? "bg-mario-red-500 text-white border-mario-red-700 shadow-[2px_2px_0_rgba(0,0,0,0.25)]"
                    : "bg-[#FFFAE9] text-pipe-900 border-pipe-700 hover:bg-white"
                )}
              >
                {tradeMode === 'REAL' && <AlertTriangle className="w-2.5 h-2.5" />}
                Real
              </button>
            </div>
            {/* Wallet Tracker Button */}
            <Link href="/wallet-tracker">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-medium hover:text-primary transition-colors flex items-center gap-1.5 h-8"
              >
                <Eye className="h-4 w-4" />
                Wallet Tracker
              </Button>
            </Link>
            {/* Leaderboard Button */}
            <Link href="/leaderboard">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-medium hover:text-primary transition-colors flex items-center gap-1.5 h-8"
              >
                <Trophy className="h-4 w-4" />
                Leaderboard
              </Button>
            </Link>
            {/* More Info Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-xs font-medium transition-colors flex items-center gap-1.5 h-8",
                    isInfoActive ? "text-primary" : "hover:text-primary"
                  )}
                >
                  <Info className="h-4 w-4" />
                  More Info
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end"
                className="bg-[#FFFAE9] border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]"
              >
                {infoItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 cursor-pointer font-mario",
                          pathname === item.href && "bg-primary/10"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Theme toggle removed - Light mode only! */}
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

      {/* Trading Mode Confirmation Dialog */}
      <AlertDialog open={showModeConfirm} onOpenChange={setShowModeConfirm}>
        <AlertDialogContent className="bg-[#FFFAE9] border-4 border-pipe-900 shadow-[6px_6px_0_var(--outline-black)] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mario text-base text-pipe-900 flex items-center gap-2 pb-3 border-b-3 border-pipe-300">
              {pendingMode === 'REAL' && <AlertTriangle className="w-5 h-5 text-mario-red-500" />}
              Switch to {pendingMode === 'REAL' ? 'Real' : 'Paper'} Trading?
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4 text-pipe-900 text-sm leading-relaxed">
              {pendingMode === 'REAL' ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-white border-3 border-mario-red-500 rounded-lg shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                    <AlertTriangle className="w-5 h-5 text-mario-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-mario-red-600 font-bold block mb-1">Warning: Real Money Trading</strong>
                      <p className="text-pipe-900 text-xs">
                        You are about to switch to REAL trading mode. All trades will use real SOL and execute on Solana mainnet.
                        This cannot be simulated or undone.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-pipe-800">
                    Make sure you understand the risks before proceeding.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-white border-3 border-luigi-green-500 rounded-lg shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                  <p className="text-pipe-900 text-xs">
                    You are about to switch to PAPER trading mode. All trades will be simulated using virtual SOL.
                    Your real trading positions will remain separate and unchanged.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 pt-4">
            <AlertDialogCancel
              onClick={handleCancelModeSwitch}
              className="font-mario font-bold bg-white text-pipe-900 border-3 border-pipe-900 shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[2px_2px_0_var(--outline-black)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmModeSwitch}
              className={cn(
                "font-mario font-bold border-3 shadow-[3px_3px_0_rgba(0,0,0,0.3)] hover:shadow-[2px_2px_0_rgba(0,0,0,0.2)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all",
                pendingMode === 'REAL'
                  ? "bg-mario-red-500 hover:bg-mario-red-600 text-white border-mario-red-700"
                  : "bg-luigi-green-500 hover:bg-luigi-green-600 text-white border-luigi-green-700"
              )}
            >
              {isSwitchingMode ? 'Switching...' : `Switch to ${pendingMode}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
