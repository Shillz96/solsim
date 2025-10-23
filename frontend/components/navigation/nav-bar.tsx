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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import {
  Menu, User, Settings, LogOut, Bell, Search, Loader2,
  TrendingUp, Wallet, Target, BarChart3, Home, Zap,
  ChevronDown, Command, Gift, Building2, BookOpen, Map, Info, HelpCircle
} from "lucide-react"
import { useState, useCallback, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

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
import { NotificationDropdown } from "@/components/notifications/notification-dropdown"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import { useAuth } from "@/hooks/use-auth"
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

// Enhanced navigation items with better organization
const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: Home,
    iconSrc: "/icons/mario/home.png",
    description: "Overview of your trading activity"
  },
  {
    name: "Trade",
    href: "/trade",
    icon: TrendingUp,
    iconSrc: "/icons/mario/trade.png",
    description: "Buy and sell tokens"
  },
  {
    name: "Stocks",
    href: "/stocks",
    icon: Building2,
    iconSrc: "/icons/mario/stocks.png",
    description: "Trade tokenized stocks"
  },
  {
    name: "Portfolio",
    href: "/portfolio",
    icon: Wallet,
    iconSrc: "/icons/mario/wallet.png",
    description: "Track your positions and P&L"
  },
  {
    name: "Perps",
    href: "/perps",
    icon: Zap,
    iconSrc: "/icons/mario/thunder.png",
    description: "Leverage trading with perpetual futures"
  },
  {
    name: "Trending",
    href: "/trending",
    icon: TrendingUp,
    iconSrc: "/icons/mario/trending.png",
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
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchResultsRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debouncedQuery = useDebounce(searchQuery, 300)

  // Auth and balance data
  const { user, isAuthenticated, logout } = useAuth()
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0
  const { startOnboarding } = useOnboardingContext()

  // Notifications data
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()

  const { data: balanceData } = useQuery({
    queryKey: ['user-balance', user?.id],
    queryFn: () => api.getWalletBalance(user!.id),
    enabled: !!user,
    staleTime: 30000,
  })

  // Fetch user profile for avatar and handle
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => user?.id ? api.getUserProfile(user.id) : null,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000
  })

  const balanceNumber = balanceData ? parseFloat(balanceData.balance) : 0
  const profile = userProfile as any
  const displayName = profile?.displayName || profile?.handle || user?.email?.split('@')[0] || 'User'
  const avatarUrl = profile?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=ef4444&backgroundType=solid&fontFamily=Arial&fontSize=40`

  // Enhanced search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsSearching(true)
    
    try {
      const results = await api.searchTokens(query.trim(), 8)
      
      if (!abortControllerRef.current.signal.aborted) {
        setSearchResults(results)
        setShowResults(true)
      }
    } catch (error) {
      if (!abortControllerRef.current.signal.aborted) {
        console.error('Search failed:', error)
        setSearchResults([])
        setShowResults(false)
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

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // Check if click is inside search input or search results
      const isInsideSearchInput = searchRef.current?.contains(target)
      const isInsideSearchResults = searchResultsRef.current?.contains(target)

      console.log('🖱️ Click detected:', {
        isInsideSearchInput,
        isInsideSearchResults,
        targetElement: target.tagName
      })

      // Only close if click is outside both elements
      if (!isInsideSearchInput && !isInsideSearchResults) {
        console.log('❌ Closing search results - click was outside')
        setShowResults(false)
      }
    }

    if (showResults) {
      // Small delay to prevent immediate closure on the same click that opened results
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 0)

      return () => {
        clearTimeout(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showResults])

  const handleTokenSelect = useCallback((token: TokenSearchResult) => {
    console.log('🔍 handleTokenSelect called for:', token.symbol)
    console.log('📍 Navigating to:', `/trade?token=${token.mint}&symbol=${token.symbol}&name=${encodeURIComponent(token.name)}`)
    router.push(`/trade?token=${token.mint}&symbol=${token.symbol}&name=${encodeURIComponent(token.name)}`)
    setSearchQuery('')
    setShowResults(false)
    setMobileMenuOpen(false)
  }, [router])

  const handleLogout = useCallback(() => {
    logout()
    setMobileMenuOpen(false)
  }, [logout])

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 w-full border-b border-border/20 bg-[#FFFAE9]"
      style={{ viewTransitionName: 'main-nav' } as React.CSSProperties}
    >
      <div className="w-full px-6">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Logo and Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center flex-shrink-0" style={{ viewTransitionName: 'logo' } as React.CSSProperties}>
              <Image
                src="/navbarlogo.svg"
                alt="1UP SOL"
                width={180}
                height={54}
                priority
                className="h-10 w-auto hover:scale-105 transition-transform duration-200"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-2">
              {navigationItems.slice(0, 6).map((item) => {
                const isActive = pathname === item.href

                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 transition-all duration-200 font-mario text-xs h-9",
                        isActive && "bg-primary/10 text-primary"
                      )}
                    >
                      <Image src={item.iconSrc} alt={item.name} width={16} height={16} className="object-contain" />
                      <span className="hidden lg:inline">{item.name}</span>
                    </Button>
                  </Link>
                )
              })}
              
              {/* More Info Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 transition-all duration-200 font-mario text-xs h-9",
                      infoItems.some(item => pathname === item.href) && "bg-primary/10 text-primary"
                    )}
                  >
                    <Info className="h-4 w-4" />
                    <span className="hidden lg:inline">More Info</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="start"
                  className="bg-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]"
                >
                  {infoItems.map((item) => (
                    <DropdownMenuItem key={item.href} asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 cursor-pointer font-mario",
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
            </nav>
          </div>

          {/* Enhanced Search Bar - Hidden on mobile, visible on md+ */}
          <div className="hidden md:flex flex-1 max-w-md mx-6 relative" ref={searchRef}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 w-full h-9 border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] focus:shadow-[3px_3px_0_var(--outline-black)] transition-all font-bold"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Enhanced Search Results - Positioned relative to search input */}
            {showResults && searchResults.length > 0 && (
              <motion.div
                ref={searchResultsRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-xl z-[100] max-h-80 overflow-y-auto"
              >
                  <div className="p-2">
                    <div className="text-xs text-muted-foreground px-2 py-2 font-mario font-bold border-b-3 border-[var(--outline-black)] mb-1 uppercase tracking-wide">
                      Search Results
                    </div>
                    {searchResults.map((token) => (
                      <button
                        key={token.mint}
                        onMouseDown={(e) => {
                          console.log('👆 Button onMouseDown for:', token.symbol)
                          e.preventDefault() // Prevent default to avoid focus issues
                          e.stopPropagation() // Stop event from bubbling to document
                          handleTokenSelect(token)
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--star-yellow)]/20 border-2 border-transparent hover:border-[var(--outline-black)] transition-colors duration-150 focus:bg-[var(--star-yellow)]/20 focus:border-[var(--outline-black)] focus:outline-none"
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
                            <div className="min-w-0">
                              <div className="font-mario text-sm text-foreground">{token.symbol}</div>
                              <div className="text-xs text-muted-foreground truncate max-w-[200px] font-bold">
                                {token.name}
                              </div>
                            </div>
                          </div>
                          {token.price && (
                            <div className="text-right flex-shrink-0 ml-2">
                              <div className="text-sm font-bold text-foreground tabular-nums">
                                ${parseFloat(token.price.toString()).toFixed(6)}
                              </div>
                              {solPrice > 0 && (
                                <div className="text-xs text-muted-foreground tabular-nums font-bold">
                                  {formatSolEquivalent(parseFloat(token.price.toString()), solPrice)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
              </motion.div>
            )}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {isAuthenticated ? (
              <>
                {/* Balance Display - Clickable */}
                <button
                  id="virtual-balance"
                  onClick={() => setPurchaseModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all cursor-pointer group"
                  aria-label="Purchase simulated SOL"
                >
                  <Image src="/icons/mario/wallet.png" alt="Wallet" width={18} height={18} className="group-hover:scale-110 transition-transform" />
                  <div className="text-sm">
                    <div className="font-bold text-foreground font-mario text-xs leading-tight">
                      {balanceData ? `${parseFloat(balanceData.balance).toFixed(2)} SOL` : 'Loading...'}
                    </div>
                    {solPrice > 0 && balanceData && (
                      <div className="hidden sm:block text-[10px] text-foreground/60 font-semibold leading-tight">
                        {formatUSD(parseFloat(balanceData.balance) * solPrice)}
                      </div>
                    )}
                  </div>
                </button>

                {/* XP Badge - Hidden on mobile */}
                {user && (
                  <div className="hidden md:block">
                    <button
                      id="xp-display"
                      onClick={() => setLevelModalOpen(true)}
                      className="cursor-pointer px-3 py-1.5 bg-gradient-to-r from-[var(--star-yellow)] to-[var(--coin-yellow)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all rounded-lg"
                    >
                      <XPBadge
                        currentXP={parseFloat(user.rewardPoints?.toString() || '0')}
                      />
                    </button>
                  </div>
                )}

                {/* Notifications - Hidden on mobile */}
                <div className="hidden md:block">
                  <NotificationDropdown />
                </div>

                {/* User Menu - Hidden on mobile */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="p-0 hover:opacity-80 rounded-lg transition-opacity">
                        <Avatar className="h-9 w-9 rounded-lg border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all bg-[var(--mario-red)]">
                          <AvatarImage src={avatarUrl} alt={displayName} className="rounded-lg object-cover" />
                          <AvatarFallback className="bg-[var(--mario-red)] text-white text-sm font-bold rounded-lg">
                            {displayName?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-white border-3 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
                      <DropdownMenuLabel className="font-mario">My Account</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href="/profile/settings" className="flex items-center gap-2 font-bold">
                          <Settings className="h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[var(--outline-black)]" />
                      <DropdownMenuItem onClick={startOnboarding} className="flex items-center gap-2 font-bold text-[var(--luigi-green)] hover:text-[var(--luigi-green)]">
                        <HelpCircle className="h-4 w-4" />
                        Take Tour
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-[var(--outline-black)]" />
                      <DropdownMenuItem onClick={handleLogout} className="text-[var(--mario-red)] font-bold">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <Button onClick={() => setAuthModalOpen(true)} className="font-semibold h-9 px-4">
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
                              <Image src={item.iconSrc} alt={item.name} width={20} height={20} className="object-contain" />
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