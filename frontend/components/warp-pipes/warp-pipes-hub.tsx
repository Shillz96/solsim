/**
 * Warp Pipes Hub - Main client component
 *
 * Full-width 3-column layout for token discovery (New Pairs | About to Graduate | Bonded)
 * Mobile: Tab-based layout
 */

"use client"

import { useState, useMemo, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TokenColumn } from "./token-column"
import { useWarpPipesFeed, useAddTokenWatch, useRemoveTokenWatch } from "@/hooks/use-warp-pipes"
import { useAuth } from "@/hooks/use-auth"
import type { AdvancedFilters, TokenRow } from "@/lib/types/warp-pipes"
import { getDefaultFilters } from "@/lib/warp-pipes-filter-presets"

const STORAGE_KEYS = {
  NEW: 'warp-pipes-new-filters',
  GRADUATING: 'warp-pipes-graduating-filters',
  BONDED: 'warp-pipes-bonded-filters',
}

// Load filters from localStorage with fallback to defaults
function loadFilters(key: string, category: 'new' | 'graduating' | 'bonded'): AdvancedFilters {
  if (typeof window === 'undefined') return getDefaultFilters(category)
  
  try {
    const stored = localStorage.getItem(key)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && typeof parsed === 'object') {
        return parsed
      }
    }
  } catch (error) {
    console.warn(`Failed to load filters from ${key}`)
    localStorage.removeItem(key)
  }
  
  return getDefaultFilters(category)
}

// Save filters to localStorage
function saveFilters(key: string, filters: AdvancedFilters) {
  if (typeof window === 'undefined') return
  
  try {
    if (filters && Object.keys(filters).length > 0) {
      localStorage.setItem(key, JSON.stringify(filters))
    } else {
      localStorage.removeItem(key)
    }
  } catch (error) {
    console.warn(`Failed to save filters to ${key}`)
  }
}

