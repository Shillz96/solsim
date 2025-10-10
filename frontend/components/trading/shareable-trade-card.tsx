"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Share2, 
  Copy, 
  Download, 
  TrendingUp, 
  TrendingDown,
  CheckCircle
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import * as Backend from "@/lib/types/backend"

interface ShareableTradeCardProps {
  trade: Backend.TradeResponse['trade']
  portfolioTotals: Backend.TradeResponse['portfolioTotals']
  tokenSymbol?: string
  tokenName?: string
  tokenImageUrl?: string
  className?: string
}

export function ShareableTradeCard({
  trade,
  portfolioTotals,
  tokenSymbol,
  tokenName,
  tokenImageUrl,
  className
}: ShareableTradeCardProps) {
  const [isSharing, setIsSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const isProfit = parseFloat(portfolioTotals.unrealizedPnL) > 0
  const tradeValue = parseFloat(trade.costUsd || trade.totalCost)
  const quantity = parseFloat(trade.quantity)
  const price = parseFloat(trade.price)

  const handleCopyToClipboard = async () => {
    const shareText = `Just ${trade.side.toLowerCase()}ed ${quantity.toFixed(4)} ${tokenSymbol || 'tokens'} for $${tradeValue.toFixed(2)} on SolSim! 🚀\n\nPortfolio P&L: ${isProfit ? '+' : ''}$${parseFloat(portfolioTotals.unrealizedPnL).toFixed(2)}\nSOL Balance: ${parseFloat(portfolioTotals.solBalance).toFixed(4)} SOL\n\nTrade like a pro: https://solsim.fun`

    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      toast({
        title: "Copied to clipboard!",
        description: "Share your trade on social media",
        duration: 3000,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    setIsSharing(true)
    try {
      const shareData = {
        title: `SolSim Trade: ${trade.side} ${tokenSymbol || 'Token'}`,
        text: `Just ${trade.side.toLowerCase()}ed ${quantity.toFixed(4)} ${tokenSymbol || 'tokens'} for $${tradeValue.toFixed(2)} on SolSim!`,
        url: 'https://solsim.fun'
      }

      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        // Fallback to clipboard copy
        await handleCopyToClipboard()
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast({
          title: "Share failed",
          description: "Please try copying to clipboard instead",
          variant: "destructive",
        })
      }
    } finally {
      setIsSharing(false)
    }
  }

  const handleDownload = async () => {
    // Create a canvas to generate an image of the trade card
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = 800
    canvas.height = 400

    // Draw background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw border
    ctx.strokeStyle = '#27272a'
    ctx.lineWidth = 2
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)

    // Draw content
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 32px system-ui'
    ctx.fillText('SolSim Trade', 40, 70)

    ctx.font = '24px system-ui'
    ctx.fillStyle = trade.side === 'BUY' ? '#10b981' : '#ef4444'
    ctx.fillText(`${trade.side} ${tokenSymbol || 'Token'}`, 40, 120)

    ctx.fillStyle = '#ffffff'
    ctx.font = '20px system-ui'
    ctx.fillText(`Quantity: ${quantity.toFixed(4)}`, 40, 160)
    ctx.fillText(`Price: $${price.toFixed(6)}`, 40, 190)
    ctx.fillText(`Total: $${tradeValue.toFixed(2)}`, 40, 220)

    ctx.fillStyle = isProfit ? '#10b981' : '#ef4444'
    ctx.fillText(`Portfolio P&L: ${isProfit ? '+' : ''}$${parseFloat(portfolioTotals.unrealizedPnL).toFixed(2)}`, 40, 270)

    ctx.fillStyle = '#9ca3af'
    ctx.font = '16px system-ui'
    ctx.fillText('Trade like a pro on solsim.fun', 40, 350)

    // Download the image
    const link = document.createElement('a')
    link.download = `solsim-trade-${trade.id.slice(0, 8)}.png`
    link.href = canvas.toDataURL()
    link.click()

    toast({
      title: "Trade card downloaded!",
      description: "Share your trade card on social media",
      duration: 3000,
    })
  }

  return (
    <Card className={cn("border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {tokenImageUrl && (
              <img 
                src={tokenImageUrl} 
                alt={tokenSymbol || 'Token'} 
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <h3 className="text-lg font-semibold">
                {tokenName || tokenSymbol || 'Token'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {tokenSymbol && tokenName ? tokenSymbol : ''}
              </p>
            </div>
          </div>
          <Badge 
            variant={trade.side === 'BUY' ? 'default' : 'destructive'}
            className="text-sm font-medium"
          >
            {trade.side}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Quantity</p>
            <p className="text-lg font-medium">{quantity.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="text-lg font-medium">${price.toFixed(6)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className="text-lg font-medium">${tradeValue.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">SOL Balance</p>
            <p className="text-lg font-medium">{parseFloat(portfolioTotals.solBalance).toFixed(4)} SOL</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/50">
          <div className="flex items-center space-x-2">
            {isProfit ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
            <span className="text-sm font-medium">Portfolio P&L:</span>
          </div>
          <span className={cn(
            "text-lg font-bold",
            isProfit ? "text-green-500" : "text-red-500"
          )}>
            {isProfit ? '+' : ''}${parseFloat(portfolioTotals.unrealizedPnL).toFixed(2)}
          </span>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            disabled={isSharing}
            className="flex-1"
          >
            {isSharing ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyToClipboard}
            disabled={copied}
          >
            {copied ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          Trade executed on {new Date(trade.timestamp).toLocaleString()}
        </p>
      </CardContent>
    </Card>
  )
}