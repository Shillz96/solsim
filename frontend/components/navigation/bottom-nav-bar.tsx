"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { TrendingUp, Wallet, Trophy, Gift, Eye, Zap, Map, BookOpen, Rocket, Info, ChevronDown } from "lucide-react"
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
import { Copy, ExternalLink } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CartridgePill } from "@/components/ui/cartridge-pill"
import { useWindowManager, useWindowTemplate } from "@/components/window/WindowManager"
import { WalletTrackerContent } from "@/components/wallet-tracker/wallet-tracker-content"
import MarketHover from "@/components/market/MarketHover"

// Percentage formatting now inline

// 1UP SOL Token CA
const ONEUP_TOKEN_CA = "Ggs6QKLyWWtZxxi5ZS61MADcgcx362vpiQmgs4c5pump"

// Info dropdown items for bottom nav
const infoItems = [
  { href: "/rewards", icon: Gift, label: "Rewards", iconSrc: "/icons/mario/star.png" },
  { href: "/docs", icon: BookOpen, label: "Docs", iconSrc: "/icons/mario/game.png" },
  { href: "/roadmap", icon: Map, label: "Roadmap", iconSrc: "/icons/mario/checkered-flag.png" },
]

interface MarketPrice {
  symbol: string
  price: number
  change24h: number
  icon: string
}

interface BottomNavBarProps {
  className?: string
}

