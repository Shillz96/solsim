"use client"

import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  Menu, User, Settings, LogOut, Bell, Search, Loader2,
  TrendingUp, Wallet, Target, BarChart3, Home, Zap,
  ChevronDown, Command, Gift, Building2, BookOpen, Map, Info, HelpCircle
} from "lucide-react"
import { useState, useCallback, useEffect, useRef } from "react"

// Dynamic imports for modals to reduce initial bundle size
const AuthModal = dynamic(() => import("@/components/modals/auth-modal").then(mod => ({ default: mod.AuthModal })), {
  ssr: false
})
const PurchaseModal = dynamic(() => import("@/components/modals/purchase-modal").then(mod => ({ default: mod.PurchaseModal })), {
  ssr: false
})
const LevelProgressModal = dynamic(() => import("@/components/level/level-progress-modal").then(mod => ({ default: mod.LevelProgressModal })), {
  ssr: false
})
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { useAuth } from "@/hooks/use-auth"
import { useTradingMode } from "@/lib/trading-mode-context"
import { useQuery } from "@tanstack/react-query"
import * as api from "@/lib/api"
import type { TokenSearchResult } from "@/lib/types/backend"
import { formatUSD } from "@/lib/format"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"
import { useNotifications } from "@/hooks/use-notifications"
import { formatDistanceToNow } from "date-fns"
import { XPBadge } from "@/components/level/xp-progress-bar"
import { useOnboardingContext } from "@/lib/onboarding-provider"
import { ProfileMenu } from "@/components/navigation/profile-menu"
import { WalletBalanceDisplay } from "@/components/navigation/wallet-balance-display"
import { CartridgePill } from "@/components/ui/cartridge-pill"
import { useBalance } from "@/hooks/use-react-query-hooks"

// Enhanced navigation items with better organization
const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    iconSrc: "/Home-10-24-2025.png",
    description: "Overview of your trading activity"
  },
  {
    name: "Trade",
    href: "/warp-pipes",
    icon: TrendingUp,
    iconSrc: "/Trade-10-24-2025.png",
    description: "Buy and sell tokens"
  },
  {
    name: "Pipe Network",
    href: "/pipe-network",
    icon: Map,
    iconSrc: "/Pipe-Network-10-24-2025.png",
    description: "Community hub and learning center"
  },
  {
    name: "Portfolio",
    href: "/portfolio",
    icon: Wallet,
    iconSrc: "/Portfolio-10-24-2025.png",
    description: "Track your positions and P&L"
  },
  {
    name: "Trending",
    href: "/trending",
    icon: TrendingUp,
    iconSrc: "/Trending-10-24-2025.png",
    description: "Discover popular tokens"
  }
  // Removed Docs - now in More Info dropdown
  // {
  //   name: "Monitoring",
  //   href: "/monitoring",
  //   icon: BarChart3,
  //   description: "System status and metrics"
  // }
]

// Info dropdown items for desktop nav
const infoItems = [
  { href: "/rewards", icon: Gift, label: "Rewards", iconSrc: "/icons/mario/gift.png" },
  { href: "/docs", icon: BookOpen, label: "Docs", iconSrc: "/icons/mario/game.png" },
  { href: "/roadmap", icon: Map, label: "Roadmap", iconSrc: "/icons/mario/map.png" },
]

