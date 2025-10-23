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

  // Fetch feed data (using default 'volume' sort for Axiom-style ranking)
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
    <div className="w-full min-h-screen bg-gradient-to-b from-sky-50 via-white to-sky-100">
      {/* Error State */}
      {error && (
        <div className="px-4 pt-6 mb-6">
          <Alert variant="destructive" className="border-4 border-mario-red-500 shadow-[6px_6px_0_rgba(0,0,0,0.3)] rounded-[16px] bg-white">
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-pipe-900 font-bold">Failed to load tokens. Please try again.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="ml-4 border-3 border-pipe-900 bg-star-yellow-500 text-pipe-900 shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:shadow-[6px_6px_0_rgba(0,0,0,0.3)] hover:-translate-y-[2px] rounded-[12px] font-bold transition-all"
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
      <div className="lg:hidden px-4 py-6">
        <Tabs defaultValue="new" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4 border-4 border-pipe-900 shadow-[4px_4px_0_rgba(0,0,0,0.3)] rounded-[14px] bg-white p-1">
            <TabsTrigger
              value="new"
              className="data-[state=active]:bg-luigi-green-500 data-[state=active]:text-white data-[state=active]:shadow-[2px_2px_0_rgba(0,0,0,0.3)] rounded-[10px] font-bold transition-all text-pipe-700"
            >
              🆕 New ({newTokens.length})
            </TabsTrigger>
            <TabsTrigger
              value="graduating"
              className="data-[state=active]:bg-star-yellow-500 data-[state=active]:text-pipe-900 data-[state=active]:shadow-[2px_2px_0_rgba(0,0,0,0.3)] rounded-[10px] font-bold transition-all text-pipe-700"
            >
              ⭐ Graduate ({graduating.length})
            </TabsTrigger>
            <TabsTrigger
              value="bonded"
              className="data-[state=active]:bg-coin-yellow-500 data-[state=active]:text-pipe-900 data-[state=active]:shadow-[2px_2px_0_rgba(0,0,0,0.3)] rounded-[10px] font-bold transition-all text-pipe-700"
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
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border-4 border-pipe-900 shadow-[8px_8px_0_rgba(0,0,0,0.3)] rounded-[16px] p-8">
            <Loader2 className="h-12 w-12 animate-spin text-mario-red-500 mx-auto mb-4" />
            <p className="text-center font-bold text-pipe-900 text-[18px]">Loading Warp Pipes...</p>
            <p className="text-center text-pipe-600 text-sm mt-2">🍄 Discovering tokens...</p>
          </div>
        </div>
      )}
    </div>
  )
}
