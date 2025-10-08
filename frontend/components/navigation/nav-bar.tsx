"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, User, Settings, LogOut, Bell, Search, Loader2 } from "lucide-react"
import { useState, useCallback, useEffect, useRef } from "react"
import { AuthModal } from "@/components/modals/auth-modal"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth, useBalance } from "@/lib/api-hooks"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"
import marketService from "@/lib/market-service"
import type { TokenSearchResult } from "@/lib/types/api-types"

export function NavBar() {
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  
  // Search functionality state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debouncedQuery = useDebounce(searchQuery, 300)
  
  // Use real authentication and balance data
  const { user, isAuthenticated, logout } = useAuth()
  const { data: balance } = useBalance()
  
  // Parse balance for display
  const balanceNumber = balance ? parseFloat(balance) : 0
  const hasNotifications = true // TODO: Implement real notifications

  // Search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    // Cancel previous search if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new abort controller for this search
    abortControllerRef.current = new AbortController()

    setIsSearching(true)
    try {
      const results = await marketService.searchTokens(query.trim(), 8) // Limit to 8 results for navbar
      
      // Only update state if this search wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        setSearchResults(results)
        setShowResults(true)
      }
    } catch (error) {
      // Don't log aborted searches
      if (error instanceof Error && error.name !== 'AbortError') {
        import('@/lib/error-logger').then(({ errorLogger }) => {
          errorLogger.error('Token search failed', {
            error: error as Error,
            action: 'token_search_failed',
            metadata: { query, component: 'NavBar' }
          })
        })
        setSearchResults([])
        setShowResults(false)
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsSearching(false)
      }
    }
  }, [])

  // Handle token selection
  const handleTokenSelect = useCallback((tokenAddress: string) => {
    router.push(`/trade?token=${tokenAddress}`)
    setSearchQuery("")
    setShowResults(false)
    setSearchResults([])
  }, [router])

  // Handle search input changes
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  // Hide results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery)
    }
  }, [debouncedQuery, performSearch])

  // Cleanup: abort pending search on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const navLinks = [
    { href: "/", label: "Dashboard" },
    { href: "/trade", label: "Trade" },
    { href: "/trending", label: "Trending" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/monitoring", label: "Monitoring" },
    { href: "/docs", label: "Docs" },
  ]

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border glass-nav shadow-lg">
        <div className="mx-auto flex h-16 items-center justify-between px-4 max-w-[2400px] gap-4">
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-background border-border">
                <div className="flex flex-col gap-4 mt-8">
                  {/* SOL Balance Display for Mobile */}
                  {isAuthenticated && (
                    <motion.div 
                      className="flex items-center gap-2 px-4 py-3 rounded-lg trading-card shadow-sm mb-4"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="h-2 w-2 rounded-full bg-accent pulse-glow" />
                      <span className="text-sm font-semibold text-foreground font-mono number-display">
                        {balanceNumber.toFixed(2)} SOL
                      </span>
                    </motion.div>
                  )}
                  
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "text-sm font-medium transition-colors px-4 py-3 rounded-lg",
                        pathname === link.href
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-card",
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center group">
              <span className="font-heading text-2xl font-bold gradient-text tracking-tight group-hover:scale-105 transition-transform duration-200">
                Sol Sim
              </span>
            </Link>
          </div>

          <div className="hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors relative group",
                  pathname === link.href ? "text-primary gradient-text" : "text-muted-foreground hover:gradient-text",
                )}
              >
                {link.label}
                {pathname === link.href && (
                  <motion.span
                    layoutId="navbar-indicator"
                    className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent"
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex flex-1 max-w-xs lg:max-w-md xl:max-w-lg ml-4">
            <motion.div 
              ref={searchRef}
              className="relative w-full"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "100%" }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground icon-morph" />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
              <input
                type="text"
                placeholder="Search tokens or paste CA..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full h-9 pl-9 pr-10 rounded-lg glass-solid border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:glow-primary transition-all duration-300"
                aria-label="Search for tokens by name or contract address"
              />
              
              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showResults && searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                  >
                    {searchResults.map((token, index) => (
                      <motion.button
                        key={token.address}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        onClick={() => handleTokenSelect(token.address)}
                        className="w-full px-3 py-2 text-left hover:bg-muted transition-colors flex items-center gap-3 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {token.imageUrl && (
                          <img 
                            src={token.imageUrl} 
                            alt={`${token.symbol || token.name || 'Token'} logo`}
                            className="w-6 h-6 rounded-full flex-shrink-0"
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground text-sm">
                              {token.symbol || token.address.substring(0, 8)}
                            </span>
                            {token.trending && (
                              <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                                🔥 Trending
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {token.name || `${token.address.substring(0, 8)}...${token.address.substring(-8)}`}
                          </p>
                        </div>
                        {token.price && (
                          <div className="text-right">
                            <p className="text-sm font-mono text-foreground">
                              ${parseFloat(token.price).toLocaleString(undefined, { maximumFractionDigits: 6 })}
                            </p>
                            {token.priceChange24h !== undefined && (
                              <p 
                                className={`text-xs ${token.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'}`}
                                aria-label={`Price ${token.priceChange24h >= 0 ? 'increase' : 'decrease'} ${Math.abs(token.priceChange24h).toFixed(2)} percent in 24 hours`}
                              >
                                {token.priceChange24h >= 0 ? '▲' : '▼'} {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                              </p>
                            )}
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* No Results Message */}
              <AnimatePresence>
                {showResults && searchResults.length === 0 && searchQuery.trim() && !isSearching && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 p-3"
                  >
                    <p className="text-sm text-muted-foreground text-center">
                      No tokens found for "{searchQuery}"
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <motion.div 
                  className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg trading-card shadow-sm"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="h-2 w-2 rounded-full bg-accent pulse-glow" />
                  <span className="text-sm font-semibold text-foreground font-mono number-display">
                    {balanceNumber.toFixed(2)} SOL
                  </span>
                </motion.div>

                {/* Notifications */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.4 }}
                >
                  <Button variant="ghost" size="icon" className="relative hidden md:flex btn-enhanced">
                    <Bell className="h-5 w-5 icon-morph" />
                    {hasNotifications && (
                      <motion.span 
                        className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </Button>
                </motion.div>

                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.5 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button variant="ghost" size="icon" className="rounded-full btn-enhanced">
                        <div className="h-8 w-8 rounded-full gradient-trading flex items-center justify-center shadow-lg glow-primary">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      </Button>
                    </motion.div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer text-destructive" onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="hidden md:flex btn-enhanced" 
                    onClick={() => setAuthModalOpen(true)}
                  >
                    Login
                  </Button>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button 
                    size="sm" 
                    className="gradient-trading text-white shadow-lg glow-primary btn-enhanced" 
                    onClick={() => setAuthModalOpen(true)}
                  >
                    Start Trading
                  </Button>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </nav>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </>
  )
}
