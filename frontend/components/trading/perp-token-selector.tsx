"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import * as api from "@/lib/api"

interface TokenInfo {
  mint: string
  symbol: string
  name: string
  logoURI?: string
  priceUsd?: number
  priceChange24h?: number
}

interface PerpTokenSelectorProps {
  value: string
  onChange: (mint: string) => void
}

export function PerpTokenSelector({ value, onChange }: PerpTokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null)

  // Load whitelisted tokens and their metadata
  useEffect(() => {
    loadTokens()
  }, [])

  // Update selected token when value changes
  useEffect(() => {
    if (value && tokens.length > 0) {
      const token = tokens.find(t => t.mint === value)
      if (token) setSelectedToken(token)
    }
  }, [value, tokens])

  const loadTokens = async () => {
    try {
      const whitelist = await api.getPerpWhitelist()

      // Fetch metadata for each token
      const tokenData = await Promise.all(
        whitelist.map(async (mint) => {
          try {
            const metadata = await api.getTokenMetadata(mint)
            return {
              mint,
              symbol: metadata.symbol || "UNKNOWN",
              name: metadata.name || "Unknown Token",
              logoURI: metadata.logoURI,
              priceUsd: metadata.priceUsd,
              priceChange24h: metadata.priceChange24h,
            }
          } catch (error) {
            console.error(`Failed to fetch metadata for ${mint}:`, error)
            return {
              mint,
              symbol: mint.substring(0, 8),
              name: "Unknown Token",
            }
          }
        })
      )

      setTokens(tokenData)

      // Set first token as default if no value set
      if (!value && tokenData.length > 0) {
        onChange(tokenData[0].mint)
        setSelectedToken(tokenData[0])
      }
    } catch (error) {
      console.error("Failed to load perp whitelist:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (token: TokenInfo) => {
    setSelectedToken(token)
    onChange(token.mint)
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4 border rounded-lg bg-card">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Selected Token Display */}
      <Button
        variant="outline"
        className="w-full justify-between h-auto p-3"
        onClick={() => setIsOpen(!isOpen)}
      >
        {selectedToken ? (
          <div className="flex items-center gap-3 flex-1">
            {selectedToken.logoURI && (
              <img
                src={selectedToken.logoURI}
                alt={selectedToken.symbol}
                className="w-8 h-8 rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            )}
            <div className="text-left flex-1">
              <div className="font-semibold text-base">{selectedToken.symbol}</div>
              <div className="text-xs text-muted-foreground">
                {selectedToken.name}
              </div>
            </div>
            {selectedToken.priceUsd && (
              <div className="text-right">
                <div className="font-mono text-sm">
                  ${selectedToken.priceUsd.toFixed(selectedToken.priceUsd < 1 ? 6 : 2)}
                </div>
                {selectedToken.priceChange24h !== undefined && (
                  <div
                    className={`text-xs ${
                      selectedToken.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {selectedToken.priceChange24h >= 0 ? '▲' : '▼'}{' '}
                    {selectedToken.priceChange24h >= 0 ? '+' : ''}
                    {selectedToken.priceChange24h.toFixed(2)}%
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">Select a token</span>
        )}
        <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Token List Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <Card className="absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto glass-overlay">
            <div className="p-2 space-y-1">
              {tokens.map((token) => (
                <Button
                  key={token.mint}
                  variant="ghost"
                  className={`w-full justify-start h-auto p-3 ${
                    token.mint === value ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSelect(token)}
                >
                  <div className="flex items-center gap-3 w-full">
                    {token.logoURI && (
                      <img
                        src={token.logoURI}
                        alt={token.symbol}
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{token.symbol}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {token.name}
                      </div>
                    </div>
                    {token.priceUsd && (
                      <div className="text-right">
                        <div className="font-mono text-sm">
                          ${token.priceUsd.toFixed(token.priceUsd < 1 ? 6 : 2)}
                        </div>
                        {token.priceChange24h !== undefined && (
                          <div
                            className={`text-xs ${
                              token.priceChange24h >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {token.priceChange24h >= 0 ? '▲' : '▼'}{' '}
                            {token.priceChange24h >= 0 ? '+' : ''}
                            {token.priceChange24h.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
