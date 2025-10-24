"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Home, TrendingUp, Wallet, Trophy, Gift, Eye, Zap, Map, BookOpen, AlertTriangle } from "lucide-react"
import { Twitter as XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useTradingMode } from "@/lib/trading-mode-context"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import * as api from "@/lib/api"
import { Button } from "@/components/ui/button"
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
import { DepositModal } from "@/components/modals/deposit-modal"
import { RealTradingOnboardingModal } from "@/components/modals/real-trading-onboarding-modal"
import { CartridgePill } from "@/components/ui/cartridge-pill"
import { useWindowManager, useWindowTemplate } from "@/components/window/WindowManager"
import { WalletTrackerContent } from "@/components/wallet-tracker/wallet-tracker-content"
import MarketHover from "@/components/market/MarketHover"

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
    realSolBalance,
    isSwitchingMode,
    switchToRealTrading,
    switchToPaperTrading,
  } = useTradingMode()
  const { user } = useAuth()
  const { toast } = useToast()
  const walletModal = useWalletModal()
  const { openWindow, closeWindow } = useWindowManager()

  // Register wallet tracker window template for persistence
  useWindowTemplate({
    id: 'wallet-tracker',
    title: '👀 Wallet Tracker',
    content: () => <WalletTrackerContent compact={true} />,
    defaultBounds: { x: 100, y: 100, width: 900, height: 600 }
  });

  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([
    { symbol: "SOL", price: 250, change24h: 0 }, // Default to reasonable price instead of 0
  ])
  const [showModeConfirm, setShowModeConfirm] = useState<boolean>(false)
  const [pendingMode, setPendingMode] = useState<'PAPER' | 'REAL' | null>(null)
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false)
  const [lastPriceFetch, setLastPriceFetch] = useState<number>(0)
  const [priceFetchAttempts, setPriceFetchAttempts] = useState<number>(0)
  const [dontAskAgain, setDontAskAgain] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('trading-mode-dont-ask-again') === 'true'
    }
    return false
  })

  // Function to open wallet tracker as floating window (compact mode)
  const openWalletTrackerWindow = () => {
    // Close any existing window first to force refresh with new layout
    closeWindow('wallet-tracker')

    // Small delay to ensure clean state, then open window (content will be provided by template)
    setTimeout(() => {
      openWindow({
        id: 'wallet-tracker',
        title: '👀 Wallet Tracker',
        content: <WalletTrackerContent compact={true} />,
        x: 100,
        y: 100,
        width: 900,
        height: 600
      })
    }, 50)
  }

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
  }, [prices.get("So11111111111111111111111111111111111111112")])

  // Fetch SOL price on mount as a fallback with rate limiting and exponential backoff
  useEffect(() => {
    const fetchSolPrice = async () => {
      const now = Date.now()
      const timeSinceLastFetch = now - lastPriceFetch
      const minInterval = 30000 // 30 seconds minimum between fetches
      const maxAttempts = 5

      // Rate limiting: don't fetch if we fetched recently
      if (timeSinceLastFetch < minInterval) {
        return
      }

      // Exponential backoff: wait longer after failures
      if (priceFetchAttempts > 0) {
        const backoffDelay = Math.min(1000 * Math.pow(2, priceFetchAttempts), 30000) // Max 30s
        if (timeSinceLastFetch < backoffDelay) {
          return
        }
      }

      // Stop trying after max attempts
      if (priceFetchAttempts >= maxAttempts) {
        console.warn('Max SOL price fetch attempts reached, giving up')
        return
      }

      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd&include_24hr_change=true')

        if (!response.ok) {
          throw new Error(`CoinGecko API error: ${response.status}`)
        }

        const data = await response.json()

        if (data.solana?.usd) {
          setMarketPrices(prev => {
            // Only update if we still have the default price or if this is a retry
            if (prev[0]?.price === 250 || prev[0]?.price === 0 || priceFetchAttempts > 0) {
              return [{
                symbol: "SOL",
                price: data.solana.usd,
                change24h: data.solana.usd_24h_change || 0
              }]
            }
            return prev
          })

          // Reset attempts on success
          setPriceFetchAttempts(0)
        }
      } catch (error) {
        console.warn('Failed to fetch SOL price:', error)
        setPriceFetchAttempts(prev => prev + 1)
      } finally {
        setLastPriceFetch(now)
      }
    }

    fetchSolPrice()
  }, [lastPriceFetch, priceFetchAttempts])

  // Save "don't ask again" preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('trading-mode-dont-ask-again', dontAskAgain.toString())
    }
  }, [dontAskAgain])

  // Handle trading mode toggle
  const handleToggleMode = (newMode: 'PAPER' | 'REAL') => {
    if (newMode === tradeMode) return

    if (dontAskAgain) {
      // Skip confirmation and directly switch mode
      handleConfirmModeSwitchDirect(newMode)
    } else {
      setPendingMode(newMode)
      setShowModeConfirm(true)
    }
  }

  const handleConfirmModeSwitchDirect = async (mode: 'PAPER' | 'REAL') => {
    try {
      if (mode === 'REAL') {
        await switchToRealTrading()
      } else {
        await switchToPaperTrading()
      }
    } catch (error) {
      console.error('Error switching trading mode:', error)
      // Error handling - you might want to add a toast notification here
    }
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

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--background)] md:hidden pb-[env(safe-area-inset-bottom)]",
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
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="relative"
              >
                <Link
                  href={item.href}
                  className={cn(
                    "relative z-10 flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary/20 text-primary shadow-sm"
                      : "text-foreground/70 hover:text-foreground hover:bg-muted/50"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className={cn(
                    "h-4 w-4 transition-colors",
                    isActive ? "text-primary" : "text-foreground/70"
                  )} />
                  <span className={cn(
                    "text-[10px] font-mario truncate max-w-[60px] transition-colors",
                    isActive ? "text-primary font-semibold" : "text-foreground/70"
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
        className="fixed bottom-[5rem] right-4 z-[51] md:hidden"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
      >
        <Button
          size="icon"
          onClick={openWalletTrackerWindow}
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 bg-gradient-to-br from-primary to-primary/80"
          aria-label="Open Wallet Tracker"
        >
          <Eye className="h-6 w-6" />
        </Button>
      </motion.div>

      {/* Desktop/Tablet Bottom Info Bar */}
      <div className={cn(
        "hidden md:block fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--background)]",
        className
      )}>
        {/* Medium screens: Vertical stack */}
        <div className="mx-auto px-4 max-w-content lg:hidden">
          <div className="flex flex-col gap-2 py-2">
            {/* Top row: Market data */}
            <div className="flex items-center justify-center gap-2 md:gap-4">
              {/* Market Lighthouse Hover */}
              <MarketHover
                trigger={
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white border-2 border-[var(--outline-black)]/20 hover:border-[var(--outline-black)]/40 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--luigi-green)] animate-pulse"></div>
                      <span className="text-xs font-semibold text-foreground font-mario uppercase">Market Data</span>
                    </div>
                  </div>
                }
              />

              {marketPrices.map((market) => (
                <div key={market.symbol} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border-2 border-[var(--outline-black)]/20">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-semibold text-foreground">{market.symbol}</span>
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">
                    ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded tabular-nums",
                      market.change24h > 0
                        ? "text-green-600 bg-green-100"
                        : market.change24h < 0
                        ? "text-red-600 bg-red-100"
                        : "text-muted-foreground bg-muted",
                    )}
                    aria-label={`Price change: ${market.change24h > 0 ? 'up' : market.change24h < 0 ? 'down' : 'unchanged'} ${Math.abs(market.change24h).toFixed(2)} percent`}
                  >
                    {market.change24h > 0 ? "+" : ""}
                    {market.change24h.toFixed(2)}%
                  </span>
                </div>
              ))}

              {/* UP Token Info */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-2 border-[var(--outline-black)]/20 cursor-pointer hover:border-[var(--outline-black)]/40 transition-colors"
                onClick={() => {
                  const ca = "2mksd9Ci9XzBV4CrZ6Fo2SuAtHfrUg3cmdKRjZeApump"
                  navigator.clipboard.writeText(ca)
                  toast({
                    title: "Contract Address Copied",
                    description: "UP token contract address copied to clipboard. Token launching soon!",
                    duration: 3000,
                  })
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
                <span className="text-[10px] text-muted-foreground font-mono hover:text-foreground transition-colors whitespace-nowrap">
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Bottom row: Navigation and social */}
            <div className="flex items-center justify-between">
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
                <span className="text-xs font-mario text-muted-foreground whitespace-nowrap">© 2025 1UP SOL</span>
              </div>

              {/* Right: Controls */}
              <div className="flex items-center gap-4">
                {/* Wallet Tracker - Blue CartridgePill */}
                <CartridgePill
                  value="Wallet Tracker"
                  onClick={openWalletTrackerWindow}
                  size="sm"
                  bgColor="var(--sky-blue)"
                  className="cursor-pointer"
                />
                {/* Leaderboard - Green CartridgePill */}
                <CartridgePill
                  value="Leaderboard"
                  href="/leaderboard"
                  size="sm"
                  bgColor="var(--luigi-green)"
                />
                {/* Trading Mode as CartridgePill */}
                <CartridgePill
                  value={tradeMode === "REAL" ? "Mainnet" : "Paper"}
                  onClick={() => handleToggleMode(tradeMode === "REAL" ? "PAPER" : "REAL")}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Large screens: Horizontal layout */}
        <div className="hidden lg:block">
          <div className="mx-auto flex h-[var(--bottom-nav-height)] items-center justify-between px-4 max-w-content">
            {/* Left: Social Links */}
            <div className="flex items-center gap-2 md:gap-4">
              <a
                href="https://x.com/oneupsol"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <XIcon className="h-3.5 md:h-4 w-3.5 md:w-4 hover:glow-primary" />
              </a>
              <span className="text-[10px] md:text-xs font-mario text-muted-foreground whitespace-nowrap">© 2025 1UP SOL</span>
            </div>

            {/* Center: Market Prices + Market Lighthouse */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Market Lighthouse Hover */}
              <MarketHover
                trigger={
                  <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-white border-2 border-[var(--outline-black)]/20 hover:border-[var(--outline-black)]/40 transition-colors">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--luigi-green)] animate-pulse"></div>
                      <span className="text-[10px] md:text-xs font-semibold text-foreground font-mario uppercase">Market Data</span>
                    </div>
                  </div>
                }
              />

              {marketPrices.map((market) => (
                <div key={market.symbol} className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-white border-2 border-[var(--outline-black)]/20">
                  <div className="flex items-center gap-1 md:gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] md:text-xs font-semibold text-foreground">{market.symbol}</span>
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-foreground tabular-nums">
                    ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] md:text-[10px] font-medium px-1 md:px-1.5 py-0.5 rounded tabular-nums",
                      market.change24h > 0
                        ? "text-green-600 bg-green-100"
                        : market.change24h < 0
                        ? "text-red-600 bg-red-100"
                        : "text-muted-foreground bg-muted",
                    )}
                    aria-label={`Price change: ${market.change24h > 0 ? 'up' : market.change24h < 0 ? 'down' : 'unchanged'} ${Math.abs(market.change24h).toFixed(2)} percent`}
                  >
                    {market.change24h > 0 ? "+" : ""}
                    {market.change24h.toFixed(2)}%
                  </span>
                </div>
              ))}

              {/* UP Token Info */}
              <div
                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-white border-2 border-[var(--outline-black)]/20 cursor-pointer hover:border-[var(--outline-black)]/40 transition-colors"
                onClick={() => {
                  const ca = "2mksd9Ci9XzBV4CrZ6Fo2SuAtHfrUg3cmdKRjZeApump"
                  navigator.clipboard.writeText(ca)
                  toast({
                    title: "Contract Address Copied",
                    description: "UP token contract address copied to clipboard. Token launching soon!",
                    duration: 3000,
                  })
                }}
                title="Click to copy contract address"
              >
                <div className="flex items-center gap-1 md:gap-1.5">
                  <div className="relative h-5 w-5 md:h-6 md:w-6">
                    <Image
                      src="/Socials PFP-1.png"
                      alt="UP Token Logo"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <span className="text-[10px] md:text-xs font-semibold text-star">$UP</span>
                </div>
                <span className="text-[9px] md:text-[10px] text-muted-foreground font-mono hover:text-foreground transition-colors whitespace-nowrap">
                  Coming Soon
                </span>
              </div>
            </div>

            {/* Right: Wallet Tracker, Leaderboard & Trading Mode */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Wallet Tracker - Blue CartridgePill */}
              <CartridgePill
                value="Wallet Tracker"
                onClick={openWalletTrackerWindow}
                size="sm"
                bgColor="var(--sky-blue)"
                className="hidden lg:inline-grid cursor-pointer"
              />
              {/* Leaderboard - Green CartridgePill */}
              <CartridgePill
                value="Leaderboard"
                href="/leaderboard"
                size="sm"
                bgColor="var(--luigi-green)"
                className="hidden lg:inline-grid"
              />
              {/* Trading Mode as CartridgePill */}
              <CartridgePill
                value={tradeMode === "REAL" ? "Mainnet" : "Paper"}
                onClick={() => handleToggleMode(tradeMode === "REAL" ? "PAPER" : "REAL")}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Trading Mode Confirmation Dialog */}
      <AlertDialog open={showModeConfirm} onOpenChange={setShowModeConfirm}>
        <AlertDialogContent className="bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mario text-base text-[var(--outline-black)] flex items-center gap-2 pb-3 border-b-3 border-[var(--color-border)]">
              {pendingMode === 'REAL' && <AlertTriangle className="w-5 h-5 text-[var(--mario-red)]" />}
              Switch to {pendingMode === 'REAL' ? 'Mainnet' : 'Paper'} Trading?
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4 text-[var(--outline-black)] text-sm leading-relaxed">
              {pendingMode === 'REAL' ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-white border-3 border-[var(--mario-red)] rounded-lg shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                    <AlertTriangle className="w-5 h-5 text-[var(--mario-red)] mt-0.5 flex-shrink-0" />
                    <div>
                      <strong className="text-[var(--mario-red)] font-bold block mb-1">Warning: Real Money Trading</strong>
                      <p className="text-[var(--outline-black)] text-xs">
                        You are about to switch to MAINNET trading mode. All trades will use real SOL and execute on Solana mainnet.
                        This cannot be simulated or undone.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--outline-black)] opacity-80">
                    Make sure you understand the risks before proceeding.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-white border-3 border-[var(--luigi-green)] rounded-lg shadow-[2px_2px_0_rgba(0,0,0,0.1)]">
                  <p className="text-[var(--outline-black)] text-xs">
                    You are about to switch to PAPER trading mode. All trades will be simulated using virtual SOL.
                    Your real trading positions will remain separate and unchanged.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center space-x-2 px-6 pb-4">
            <input
              type="checkbox"
              id="dont-ask-again"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label
              htmlFor="dont-ask-again"
              className="text-sm text-[var(--outline-black)] cursor-pointer"
            >
              Don't ask again for future mode switches
            </label>
          </div>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel
              onClick={handleCancelModeSwitch}
              className="font-mario font-bold bg-white text-[var(--outline-black)] border-4 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmModeSwitch}
              className={cn(
                "font-mario font-bold border-4 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-[1px] transition-all text-white",
                pendingMode === 'REAL'
                  ? "bg-[var(--mario-red)] hover:bg-[var(--mario-red)]"
                  : "bg-[var(--luigi-green)] hover:bg-[var(--luigi-green)]"
              )}
            >
              {isSwitchingMode ? 'Switching...' : `Switch to ${pendingMode === 'REAL' ? 'Mainnet' : 'Paper'}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Real Trading Onboarding Modal */}
      <RealTradingOnboardingModal
        open={showOnboardingModal}
        onOpenChange={setShowOnboardingModal}
        userHasBalance={realSolBalance > 0}
        onDepositChoice={() => {
          setShowDepositModal(true)
          setShowOnboardingModal(false)
        }}
        onWalletChoice={() => {
          walletModal.setVisible(true)
          setShowOnboardingModal(false)
        }}
      />

      {/* Deposit Modal */}
      <DepositModal
        open={showDepositModal}
        onOpenChange={setShowDepositModal}
      />
    </>
  )
}
