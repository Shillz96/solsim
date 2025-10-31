"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Share2, Download, Copy, Check, Loader2 } from "lucide-react"
import { toPng, toBlob } from "html-to-image"
import { useToast } from "@/hooks/use-toast"
import { useSolRewards } from "@/hooks/use-sol-rewards"
import { ShareProgressIndicator } from "@/components/ui/share-progress-indicator"

interface SharePnLDialogProps {
  totalPnL: number
  totalPnLPercent: number
  currentValue: number
  initialBalance: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  userHandle?: string
  userAvatarUrl?: string
  userEmail?: string
  // Optional token-specific data
  tokenSymbol?: string
  tokenName?: string
  tokenImageUrl?: string
  isTokenSpecific?: boolean
}

export function SharePnLDialog({ totalPnL, totalPnLPercent, currentValue, initialBalance, open: externalOpen, onOpenChange: externalOnOpenChange, userHandle, userAvatarUrl, userEmail, tokenSymbol, tokenName, tokenImageUrl, isTokenSpecific }: SharePnLDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasDownloaded, setHasDownloaded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { trackShare, shareCount, remainingShares, isTracking } = useSolRewards()

  // Helper function to wait for all images to load
  const waitForImagesToLoad = async (element: HTMLElement): Promise<void> => {
    const images = Array.from(element.querySelectorAll('img'))
    const imagePromises = images.map((img) => {
      if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve()
      }
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          // If image takes too long, resolve anyway (might be broken)
          resolve()
        }, 3000)
        
        img.onload = () => {
          clearTimeout(timeout)
          resolve()
        }
        img.onerror = () => {
          clearTimeout(timeout)
          // Resolve even on error - we'll use fallback
          resolve()
        }
      })
    })
    
    await Promise.all(imagePromises)
    // Extra buffer for rendering
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const handleDownload = async () => {
    if (!cardRef.current || isGenerating) return

    try {
      setIsGenerating(true)
      
      // Wait for all images to load
      await waitForImagesToLoad(cardRef.current)

      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0a0a0a",
        skipAutoScale: true,
      })

      const link = document.createElement("a")
      link.download = `virtualsol-pnl-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      
      setHasDownloaded(true)
      
      toast({
        title: "Download successful",
        description: "Your PnL card has been downloaded",
      })
    } catch (error) {
      console.error('Failed to download PnL image:', error)
      toast({
        title: "Download failed",
        description: "Failed to generate PnL image. Please try again.",
        variant: "destructive"
      })
      import('@/lib/error-logger').then(({ errorLogger }) => {
        errorLogger.error('Failed to download PnL image', {
          error: error as Error,
          action: 'pnl_image_download_failed',
          metadata: { component: 'SharePnLDialog' }
        })
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!cardRef.current || isGenerating) return

    try {
      setIsGenerating(true)
      
      // Wait for all images to load
      await waitForImagesToLoad(cardRef.current)

      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#0a0a0a",
        skipAutoScale: true,
      })

      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": blob,
          }),
        ])
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
        
        setHasDownloaded(true)
        
        toast({
          title: "Copied to clipboard",
          description: "Your PnL card is ready to paste",
        })
      } else {
        throw new Error("Failed to generate image blob")
      }
    } catch (error) {
      console.error('Failed to copy PnL image:', error)
      toast({
        title: "Copy failed",
        description: "Failed to copy PnL image. Please try again.",
        variant: "destructive"
      })
      import('@/lib/error-logger').then(({ errorLogger }) => {
        errorLogger.error('Failed to copy PnL image', {
          error: error as Error,
          action: 'pnl_image_copy_failed',
          metadata: { component: 'SharePnLDialog' }
        })
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShareToTwitter = async () => {
    try {
      // Create Twitter share URL
      const pnlEmoji = totalPnL >= 0 ? '📈' : '📉'
      const pnlSign = totalPnL >= 0 ? '+' : ''
      const pnlAmount = Math.abs(totalPnL).toFixed(2)
      
      const text = isTokenSpecific && tokenSymbol
        ? `Check out my ${tokenSymbol} trading performance on @1upSOL! ${pnlEmoji} ${pnlSign}$${pnlAmount} PnL\n\nPaper trading Solana memecoins with ZERO risk.`
        : `Check out my trading performance on @1upSOL! ${pnlEmoji} ${pnlSign}$${pnlAmount} PnL (${pnlSign}${totalPnLPercent.toFixed(2)}%)\n\nPaper trading Solana memecoins with ZERO risk.`
      
      const url = 'https://oneupsol.fun'
      const hashtags = 'Solana,PaperTrading,Crypto,1UP'
      
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`
      
      // Open Twitter in new tab
      window.open(twitterUrl, '_blank', 'noopener,noreferrer')
      
      // Track the share
      trackShare()
      
    } catch (error) {
      console.error('Failed to share to Twitter:', error)
      toast({
        title: "Share failed",
        description: "Failed to open Twitter. Please try again.",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-sky border-4 border-outline text-white shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario font-bold rounded-lg h-9 px-4"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        >
          <Share2 className="h-4 w-4" />
          Share PnL
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-[var(--background)] border-4 border-[var(--outline)] shadow-[8px_8px_0_var(--outline-black)] z-50">
        <DialogHeader>
          <DialogTitle className="font-mario text-2xl text-[var(--outline)]">Share Your Performance</DialogTitle>
          <DialogDescription className="text-[var(--outline)]/70">
            Share your trading performance with others. You can download an image or copy it to your clipboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Shareable Card - Mario Theme */}
          <div
            ref={cardRef}
            className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-gradient-to-br from-[#FFFAE9] to-[#FFF4D4] border-4 border-[var(--outline)] shadow-[8px_8px_0_var(--outline-black)]"
          >
            {/* Content Container */}
            <div className="relative z-10 h-full flex flex-col p-6 gap-3">
              {/* Header with Image */}
              <div className="flex items-center justify-between">
                <img
                  src="/Check-out-my-pnl-10-31-2025.png"
                  alt="Check out my PNL"
                  className="h-14 w-auto object-contain"
                  crossOrigin="anonymous"
                  loading="eager"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    img.style.display = 'none'
                  }}
                />
                <div className="px-4 py-1.5 rounded-lg bg-[oklch(62%_0.18_145)] border-3 border-[var(--outline)] shadow-[2px_2px_0_var(--outline-black)]">
                  <span className="text-xs font-mario font-bold text-white">LIVE</span>
                </div>
              </div>

              {/* Main Content - Two Column Layout */}
              <div className="flex-1 flex gap-4">
                {/* Left: PnL Display */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className={`relative p-5 rounded-xl border-4 border-[var(--outline)] ${
                    totalPnL >= 0
                      ? "bg-[#E8F5E9] shadow-[4px_4px_0_var(--luigi)]"
                      : "bg-[#FFEBEE] shadow-[4px_4px_0_var(--mario-red)]"
                  }`}>
                    <div className="relative space-y-2">
                      <div className="flex items-center gap-2">
                        {isTokenSpecific && tokenImageUrl && (
                          <img
                            src={tokenImageUrl}
                            alt={tokenSymbol || 'Token'}
                            className="w-7 h-7 rounded-full object-cover border-3 border-[var(--outline)]"
                            crossOrigin="anonymous"
                            loading="eager"
                            onError={(e) => {
                              const img = e.target as HTMLImageElement
                              img.style.display = 'none'
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                          />
                        )}
                        <div className="text-xs font-mario font-bold text-[var(--outline)] uppercase tracking-wider">
                          {isTokenSpecific && tokenSymbol ? `${tokenSymbol} PNL` : 'TOTAL PNL'}
                        </div>
                      </div>
                      <div className={`text-5xl font-mario font-black leading-none ${
                        totalPnL >= 0 ? "text-[oklch(62%_0.18_145)]" : "text-[oklch(55%_0.22_27)]"
                      }`}>
                        {totalPnL >= 0 ? "+" : ""}${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-4 py-1.5 rounded-lg text-sm font-mario font-bold border-3 border-[var(--outline)] shadow-[2px_2px_0_var(--outline-black)] ${
                          totalPnL >= 0
                            ? "bg-[oklch(62%_0.18_145)] text-white"
                            : "bg-[oklch(55%_0.22_27)] text-white"
                        }`}>
                          {totalPnL >= 0 ? "↗" : "↘"} {totalPnL >= 0 ? "+" : ""}{totalPnLPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Stats */}
                <div className="flex flex-col gap-3 justify-center min-w-[170px]">
                  <div className="bg-white/80 backdrop-blur-sm border-3 border-[var(--outline)] rounded-lg p-4 shadow-[2px_2px_0_var(--outline-black)]">
                    <div className="text-[11px] text-[var(--outline)]/60 mb-1.5 uppercase tracking-wide font-bold">Invested</div>
                    <div className="text-lg font-mario font-bold text-[var(--outline)]">${initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm border-3 border-[var(--outline)] rounded-lg p-4 shadow-[2px_2px_0_var(--outline-black)]">
                    <div className="text-[11px] text-[var(--outline)]/60 mb-1.5 uppercase tracking-wide font-bold">Position</div>
                    <div className="text-lg font-mario font-bold text-[var(--outline)]">${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>

              {/* User Info Footer */}
              <div className="flex items-center justify-between pt-3 border-t-4 border-[var(--outline)]">
                <div className="flex items-center gap-2.5">
                  {userAvatarUrl ? (
                    <img
                      src={userAvatarUrl}
                      alt={userHandle || 'User'}
                      className="w-9 h-9 rounded-full object-cover border-3 border-[var(--outline)] shadow-[2px_2px_0_var(--outline-black)]"
                      crossOrigin="anonymous"
                      loading="eager"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        const fallbackDiv = document.createElement('div')
                        fallbackDiv.className = 'w-9 h-9 rounded-full bg-[var(--star)] flex items-center justify-center text-[var(--outline)] font-mario font-black text-sm border-3 border-[var(--outline)] shadow-[2px_2px_0_var(--outline-black)]'
                        fallbackDiv.textContent = (userHandle?.[0] || userEmail?.[0] || 'U').toUpperCase()
                        img.parentNode?.replaceChild(fallbackDiv, img)
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[var(--star)] flex items-center justify-center text-[var(--outline)] font-mario font-black text-sm border-3 border-[var(--outline)] shadow-[2px_2px_0_var(--outline-black)]">
                      {(userHandle?.[0] || userEmail?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-[var(--outline)] font-mario font-bold text-base">@{userHandle || userEmail?.split('@')[0] || 'trader'}</div>
                    <div className="text-[11px] text-[var(--sky)] font-bold">oneupsol.fun</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--outline)]/60 uppercase tracking-wide font-bold">Powered by</div>
                  <div className="text-lg font-mario font-black text-[var(--outline)]">1UP</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Mario Style */}
          <div className="space-y-3">
            {/* Download & Copy Row */}
            <div className="flex gap-3">
              <button 
                onClick={handleDownload} 
                className="flex-1 gap-2 h-12 px-4 rounded-xl border-4 border-[var(--outline)] bg-[oklch(62%_0.18_145)] text-white hover:bg-[oklch(58%_0.19_145)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center font-mario font-bold disabled:opacity-50" 
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Download
                  </>
                )}
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 gap-2 h-12 px-4 rounded-xl border-4 border-[var(--outline)] bg-[oklch(85%_0.08_230)] text-white hover:bg-[oklch(80%_0.09_230)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center font-mario font-bold disabled:opacity-50"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : copied ? (
                  <>
                    <Check className="h-5 w-5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" />
                    Copy Image
                  </>
                )}
              </button>
            </div>

            {/* Twitter Share Button (prominent after download/copy) */}
            {hasDownloaded && (
              <div className="space-y-2">
                <button
                  onClick={handleShareToTwitter}
                  disabled={isTracking}
                  className="w-full gap-2 h-14 px-4 rounded-xl border-4 border-[var(--outline)] bg-gradient-to-r from-[oklch(88%_0.16_85)] to-[oklch(82%_0.14_75)] text-[var(--outline)] hover:opacity-90 shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center font-mario font-bold text-lg disabled:opacity-50"
                >
                  {isTracking ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Tracking...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Share to X • Earn SOL!
                    </>
                  )}
                </button>

                {/* Progress Indicator */}
                <div className="flex items-center justify-center gap-3 p-3 rounded-lg bg-[oklch(88%_0.16_85)]/10 border-2 border-[oklch(88%_0.16_85)]/30">
                  <ShareProgressIndicator shareCount={shareCount} maxShares={3} size="sm" />
                  <span className="text-xs font-mario font-bold text-[var(--outline)]">
                    {remainingShares > 0 
                      ? `${remainingShares} more ${remainingShares === 1 ? 'share' : 'shares'} to earn $1000 SOL!`
                      : 'Ready to claim $1000 SOL!'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