export function WarpPipesHub() {
  const { isAuthenticated } = useAuth()

  // Per-column filter state - start with defaults, load from localStorage in useEffect
  const [newFilters, setNewFilters] = useState<AdvancedFilters>(getDefaultFilters('new'))
  const [graduatingFilters, setGraduatingFilters] = useState<AdvancedFilters>(getDefaultFilters('graduating'))
  const [bondedFilters, setBondedFilters] = useState<AdvancedFilters>(getDefaultFilters('bonded'))
  const [isFiltersLoaded, setIsFiltersLoaded] = useState(false)

  // Load filters from localStorage on mount (client-side only)
  useEffect(() => {
    setNewFilters(loadFilters(STORAGE_KEYS.NEW, 'new'))
    setGraduatingFilters(loadFilters(STORAGE_KEYS.GRADUATING, 'graduating'))
    setBondedFilters(loadFilters(STORAGE_KEYS.BONDED, 'bonded'))
    setIsFiltersLoaded(true)
  }, [])

  // Save filters to localStorage whenever they change (but only after initial load)
  useEffect(() => {
    if (!isFiltersLoaded) return
    
    saveFilters(STORAGE_KEYS.NEW, newFilters)
    saveFilters(STORAGE_KEYS.GRADUATING, graduatingFilters)
    saveFilters(STORAGE_KEYS.BONDED, bondedFilters)
  }, [newFilters, graduatingFilters, bondedFilters, isFiltersLoaded])

  // Fetch feed data - filters are applied per-column on the client side
  const { data, isLoading, error, refetch } = useWarpPipesFeed({
    searchQuery: "",
    sortBy: "volume",
  })

  // Watch mutations
  const addWatch = useAddTokenWatch()
  const removeWatch = useRemoveTokenWatch()

  // Handle watch toggle
  const handleToggleWatch = async (mint: string, isCurrentlyWatched: boolean) => {
    if (!isAuthenticated) {
      alert("Please sign in to watch tokens")
      return
    }

    try {
      if (isCurrentlyWatched) {
        await removeWatch.mutateAsync(mint)
      } else {
        await addWatch.mutateAsync({ mint })
      }
    } catch (error) {
      console.error("Failed to toggle watch:", error)
      alert("Failed to update watchlist. Please try again.")
    }
  }

  // Helper function to apply filters to tokens
  const applyFilters = (tokens: TokenRow[], filters: AdvancedFilters) => {
    if (!filters || Object.keys(filters).length === 0) return tokens

    return tokens.filter((token) => {
      // Audit filters - map to actual TokenRow properties
      // Note: Some filters may not have direct property mappings in TokenRow
      if (filters.minAge !== undefined && token.firstSeenAt) {
        const ageMinutes = (Date.now() - new Date(token.firstSeenAt).getTime()) / 60000
        if (ageMinutes < filters.minAge) return false
      }
      if (filters.maxAge !== undefined && token.firstSeenAt) {
        const ageMinutes = (Date.now() - new Date(token.firstSeenAt).getTime()) / 60000
        if (ageMinutes > filters.maxAge) return false
      }

      // Metric filters - use TokenRow property names
      if (filters.minLiquidityUsd !== undefined && token.liqUsd && token.liqUsd < filters.minLiquidityUsd) return false
      if (filters.maxLiquidityUsd !== undefined && token.liqUsd && token.liqUsd > filters.maxLiquidityUsd) return false
      if (filters.minMarketCap !== undefined && token.marketCapUsd && token.marketCapUsd < filters.minMarketCap) return false
      if (filters.maxMarketCap !== undefined && token.marketCapUsd && token.marketCapUsd > filters.maxMarketCap) return false
      if (filters.minVolume24h !== undefined && token.volume24h && token.volume24h < filters.minVolume24h) return false
      if (filters.maxVolume24h !== undefined && token.volume24h && token.volume24h > filters.maxVolume24h) return false

      // Social filters - check for presence of social links
      if (filters.requireTwitter && !token.twitter) return false
      if (filters.requireTelegram && !token.telegram) return false
      if (filters.requireWebsite && !token.website) return false

      // Bonding curve filters - use bondingCurveProgress (0-100)
      if (filters.minBondingProgress !== undefined && token.bondingCurveProgress != null && token.bondingCurveProgress < filters.minBondingProgress) return false
      if (filters.maxBondingProgress !== undefined && token.bondingCurveProgress != null && token.bondingCurveProgress > filters.maxBondingProgress) return false
      if (filters.minSolToGraduate !== undefined && token.solToGraduate != null && token.solToGraduate < filters.minSolToGraduate) return false
      if (filters.maxSolToGraduate !== undefined && token.solToGraduate != null && token.solToGraduate > filters.maxSolToGraduate) return false

      return true
    })
  }

  // Filter and sort tokens per-column
  const { bonded, graduating, newTokens } = useMemo(() => {
    if (!data) {
      return { bonded: [], graduating: [], newTokens: [] }
    }

    return {
      bonded: applyFilters(data.bonded || [], bondedFilters),
      graduating: applyFilters(data.graduating || [], graduatingFilters),
      newTokens: applyFilters(data.new || [], newFilters),
    }
  }, [data, bondedFilters, graduatingFilters, newFilters])

  // Calculate stats across all tokens
  const stats = useMemo(() => {
    const allTokens = [...bonded, ...graduating, ...newTokens]
    if (allTokens.length === 0) return null

    const totalVolume = allTokens.reduce((sum, t) => sum + (t.volume24h || 0), 0)
    const totalMarketCap = allTokens.reduce((sum, t) => sum + (t.marketCapUsd || 0), 0)
    const avgBondingProgress = graduating.length > 0 
      ? graduating.reduce((sum, t) => sum + (t.bondingCurveProgress || 0), 0) / graduating.length 
      : 0

    return {
      totalVolume,
      totalMarketCap,
      avgBondingProgress,
      tokenCount: allTokens.length,
    }
  }, [bonded, graduating, newTokens])

  return (
    <div 
      className="w-full h-full flex flex-col bg-background overflow-hidden"
    >
      {/* Stats Summary Bar */}
      {stats && !error && (
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <div className="bg-card border-4 border-outline rounded-xl shadow-[4px_4px_0_var(--outline-black)] p-3 overflow-hidden relative">
            {/* Live indicator */}
            <div className="absolute top-2 right-2 flex items-center gap-1.5">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-luigi opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-luigi"></span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Live</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex flex-col items-center justify-center p-2 bg-luigi/10 rounded-lg border-2 border-outline">
                <div className="text-xl sm:text-2xl font-bold text-outline">{stats.tokenCount}</div>
                <div className="text-xs text-muted-foreground font-medium">Total Tokens</div>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-star/10 rounded-lg border-2 border-outline">
                <div className="text-xl sm:text-2xl font-bold text-outline">
                  ${stats.totalVolume >= 1000000 
                    ? `${(stats.totalVolume / 1000000).toFixed(1)}M` 
                    : stats.totalVolume >= 1000 
                    ? `${(stats.totalVolume / 1000).toFixed(0)}K`
                    : stats.totalVolume.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground font-medium">24h Volume</div>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-coin/10 rounded-lg border-2 border-outline">
                <div className="text-xl sm:text-2xl font-bold text-outline">
                  ${stats.totalMarketCap >= 1000000 
                    ? `${(stats.totalMarketCap / 1000000).toFixed(1)}M` 
                    : stats.totalMarketCap >= 1000 
                    ? `${(stats.totalMarketCap / 1000).toFixed(0)}K`
                    : stats.totalMarketCap.toFixed(0)}
                </div>
                <div className="text-xs text-muted-foreground font-medium">Market Cap</div>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-mario/10 rounded-lg border-2 border-outline">
                <div className="text-xl sm:text-2xl font-bold text-outline">{stats.avgBondingProgress.toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground font-medium">Avg Progress</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <Alert variant="destructive" className="border-4 border-mario shadow-[6px_6px_0_var(--outline-black)] rounded-xl bg-card">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-outline font-bold">Failed to load tokens. Please try again.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="ml-4 border-3 border-outline bg-star text-outline shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-[2px] rounded-lg font-bold transition-all"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Desktop: 3-Column Layout - Reordered: New Pairs | About to Graduate | Bonded */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-3 px-3 py-3 flex-1 min-h-0">
        <TokenColumn
          title="🆕 New Pairs"
          tokens={newTokens}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          filters={newFilters}
          onFiltersChange={setNewFilters}
          headerColor="new"
        />
        <TokenColumn
          title="⭐ About to Graduate"
          tokens={graduating}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          filters={graduatingFilters}
          onFiltersChange={setGraduatingFilters}
          headerColor="graduating"
        />
        <TokenColumn
          title="🪙 Bonded"
          tokens={bonded}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          filters={bondedFilters}
          onFiltersChange={setBondedFilters}
          headerColor="bonded"
        />
      </div>

      {/* Mobile: Tabs Layout */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0 px-4 py-6">
        <Tabs defaultValue="new" className="w-full h-full flex flex-col">
          <TabsList className="inline-flex w-auto mb-4 flex-wrap gap-2 bg-transparent border-0 p-0 shadow-none">
            <TabsTrigger
              value="new"
              className="mario-tab-green text-xs sm:text-sm px-4 py-2.5 rounded-xl border-3 border-outline shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all data-[state=active]:scale-105 data-[state=active]:shadow-[5px_5px_0_var(--outline-black)] data-[state=active]:-translate-y-1"
            >
              <span className="text-base">🆕</span>
              <span className="font-bold">New ({newTokens.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="graduating"
              className="mario-tab-yellow text-xs sm:text-sm px-4 py-2.5 rounded-xl border-3 border-outline shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all data-[state=active]:scale-105 data-[state=active]:shadow-[5px_5px_0_var(--outline-black)] data-[state=active]:-translate-y-1"
            >
              <span className="text-base">⭐</span>
              <span className="font-bold">Graduate ({graduating.length})</span>
            </TabsTrigger>
            <TabsTrigger
              value="bonded"
              className="mario-tab-red text-xs sm:text-sm px-4 py-2.5 rounded-xl border-3 border-outline shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all data-[state=active]:scale-105 data-[state=active]:shadow-[5px_5px_0_var(--outline-black)] data-[state=active]:-translate-y-1"
            >
              <span className="text-base">🪙</span>
              <span className="font-bold">Bonded ({bonded.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="flex-1 min-h-0 mt-0">
            <TokenColumn
              title="🆕 New Pairs"
              tokens={newTokens}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              filters={newFilters}
              onFiltersChange={setNewFilters}
              headerColor="new"
            />
          </TabsContent>

          <TabsContent value="graduating" className="flex-1 min-h-0 mt-0">
            <TokenColumn
              title="⭐ About to Graduate"
              tokens={graduating}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              filters={graduatingFilters}
              onFiltersChange={setGraduatingFilters}
              headerColor="graduating"
            />
          </TabsContent>

          <TabsContent value="bonded" className="flex-1 min-h-0 mt-0">
            <TokenColumn
              title="🪙 Bonded"
              tokens={bonded}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              filters={bondedFilters}
              onFiltersChange={setBondedFilters}
              headerColor="bonded"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
