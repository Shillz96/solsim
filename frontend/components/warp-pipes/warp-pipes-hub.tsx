/**
 * Warp Pipes Hub - Main client component
 *
 * 3-column layout for token discovery (Bonded | Graduating | New)
 * Mobile: Tab-based layout
 */

"use client"

import { useState, useMemo } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FilterBar, type SortBy } from "./filter-bar"
import { TokenColumn } from "./token-column"
import { useWarpPipesFeed, useAddTokenWatch, useRemoveTokenWatch } from "@/hooks/use-warp-pipes"
import { useAuth } from "@/lib/auth-provider"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export function WarpPipesHub() {
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortBy>("hot")
  const { isAuthenticated } = useAuth()

  // Fetch feed data
  const { data, isLoading, error, refetch } = useWarpPipesFeed({
    searchQuery,
    sortBy,
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

  // Filter and sort tokens
  const { bonded, graduating, newTokens } = useMemo(() => {
    if (!data) {
      return { bonded: [], graduating: [], newTokens: [] }
    }

    return {
      bonded: data.bonded || [],
      graduating: data.graduating || [],
      newTokens: data.new || [],
    }
  }, [data])

  return (
    <div className="container mx-auto px-4 py-6 max-w-[1600px]">
      {/* Page Header */}
      <div className="mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-2 text-foreground"
        >
          🎮 Warp Pipes Hub
        </motion.h1>
        <p className="text-muted-foreground">
          Discover new tokens as they progress: Bonded → Graduating → New Pool
        </p>
      </div>

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSearchChange={setSearchQuery}
        onSortChange={setSortBy}
        className="mb-6"
      />

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6 border-4 border-mario-red-500">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load tokens. Please try again.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-4 border-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Desktop: 3-Column Layout */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4 h-[calc(100vh-320px)]">
        <TokenColumn
          title="🪙 Bonded"
          tokens={bonded}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          headerColor="bonded"
        />
        <TokenColumn
          title="⭐ Graduating"
          tokens={graduating}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          headerColor="graduating"
        />
        <TokenColumn
          title="🍄 New Pool"
          tokens={newTokens}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          headerColor="new"
        />
      </div>

      {/* Mobile: Tabs Layout */}
      <div className="lg:hidden">
        <Tabs defaultValue="bonded" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 border-3 border-pipe-400">
            <TabsTrigger
              value="bonded"
              className="data-[state=active]:bg-coin-yellow-500 data-[state=active]:text-black font-semibold"
            >
              🪙 Bonded ({bonded.length})
            </TabsTrigger>
            <TabsTrigger
              value="graduating"
              className="data-[state=active]:bg-star-yellow-500 data-[state=active]:text-black font-semibold"
            >
              ⭐ Graduating ({graduating.length})
            </TabsTrigger>
            <TabsTrigger
              value="new"
              className="data-[state=active]:bg-luigi-green-500 data-[state=active]:text-white font-semibold"
            >
              🍄 New ({newTokens.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bonded">
            <TokenColumn
              title="🪙 Bonded Tokens"
              tokens={bonded}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              headerColor="bonded"
            />
          </TabsContent>

          <TabsContent value="graduating">
            <TokenColumn
              title="⭐ Graduating Tokens"
              tokens={graduating}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              headerColor="graduating"
            />
          </TabsContent>

          <TabsContent value="new">
            <TokenColumn
              title="🍄 New Pools"
              tokens={newTokens}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              headerColor="new"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border-4 border-mario-red-500 rounded-xl p-8 shadow-xl">
            <Loader2 className="h-12 w-12 animate-spin text-mario-red-500 mx-auto mb-4" />
            <p className="text-center font-semibold">Loading Warp Pipes...</p>
          </div>
        </div>
      )}
    </div>
  )
}
