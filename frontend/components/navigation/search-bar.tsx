"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn, marioStyles } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useDebounce } from "@/hooks/use-debounce"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"
import * as api from "@/lib/api"
import type { TokenSearchResult } from "@/lib/types/backend"

export function SearchBar() {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TokenSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1)
  const [hasMoreResults, setHasMoreResults] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const debouncedQuery = useDebounce(searchQuery, 300)
  const router = useRouter()
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0

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
      const results = await api.searchTokens(query.trim(), 9)
      if (!abortControllerRef.current.signal.aborted) {
        const hasMore = results.length === 9
        const displayResults = hasMore ? results.slice(0, 8) : results
        setSearchResults(displayResults)
        setHasMoreResults(hasMore)
        setIsSearchOpen(true)
        setSelectedResultIndex(-1)
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
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleTokenSelect = useCallback((token?: TokenSearchResult, index?: number) => {
    const tokenToSelect = token || (index !== undefined && searchResults[index])
    if (!tokenToSelect) return

    router.push(`/room/${tokenToSelect.mint}`)
    setSearchQuery('')
    setIsSearchOpen(false)
    setSelectedResultIndex(-1)
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

  return (
    <div className="hidden md:flex flex-1 max-w-[320px] lg:max-w-[400px] mx-2 lg:mx-3">
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
              className={cn(
                marioStyles.input('sm'),
                'pl-8 md:pl-10 pr-8 md:pr-10 w-full h-8 md:h-9 text-xs md:text-sm',
                marioStyles.bodyText('semibold')
              )}
            />
            {isSearching && (
              <Loader2 className="absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 h-3.5 md:h-4 w-3.5 md:w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(
            'dropdown-base dropdown-search z-search-dropdown',
            'dropdown-animate-in'
          )}
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
                  <div className="dropdown-header">
                    Search Results
                  </div>
                  {searchResults.map((token, index) => (
                    <button
                      key={token.mint}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleTokenSelect(token)
                      }}
                      className={cn(
                        "dropdown-item w-full text-left",
                        selectedResultIndex === index && "bg-star/30"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {token.logoURI && (
                            <img
                              src={token.logoURI}
                              alt={token.symbol}
                              className="w-7 h-7 rounded-full border-2 border-outline flex-shrink-0"
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
                    <div className={cn(marioStyles.border('sm'), 'border-t border-outline mt-2 pt-2')}>
                      <button
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          router.push(`/trending?search=${encodeURIComponent(searchQuery)}`)
                          setSearchQuery('')
                          setIsSearchOpen(false)
                          setSelectedResultIndex(-1)
                        }}
                        className={cn(
                          marioStyles.button('danger', 'sm'),
                          'w-full text-center md:text-sm'
                        )}
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
  )
}
