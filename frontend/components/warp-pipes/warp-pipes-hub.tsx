/**
 * Warp Pipes Hub - Main client component
 *
 * Full-width 3-column layout for token discovery (New Pairs | About to Graduate | Bonded)
 * Mobile: Tab-based layout
 */

"use client"

import { useState, useMemo } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TokenColumn } from "./token-column"
import { useWarpPipesFeed, useAddTokenWatch, useRemoveTokenWatch } from "@/hooks/use-warp-pipes"
import { useAuth } from "@/hooks/use-auth"
import type { AdvancedFilters, TokenRow } from "@/lib/types/warp-pipes"
import { getDefaultFilters } from "@/lib/warp-pipes-filter-presets"

export function WarpPipesHub() {
  const { isAuthenticated } = useAuth()

  // Per-column filter state
  const [newFilters, setNewFilters] = useState<AdvancedFilters>(getDefaultFilters('new'))
  const [graduatingFilters, setGraduatingFilters] = useState<AdvancedFilters>(getDefaultFilters('graduating'))
  const [bondedFilters, setBondedFilters] = useState<AdvancedFilters>(getDefaultFilters('bonded'))

  // Fetch feed data - filters are applied per-column on the client side
  const { data, isLoading, error, refetch } = useWarpPipesFeed({
    searchQuery: "",
    sortBy: "volume",
    // Don't apply filters here - they're applied per-column in client-side filtering
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
      // Audit filters
      if (filters.dexPaid !== undefined && token.dexPaid !== filters.dexPaid) return false
      if (filters.minAge !== undefined && token.createdAgo && token.createdAgo < filters.minAge) return false
      if (filters.maxAge !== undefined && token.createdAgo && token.createdAgo > filters.maxAge) return false
      if (filters.freezeAuthority !== undefined && token.freezeAuthority !== filters.freezeAuthority) return false
      if (filters.mintAuthority !== undefined && token.mintAuthority !== filters.mintAuthority) return false
      if (filters.top10Holders !== undefined && token.top10HoldersPercent !== undefined && token.top10HoldersPercent < filters.top10Holders) return false

      // Metric filters
      if (filters.minLiquidityUsd !== undefined && token.liquidityUsd && token.liquidityUsd < filters.minLiquidityUsd) return false
      if (filters.maxLiquidityUsd !== undefined && token.liquidityUsd && token.liquidityUsd > filters.maxLiquidityUsd) return false
      if (filters.minMarketCapUsd !== undefined && token.marketCapUsd && token.marketCapUsd < filters.minMarketCapUsd) return false
      if (filters.maxMarketCapUsd !== undefined && token.marketCapUsd && token.marketCapUsd > filters.maxMarketCapUsd) return false
      if (filters.minVolumeUsd !== undefined && token.volumeUsd && token.volumeUsd < filters.minVolumeUsd) return false
      if (filters.maxVolumeUsd !== undefined && token.volumeUsd && token.volumeUsd > filters.maxVolumeUsd) return false
      if (filters.minHolders !== undefined && token.holderCount && token.holderCount < filters.minHolders) return false
      if (filters.maxHolders !== undefined && token.holderCount && token.holderCount > filters.maxHolders) return false
      if (filters.minPriceChangePercent !== undefined && token.priceChange24hPercent && token.priceChange24hPercent < filters.minPriceChangePercent) return false
      if (filters.maxPriceChangePercent !== undefined && token.priceChange24hPercent && token.priceChange24hPercent > filters.maxPriceChangePercent) return false

      // Social filters
      if (filters.minSocialScore !== undefined && token.socialScore && token.socialScore < filters.minSocialScore) return false
      if (filters.minSentiment !== undefined && token.sentiment && token.sentiment < filters.minSentiment) return false
      if (filters.minTwitterFollowers !== undefined && token.twitterFollowers && token.twitterFollowers < filters.minTwitterFollowers) return false
      if (filters.minTelegramMembers !== undefined && token.telegramMembers && token.telegramMembers < filters.minTelegramMembers) return false

      // Bonding curve filters (for pump.fun tokens)
      if (filters.minBondingPercentage !== undefined && token.bondingCurvePercentage !== undefined && token.bondingCurvePercentage < filters.minBondingPercentage) return false
      if (filters.maxBondingPercentage !== undefined && token.bondingCurvePercentage !== undefined && token.bondingCurvePercentage > filters.maxBondingPercentage) return false

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

  return (
    <div className="w-full min-h-screen bg-[var(--background)]">
      {/* Error State */}
      {error && (
        <div className="px-4 pt-6 mb-6">
          <Alert variant="destructive" className="border-4 border-[var(--mario-red)] shadow-[6px_6px_0_var(--outline-black)] rounded-[16px] bg-white">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-[var(--outline-black)] font-bold">Failed to load tokens. Please try again.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="ml-4 border-3 border-[var(--outline-black)] bg-[var(--star-yellow)] text-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-[2px] rounded-[12px] font-bold transition-all"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Desktop: 3-Column Layout - Reordered: New Pairs | About to Graduate | Bonded */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-6 px-6 py-6 h-[calc(100vh-80px)]">
        <TokenColumn
          title="🆕 New Pairs"
          tokens={newTokens}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          onFiltersChange={setNewFilters}
          headerColor="new"
        />
        <TokenColumn
          title="⭐ About to Graduate"
          tokens={graduating}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          onFiltersChange={setGraduatingFilters}
          headerColor="graduating"
        />
        <TokenColumn
          title="🪙 Bonded"
          tokens={bonded}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          onFiltersChange={setBondedFilters}
          headerColor="bonded"
        />
      </div>

      {/* Mobile: Tabs Layout */}
      <div className="lg:hidden px-4 py-6">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-[14px] bg-white p-1">
            <TabsTrigger
              value="new"
              className="data-[state=active]:bg-[var(--luigi-green)] data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-[10px] font-bold transition-all text-[var(--outline-black)]"
            >
              🆕 New ({newTokens.length})
            </TabsTrigger>
            <TabsTrigger
              value="graduating"
              className="data-[state=active]:bg-[var(--star-yellow)] data-[state=active]:text-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-[10px] font-bold transition-all text-[var(--outline-black)]"
            >
              ⭐ Graduate ({graduating.length})
            </TabsTrigger>
            <TabsTrigger
              value="bonded"
              className="data-[state=active]:bg-[var(--coin-yellow)] data-[state=active]:text-[var(--outline-black)] data-[state=active]:shadow-[2px_2px_0_var(--outline-black)] rounded-[10px] font-bold transition-all text-[var(--outline-black)]"
            >
              🪙 Bonded ({bonded.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <TokenColumn
              title="🆕 New Pairs"
              tokens={newTokens}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              onFiltersChange={setNewFilters}
              headerColor="new"
            />
          </TabsContent>

          <TabsContent value="graduating">
            <TokenColumn
              title="⭐ About to Graduate"
              tokens={graduating}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              onFiltersChange={setGraduatingFilters}
              headerColor="graduating"
            />
          </TabsContent>

          <TabsContent value="bonded">
            <TokenColumn
              title="🪙 Bonded"
              tokens={bonded}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              onFiltersChange={setBondedFilters}
              headerColor="bonded"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border-4 border-[var(--outline-black)] shadow-[8px_8px_0_var(--outline-black)] rounded-[16px] p-8">
            <Loader2 className="h-12 w-12 animate-spin text-[var(--mario-red)] mx-auto mb-4" />
            <p className="text-center font-bold text-[var(--outline-black)] text-[18px]">Loading Warp Pipes...</p>
            <p className="text-center text-[var(--outline-black)] opacity-70 text-sm mt-2">🍄 Discovering tokens...</p>
          </div>
        </div>
      )}
    </div>
  )
}