export function BottomNavBar({ className }: BottomNavBarProps = {}) {
  const pathname = usePathname()
  const { prices, subscribe, unsubscribe } = usePriceStreamContext()
  const {
    activeBalance,
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
    { symbol: "SOL", price: 250, change24h: 0, icon: "/icons/solana.png" },
    { symbol: "BTC", price: 50000, change24h: 0, icon: "/icons/btc.png" },
    { symbol: "ETH", price: 3000, change24h: 0, icon: "/icons/eth.png" },
  ])
  const [lastPriceFetch, setLastPriceFetch] = useState<number>(0)
  const [priceFetchAttempts, setPriceFetchAttempts] = useState<number>(0)

  // Function to copy CA to clipboard
  const copyCAToClipboard = () => {
    navigator.clipboard.writeText(ONEUP_TOKEN_CA)
    toast({
      title: "✅ CA Copied!",
      description: "1UP SOL token address copied to clipboard",
      duration: 2000,
    })
  }

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
      setMarketPrices(prev => prev.map(market => 
        market.symbol === "SOL" 
          ? { ...market, price: solPrice.price, change24h: solPrice.change24h || 0 }
          : market
      ))
    }
  }, [prices.get("So11111111111111111111111111111111111111112")])

  // Fetch crypto prices on mount as a fallback with rate limiting and exponential backoff
  useEffect(() => {
    const fetchCryptoPrices = async () => {
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
        console.warn('Max crypto price fetch attempts reached, giving up')
        return
      }

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/market/crypto-prices`)

        if (!response.ok) {
          throw new Error(`Backend API error: ${response.status}`)
        }

        const data = await response.json()

        if (data.solana?.usd || data.bitcoin?.usd || data.ethereum?.usd) {
          setMarketPrices(prev => prev.map(market => {
            let newPrice = market.price
            let newChange = market.change24h

            if (market.symbol === "SOL" && data.solana?.usd) {
              newPrice = data.solana.usd
              newChange = data.solana.usd_24h_change || 0
            } else if (market.symbol === "BTC" && data.bitcoin?.usd) {
              newPrice = data.bitcoin.usd
              newChange = data.bitcoin.usd_24h_change || 0
            } else if (market.symbol === "ETH" && data.ethereum?.usd) {
              newPrice = data.ethereum.usd
              newChange = data.ethereum.usd_24h_change || 0
            }

            return {
              ...market,
              price: newPrice,
              change24h: newChange
            }
          }))

          // Reset attempts on success
          setPriceFetchAttempts(0)
        }
      } catch (error) {
        console.warn('Failed to fetch crypto prices:', error)
        setPriceFetchAttempts(prev => prev + 1)
      } finally {
        setLastPriceFetch(now)
      }
    }

    fetchCryptoPrices()
  }, [lastPriceFetch, priceFetchAttempts])


  const navItems = [
    { href: "/warp-pipes", icon: TrendingUp, label: "Trade", iconSrc: "/icons/mario/trade.png" },
    { href: "/pipe-network", icon: Map, label: "Network", iconSrc: "/icons/mario/chat.png" },
    { href: "/portfolio", icon: Wallet, label: "Portfolio", iconSrc: "/icons/mario/wallet.png" },
    { href: "/trending", icon: TrendingUp, label: "Trending", iconSrc: "/icons/mario/trending.png" },
  ]

  return (
    <>
      {/* Desktop Bottom Info Bar - Only visible on desktop */}
      <div className={cn(
        "hidden md:block fixed bottom-0 left-0 right-0 z-bottom-nav border-t border-[var(--color-border)] bg-background",
        className
      )}>
        {/* Medium screens: Vertical stack */}
        <div className="mx-auto px-4 max-w-content lg:hidden">
          <div className="flex flex-col gap-2 py-2">
            {/* Top row: Market data */}
            <div className="flex items-center justify-between w-full">
              {/* Market Lighthouse Hover - Left side */}
              <MarketHover
                trigger={
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-transparent hover:bg-card/10 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <div className="relative w-7 h-7">
                        <Image
                          src="/icons/market-data.png"
                          alt="Market Data"
                          fill
                          sizes="28px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </div>
                }
              />

              {/* Crypto prices - Centered */}
              <div className="flex items-center gap-2 md:gap-4">
                {marketPrices.map((market) => {
                // Define glow colors for each crypto
                const getGlowColor = (symbol: string) => {
                  switch (symbol) {
                    case 'SOL': return 'text-luigi'; // Luigi green
                    case 'BTC': return 'text-[#F7931A]'; // Bitcoin orange  
                    case 'ETH': return 'text-[#627EEA]'; // Ethereum blue
                    default: return 'text-star';
                  }
                };

                const getGlowShadow = (symbol: string) => {
                  switch (symbol) {
                    case 'SOL': return 'drop-shadow-[0_0_8px_rgba(26,188,156,0.6)]'; // Luigi green glow
                    case 'BTC': return 'drop-shadow-[0_0_8px_rgba(247,147,26,0.6)]'; // Bitcoin orange glow
                    case 'ETH': return 'drop-shadow-[0_0_8px_rgba(98,126,234,0.6)]'; // Ethereum blue glow
                    default: return 'drop-shadow-[0_0_8px_rgba(255,216,0,0.6)]';
                  }
                };

                return (
                  <div key={market.symbol} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-transparent">
                    <div className="flex items-center gap-1">
                      <div className={`relative h-4 w-4 ${getGlowShadow(market.symbol)}`}>
                        <Image
                          src={market.icon}
                          alt={`${market.symbol} icon`}
                          fill
                          sizes="16px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${getGlowColor(market.symbol)}`}>
                      ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })}
              </div>

              {/* Spacer div to balance the layout */}
              <div className="w-5 h-5"></div>
            </div>

            {/* Bottom row: Navigation and social */}
            <div className="flex items-center justify-between">
              {/* Navigation centered */}

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
                {/* More Info - White CartridgePill with Dropdown */}
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <div>
                      <CartridgePill
                        value="More Info"
                        size="sm"
                        bgColor="white"
                        className="cursor-pointer border-2 border-outline text-outline"
                      />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    side="top"
                    className="dropdown-base dropdown-animate-in mb-2 z-bottom-nav"
                    sideOffset={8}
                  >
                    {infoItems.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "dropdown-item",
                            pathname === item.href && "bg-primary/10"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Large screens: Horizontal layout */}
        <div className="hidden lg:block fixed bottom-0 left-0 right-0 z-bottom-nav border-t-3 border-outline bg-card shadow-[0_-4px_0_var(--outline-black)]">
          <div className="mx-auto flex h-[var(--bottom-nav-height)] items-center justify-between px-4 max-w-content">
            {/* Center: Market Prices + Market Lighthouse */}
            <div className="flex items-center justify-center w-full gap-4">
              {/* Market Lighthouse Hover - Left side */}
              <MarketHover
                trigger={
                  <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-transparent hover:bg-card/10 transition-colors">
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <div className="relative w-10 h-10">
                        <Image
                          src="/icons/market-data.png"
                          alt="Market Data"
                          fill
                          sizes="40px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                  </div>
                }
              />

              {/* Crypto prices - Centered */}
              <div className="flex items-center justify-center gap-2 md:gap-4">
                {marketPrices.map((market) => {
                // Define glow colors for each crypto
                const getGlowColor = (symbol: string) => {
                  switch (symbol) {
                    case 'SOL': return 'text-luigi'; // Luigi green
                    case 'BTC': return 'text-[#F7931A]'; // Bitcoin orange  
                    case 'ETH': return 'text-[#627EEA]'; // Ethereum blue
                    default: return 'text-star';
                  }
                };

                const getGlowShadow = (symbol: string) => {
                  switch (symbol) {
                    case 'SOL': return 'drop-shadow-[0_0_8px_rgba(26,188,156,0.6)]'; // Luigi green glow
                    case 'BTC': return 'drop-shadow-[0_0_8px_rgba(247,147,26,0.6)]'; // Bitcoin orange glow
                    case 'ETH': return 'drop-shadow-[0_0_8px_rgba(98,126,234,0.6)]'; // Ethereum blue glow
                    default: return 'drop-shadow-[0_0_8px_rgba(255,216,0,0.6)]';
                  }
                };

                return (
                  <div key={market.symbol} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-transparent">
                    <div className="flex items-center gap-1">
                      <div className={`relative h-4 w-4 ${getGlowShadow(market.symbol)}`}>
                        <Image
                          src={market.icon}
                          alt={`${market.symbol} icon`}
                          fill
                          sizes="16px"
                          className="object-contain"
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${getGlowColor(market.symbol)}`}>
                      ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                );
              })}
              </div>
            </div>

            {/* Right: Wallet Tracker, Leaderboard, More Info */}
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
              {/* More Info - White CartridgePill with Dropdown */}
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <div>
                    <CartridgePill
                      value="More Info"
                      size="sm"
                      bgColor="white"
                      className="hidden lg:inline-grid cursor-pointer border-2 border-outline text-outline"
                    />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  side="top"
                  className="dropdown-base dropdown-animate-in mb-2 z-bottom-nav"
                  sideOffset={8}
                >
                  {infoItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "dropdown-item",
                          pathname === item.href && "bg-primary/10"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

    </>
  )
}
