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
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([
    { symbol: "SOL", price: 250, change24h: 0 }, // Default to reasonable price instead of 0
  ])
  const [showModeConfirm, setShowModeConfirm] = useState<boolean>(false)
  const [pendingMode, setPendingMode] = useState<'PAPER' | 'REAL' | null>(null)
  const [showDepositModal, setShowDepositModal] = useState<boolean>(false)
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false)

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

  return (
    <>
      {/* Mobile Bottom Nav */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[var(--background)] md:hidden",
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
                    "relative z-10",
                    "flex flex-col items-center justify-center gap-1 px-2 py-1"
                  )}
                >
                  {isActive ? (
                    <CartridgePill
                      size="sm"
                      className="px-3"
                      value={item.label}
                      badgeText="•"
                    />
                  ) : (
                    <>
                      <Icon className="h-5 w-5 text-foreground/70 group-hover:text-foreground transition-colors" />
                      <span className="text-[11px] font-mario text-foreground/70">{item.label}</span>
                    </>
                  )}
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
        "hidden md:block fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--color-border)] bg-[var(--background)]",
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
              <div key={market.symbol} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-2 border-[var(--outline-black)]/20">
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-2 border-[var(--outline-black)]/20 cursor-pointer hover:border-[var(--outline-black)]/40 transition-colors"
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

          {/* Right: Wallet Tracker, Leaderboard & Trading Mode */}
          <div className="flex items-center gap-4">
            {/* Wallet Tracker - Blue CartridgePill */}
            <CartridgePill
              value="Wallet Tracker"
              href="/wallet-tracker"
              size="md"
              bgColor="var(--sky-blue)"
            />
            {/* Leaderboard - Green CartridgePill */}
            <CartridgePill
              value="Leaderboard"
              href="/leaderboard"
              size="md"
              bgColor="var(--luigi-green)"
            />
            {/* Trading Mode as CartridgePill */}
            <CartridgePill
              value={tradeMode === "REAL" ? "Mainnet" : "Paper"}
              onClick={() => handleToggleMode(tradeMode === "REAL" ? "PAPER" : "REAL")}
              size="md"
            />
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
          <AlertDialogFooter className="gap-3 pt-4">
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