export function NavBar() {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false)
  const [levelModalOpen, setLevelModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  // Search functionality state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
  const [hasMoreResults, setHasMoreResults] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debouncedQuery = useDebounce(searchQuery, 300)

  // Auth and balance data
  const { user, isAuthenticated, logout } = useAuth()
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0
  const { startOnboarding } = useOnboardingContext()
  
  // Trading mode
  const {
    tradeMode,
    switchToRealTrading,
    switchToPaperTrading,
  } = useTradingMode()

  // Notifications data
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()

  const { data: balanceData } = useBalance(user?.id)

  // Fetch user profile for avatar and handle
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => user?.id ? api.getUserProfile(user.id) : null,
    enabled: !!user?.id,
    staleTime: 1 * 60 * 1000 // Reduced from 5 minutes to 1 minute for better data freshness
  })

  const balanceNumber = balanceData ? parseFloat(balanceData.balance) : 0
  const profile = userProfile as any
  const displayName = profile?.displayName || profile?.handle || user?.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=ef4444&backgroundType=solid&fontFamily=Arial&fontSize=40`

  // Enhanced search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setHasMoreResults(false)
      setIsSearchOpen(false)
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsSearching(true)

    try {
      const results = await api.searchTokens(query.trim(), 9) // Request 9 to check if there are more

      if (!abortControllerRef.current.signal.aborted) {
        const hasMore = results.length === 9
        const displayResults = hasMore ? results.slice(0, 8) : results

        setSearchResults(displayResults)
        setHasMoreResults(hasMore)
        setIsSearchOpen(true)
        setSelectedResultIndex(-1) // Reset selection when new results arrive
      }
    } catch (error) {
      if (!abortControllerRef.current.signal.aborted) {
        console.error('Search failed:', error)
        setSearchResults([])
        setHasMoreResults(false)
        setIsSearchOpen(false)
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsSearching(false)
      }
    }
  }, [])

  useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])


  const handleTokenSelect = useCallback((token?: TokenSearchResult, index?: number) => {
    const tokenToSelect = token || (index !== undefined && searchResults[index])
    if (!tokenToSelect) return

    router.push(`/trade?token=${tokenToSelect.mint}&symbol=${tokenToSelect.symbol}&name=${encodeURIComponent(tokenToSelect.name)}`)
    setSearchQuery('')
    setIsSearchOpen(false)
    setSelectedResultIndex(-1)
    setMobileMenuOpen(false)
  }, [router, searchResults])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedResultIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedResultIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedResultIndex >= 0) {
          handleTokenSelect(undefined, selectedResultIndex)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsSearchOpen(false)
        setSelectedResultIndex(-1)
        break
    }
  }, [isSearchOpen, searchResults.length, selectedResultIndex, handleTokenSelect])

  const handleLogout = useCallback(() => {
    logout()
    setMobileMenuOpen(false)
  }, [logout])

  const handleToggleMode = useCallback(async () => {
    try {
      if (tradeMode === 'REAL') {
        await switchToPaperTrading()
      } else {
        await switchToRealTrading()
      }
    } catch (error) {
      console.error('Error switching trading mode:', error)
    }
  }, [tradeMode, switchToRealTrading, switchToPaperTrading])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--background)]"
    >
      <div className="w-full px-4 md:px-6">
        <div className="flex items-center justify-between gap-4 h-[var(--navbar-height)]">
          {/* Logo and Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image
                src="/navbarlogo.svg"
                alt="1UP SOL"
                width={180}
                height={54}
                priority
                className="h-8 md:h-10 w-auto hover:scale-105 transition-transform duration-200"
              />
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden lg:flex items-center gap-2 flex-1 justify-center">
            {navigationItems.slice(0, 6).map((item) => {
              const isActive = pathname === item.href

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 transition-all duration-200 font-mario text-xs h-10 w-auto",
                        isActive && "bg-primary/10 text-primary"
                      )}
                  >
                    <Image 
                      src={
                        item.name === 'Trade' ? '/icons/mario/trade.png' :
                        item.name === 'Portfolio' ? '/icons/mario/wallet.png' :
                        item.name === 'Trending' ? '/icons/mario/trending.png' :
                        item.name === 'Dashboard' ? '/icons/mario/home.png' :
                        item.name === 'Pipe Network' ? '/icons/mario/chat.png' :
                        item.iconSrc
                      }
                      alt={item.name} 
                      width={16} 
                      height={16} 
                      className="object-contain hover:scale-105 transition-transform duration-200" 
                    />
                    <span>{item.name}</span>
                  </Button>
                </Link>
              )
            })}
          </nav>

          {/* Enhanced Search Bar - Hidden on mobile, visible on md+ */}
          <div className="hidden md:flex flex-1 max-w-[400px] lg:max-w-[520px] mx-2 lg:mx-4">
            <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative w-full">
                  <Search className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 h-3.5 md:h-4 w-3.5 md:w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search tokens..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-8 md:pl-10 pr-8 md:pr-10 w-full h-8 md:h-9 text-xs md:text-sm border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] transition-all font-semibold"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 h-3.5 md:h-4 w-3.5 md:w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-full p-0 bg-white border-3 md:border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] md:shadow-[6px_6px_0_var(--outline-black)] rounded-lg md:rounded-xl max-h-80 overflow-y-auto"
                sideOffset={8}
              >
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="p-1.5 md:p-2">
                        <div className="text-[10px] md:text-xs text-muted-foreground px-2 py-1.5 md:py-2 font-mario font-bold border-b-2 md:border-b-3 border-[var(--outline-black)] mb-1 uppercase tracking-wide">
                          Search Results
                        </div>
                        {searchResults.map((token, index) => (
                          <button
                            key={token.mint}
                            onMouseDown={(e) => {
                              e.preventDefault() // Prevent default to avoid focus issues
                              e.stopPropagation() // Stop event from bubbling to document
                              handleTokenSelect(token)
                            }}
                            className={cn(
                              "w-full text-left px-2 md:px-3 py-2 md:py-2.5 rounded-lg border-2 transition-colors duration-150 focus:outline-none",
                              selectedResultIndex === index
                                ? "bg-[var(--star-yellow)]/30 border-[var(--outline-black)]"
                                : "hover:bg-[var(--star-yellow)]/20 border-transparent hover:border-[var(--outline-black)] focus:bg-[var(--star-yellow)]/20 focus:border-[var(--outline-black)]"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {token.logoURI && (
                                  <img
                                    src={token.logoURI}
                                    alt={token.symbol}
                                    className="w-7 h-7 rounded-full border-2 border-[var(--outline-black)] flex-shrink-0"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="font-mario text-xs md:text-sm text-foreground truncate">{token.symbol}</div>
                                  <div className="text-[10px] md:text-xs text-muted-foreground truncate font-bold">
                                    {token.name}
                                  </div>
                                </div>
                              </div>
                              {token.price && (
                                <div className="text-right flex-shrink-0 ml-2">
                                  <div className="text-xs md:text-sm font-bold text-foreground tabular-nums">
                                    ${parseFloat(token.price.toString()).toFixed(6)}
                                  </div>
                                  {solPrice > 0 && (
                                    <div className="text-[10px] md:text-xs text-muted-foreground tabular-nums font-bold">
                                      {formatSolEquivalent(parseFloat(token.price.toString()), solPrice)}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        ))}

                        {hasMoreResults && (
                          <div className="border-t border-[var(--outline-black)] mt-2 pt-2">
                            <button
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                // Navigate to trending page with search query as filter
                                router.push(`/trending?search=${encodeURIComponent(searchQuery)}`)
                                setSearchQuery('')
                                setIsSearchOpen(false)
                                setSelectedResultIndex(-1)
                              }}
                              className="w-full text-center px-2 md:px-3 py-2 rounded-lg bg-[var(--mario-red)] border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all duration-150 font-mario text-xs md:text-sm font-bold text-white hover:bg-[var(--mario-red)]/90"
                            >
                              View all results
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </PopoverContent>
            </Popover>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {isAuthenticated ? (
              <>
                
                {/* Minimal balance pill with constrained width on mobile */}
                <WalletBalanceDisplay variant="minimal" showDropdown className="h-9 max-w-[140px] sm:max-w-none" />

                {/* New compact Profile Menu with integrated notifications */}
                {user && (
                  <div className="hidden md:block">
                    <ProfileMenu
                      displayName={displayName}
                      avatarUrl={avatarUrl}
                      xp={parseFloat(user.rewardPoints?.toString() || '0')}
                      onLogout={handleLogout}
                      onOpenLevelModal={() => setLevelModalOpen(true)}
                      onStartOnboarding={startOnboarding}
                      unreadNotificationCount={unreadCount}
                      notifications={notifications}
                      onMarkAsRead={markAsRead}
                      onMarkAllAsRead={markAllAsRead}
                      onRemoveNotification={removeNotification}
                    />
                  </div>
                )}
              </>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} className="font-semibold h-8 sm:h-9 px-3 sm:px-4 text-sm sm:text-base">
                Sign In
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] bg-white hover:bg-[var(--star-yellow)]/20 h-9 w-9 p-0"
                  aria-label="Open navigation menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 overflow-y-auto">
                <div className="flex flex-col space-y-4 mt-4">
                  {/* XP Display - Mobile */}
                  {isAuthenticated && user && (
                    <div className="px-3 py-2 bg-gradient-to-r from-[var(--star-yellow)]/20 to-[var(--coin-yellow)]/20 border-3 border-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg">
                      <XPBadge currentXP={parseFloat(user.rewardPoints?.toString() || '0')} />
                    </div>
                  )}
                  
                  {/* Trade Mode Toggle - Mobile */}
                  {isAuthenticated && (
                    <div className="px-3">
                      <CartridgePill
                        value={tradeMode === "REAL" ? "Mainnet" : "Paper"}
                        onClick={handleToggleMode}
                        size="sm"
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Notifications Section */}
                  {isAuthenticated && (
                    <div className="space-y-2 pb-4 border-b">
                      <div className="flex items-center justify-between px-3">
                        <div className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          <span className="font-semibold text-sm">Notifications</span>
                          {unreadCount > 0 && (
                            <Badge className="h-5 px-1.5 text-xs">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </Badge>
                          )}
                        </div>
                        {unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="h-7 text-xs px-2"
                          >
                            Mark all read
                          </Button>
                        )}
                      </div>

                      {notifications.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          <Bell className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          <p>No notifications</p>
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-1">
                          {notifications.slice(0, 3).map((notification) => (
                            <div
                              key={notification.id}
                              onClick={() => {
                                if (!notification.read) {
                                  markAsRead(notification.id)
                                }
                              }}
                              className={cn(
                                "flex items-start gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted",
                                !notification.read && "bg-primary/5"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  "text-xs font-medium truncate",
                                  !notification.read && "font-semibold"
                                )}>
                                  {notification.title}
                                </p>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {notification.message}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Navigation Items - Exclude Monitoring */}
                  <div className="space-y-2">
                    {navigationItems
                      .filter(item => item.href !== '/monitoring')
                      .map((item) => {
                        const isActive = pathname === item.href

                        return (
                          <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                            <div className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                              isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                            )}>
                              <Image 
                                src={
                                  item.name === 'Trade' ? '/icons/mario/trade.png' :
                                  item.name === 'Portfolio' ? '/icons/mario/wallet.png' :
                                  item.name === 'Trending' ? '/icons/mario/trending.png' :
                                  item.name === 'Dashboard' ? '/icons/mario/home.png' :
                                  item.name === 'Pipe Network' ? '/icons/mario/chat.png' :
                                  item.iconSrc
                                }
                                alt={item.name} 
                                width={20} 
                                height={20} 
                                className="object-contain" 
                              />
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-muted-foreground">{item.description}</div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    
                    {/* Info Items Section */}
                    <div className="pt-2 border-t">
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                        MORE INFO
                      </div>
                      {infoItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                          <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                            <div className={cn(
                              "flex items-center gap-3 px-3 py-3 rounded-lg transition-colors",
                              isActive ? "bg-primary/10 text-primary" : "hover:bg-muted"
                            )}>
                              <item.icon className="h-5 w-5" />
                              <div>
                                <div className="font-medium">{item.label}</div>
                              </div>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>

                  {/* Profile Section */}
                  {isAuthenticated && (
                    <div className="space-y-2 pt-4 border-t">
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                        ACCOUNT
                      </div>
                      <Link href="/profile/settings" onClick={() => setMobileMenuOpen(false)}>
                        <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors">
                          <Settings className="h-5 w-5" />
                          <div>
                            <div className="font-medium">Settings</div>
                            <div className="text-xs text-muted-foreground">Manage your account</div>
                          </div>
                        </div>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors text-red-600"
                      >
                        <LogOut className="h-5 w-5" />
                        <div>
                          <div className="font-medium">Logout</div>
                          <div className="text-xs text-muted-foreground">Sign out of your account</div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      {isAuthenticated && user && (
        <>
          <PurchaseModal
            open={purchaseModalOpen}
            onOpenChange={setPurchaseModalOpen}
            userId={user.id}
          />
          <LevelProgressModal
            open={levelModalOpen}
            onOpenChange={setLevelModalOpen}
            currentXP={parseFloat(user.rewardPoints?.toString() || '0')}
          />
        </>
      )}
    </motion.header>
  )
}