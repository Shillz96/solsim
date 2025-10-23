/**
 * Warp Pipes Hub - Main client component
 *
 * Full-width 3-column layout for token discovery (New Pairs | About to Graduate | Bonded)
 * Mobile: Tab-based layout
 */

"use client"

import { useMemo } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TokenColumn } from "./token-column"
import { useWarpPipesFeed, useAddTokenWatch, useRemoveTokenWatch } from "@/hooks/use-warp-pipes"
import { useAuth } from "@/hooks/use-auth"

export function WarpPipesHub() {
  const { isAuthenticated } = useAuth()

  // Fetch feed data (using default 'hot' sort)
  const { data, isLoading, error, refetch } = useWarpPipesFeed({
    searchQuery: "",
    sortBy: "hot",
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
    <div className="w-full px-4 py-4">
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

      {/* Desktop: 3-Column Layout - Reordered: New Pairs | About to Graduate | Bonded */}
      <div className="hidden lg:grid lg:grid-cols-3 gap-4 h-[calc(100vh-160px)]">
        <TokenColumn
          title="🆕 New Pairs"
          tokens={newTokens}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          headerColor="new"
        />
        <TokenColumn
          title="⭐ About to Graduate"
          tokens={graduating}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          headerColor="graduating"
        />
        <TokenColumn
          title="🪙 Bonded"
          tokens={bonded}
          isLoading={isLoading}
          onToggleWatch={handleToggleWatch}
          headerColor="bonded"
        />
      </div>

      {/* Mobile: Tabs Layout */}
      <div className="lg:hidden">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 border-3 border-pipe-400">
            <TabsTrigger
              value="new"
              className="data-[state=active]:bg-luigi-green-500 data-[state=active]:text-white font-semibold"
            >
              🆕 New ({newTokens.length})
            </TabsTrigger>
            <TabsTrigger
              value="graduating"
              className="data-[state=active]:bg-star-yellow-500 data-[state=active]:text-black font-semibold"
            >
              ⭐ Graduate ({graduating.length})
            </TabsTrigger>
            <TabsTrigger
              value="bonded"
              className="data-[state=active]:bg-coin-yellow-500 data-[state=active]:text-black font-semibold"
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
              headerColor="new"
            />
          </TabsContent>

          <TabsContent value="graduating">
            <TokenColumn
              title="⭐ About to Graduate"
              tokens={graduating}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              headerColor="graduating"
            />
          </TabsContent>

          <TabsContent value="bonded">
            <TokenColumn
              title="🪙 Bonded"
              tokens={bonded}
              isLoading={isLoading}
              onToggleWatch={handleToggleWatch}
              headerColor="bonded"
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
