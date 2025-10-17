"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Clock, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useTokenMetadata } from "@/hooks/use-token-metadata"

interface RecentToken {
  mint: string
  symbol: string
  name: string
  imageUrl?: string
  lastTraded: number
}

const MAX_RECENT_TOKENS = 8
const STORAGE_KEY = 'recentTokens'

export function RecentTokensDropdown({ currentTokenAddress }: { currentTokenAddress?: string }) {
  const router = useRouter()
  const [recentTokens, setRecentTokens] = useState<RecentToken[]>([])

  // Fetch token metadata for current token
  const { data: tokenMetadata } = useTokenMetadata(currentTokenAddress, !!currentTokenAddress)

  // Load recent tokens from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Filter out tokens older than 7 days
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
        const filtered = parsed.filter((token: RecentToken) => token.lastTraded > sevenDaysAgo)
        setRecentTokens(filtered)
      } catch (e) {
        // Invalid data, ignore
        setRecentTokens([])
      }
    }
  }, [])

  // Save token to recent list when metadata is loaded
  useEffect(() => {
    if (!currentTokenAddress || !tokenMetadata) return

    const newToken: RecentToken = {
      mint: currentTokenAddress,
      symbol: tokenMetadata.symbol || 'Unknown',
      name: tokenMetadata.name || 'Unknown Token',
      imageUrl: tokenMetadata.imageUrl || tokenMetadata.logoURI || undefined,
      lastTraded: Date.now()
    }

    setRecentTokens(prev => {
      // Remove if already exists
      const filtered = prev.filter(t => t.mint !== currentTokenAddress)
      // Add to front
      const updated = [newToken, ...filtered].slice(0, MAX_RECENT_TOKENS)
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      return updated
    })
  }, [currentTokenAddress, tokenMetadata])

  if (recentTokens.length === 0) {
    return null
  }

  const handleTokenSelect = (token: RecentToken) => {
    router.push(`/trade?token=${token.mint}&symbol=${token.symbol}&name=${encodeURIComponent(token.name)}`)
  }

  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="h-4 w-4" />
          <span className="hidden sm:inline">Recent</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Recent Tokens</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recentTokens.map((token) => (
          <DropdownMenuItem
            key={token.mint}
            onClick={() => handleTokenSelect(token)}
            disabled={token.mint === currentTokenAddress}
            className={cn(
              "cursor-pointer flex items-center gap-2 py-2",
              token.mint === currentTokenAddress && "opacity-50"
            )}
          >
            {token.imageUrl ? (
              <img
                src={token.imageUrl}
                alt={token.symbol}
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 flex items-center justify-center text-xs font-bold text-white">
                {token.symbol.slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{token.symbol}</div>
              <div className="text-xs text-muted-foreground truncate">{token.name}</div>
            </div>
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {getTimeAgo(token.lastTraded)}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
