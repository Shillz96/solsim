"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Share2, Download, Copy, Check, Loader2 } from "lucide-react"
import { toPng, toBlob } from "html-to-image"
import { useToast } from "@/hooks/use-toast"

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
  const cardRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

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
      <DialogContent className="sm:max-w-[600px] bg-card border-4 border-outline shadow-[8px_8px_0_var(--outline-black)]">
        <DialogHeader>
          <DialogTitle className="font-mario text-2xl text-outline">Share Your Performance</DialogTitle>
          <DialogDescription>
            Share your trading performance with others. You can download an image or copy it to your clipboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Shareable Card - Mario Theme */}
          <div
            ref={cardRef}
            className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-sky/20 border-4 border-outline shadow-[8px_8px_0_var(--outline-black)]"
          >
            {/* Content Container */}
            <div className="relative z-10 h-full flex flex-col p-5">
              {/* Header with Image */}
              <div className="flex items-center justify-between mb-4">
                <img
                  src="/Check-out-my-pnl-10-31-2025.png"
                  alt="Check out my PNL"
                  className="h-12 w-auto object-contain"
                  crossOrigin="anonymous"
                  loading="eager"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement
                    img.style.display = 'none'
                  }}
                />
                <div className="px-3 py-1 rounded-lg bg-luigi border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]">
                  <span className="text-xs font-mario font-bold text-white">LIVE</span>
                </div>
              </div>

              {/* Main Content - Two Column Layout */}
              <div className="flex-1 flex gap-3 mb-2">
                {/* Left: PnL Display */}
                <div className="flex-1 flex flex-col justify-center">
                  <div className={`relative p-4 rounded-xl border-4 border-outline ${
                    totalPnL >= 0
                      ? "bg-luigi/20 shadow-[4px_4px_0_var(--luigi)]"
                      : "bg-mario/20 shadow-[4px_4px_0_var(--mario)]"
                  }`}>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-1.5">
                        {isTokenSpecific && tokenImageUrl && (
                          <img
                            src={tokenImageUrl}
                            alt={tokenSymbol || 'Token'}
                            className="w-6 h-6 rounded-full object-cover border-2 border-outline"
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
                        <div className="text-xs font-mario font-bold text-outline uppercase tracking-wider">
                          {isTokenSpecific && tokenSymbol ? `${tokenSymbol} PNL` : 'TOTAL PNL'}
                        </div>
                      </div>
                      <div className={`text-4xl font-mario font-black mb-2 ${
                        totalPnL >= 0 ? "text-luigi" : "text-mario"
                      }`}>
                        {totalPnL >= 0 ? "+" : ""}${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-lg text-sm font-mario font-bold border-3 border-outline shadow-[2px_2px_0_var(--outline-black)] ${
                          totalPnL >= 0
                            ? "bg-luigi text-white"
                            : "bg-mario text-white"
                        }`}>
                          {totalPnL >= 0 ? "↗" : "↘"} {totalPnL >= 0 ? "+" : ""}{totalPnLPercent.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Stats */}
                <div className="flex flex-col gap-2 justify-center min-w-[160px]">
                  <div className="bg-sky/20 border-3 border-outline rounded-lg p-3 shadow-[2px_2px_0_var(--outline-black)]">
                    <div className="text-[10px] text-outline/60 mb-1 uppercase tracking-wide font-bold">Invested</div>
                    <div className="text-base font-mario font-bold text-outline">${initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <div className="bg-star/20 border-3 border-outline rounded-lg p-3 shadow-[2px_2px_0_var(--outline-black)]">
                    <div className="text-[10px] text-outline/60 mb-1 uppercase tracking-wide font-bold">Position</div>
                    <div className="text-base font-mario font-bold text-outline">${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>

              {/* User Info Footer */}
              <div className="flex items-center justify-between pt-3 border-t-4 border-outline">
                <div className="flex items-center gap-2">
                  {userAvatarUrl ? (
                    <img
                      src={userAvatarUrl}
                      alt={userHandle || 'User'}
                      className="w-8 h-8 rounded-full object-cover border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]"
                      crossOrigin="anonymous"
                      loading="eager"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        const fallbackDiv = document.createElement('div')
                        fallbackDiv.className = 'w-8 h-8 rounded-full bg-star flex items-center justify-center text-outline font-mario font-black text-sm border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]'
                        fallbackDiv.textContent = (userHandle?.[0] || userEmail?.[0] || 'U').toUpperCase()
                        img.parentNode?.replaceChild(fallbackDiv, img)
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-star flex items-center justify-center text-outline font-mario font-black text-sm border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]">
                      {(userHandle?.[0] || userEmail?.[0] || 'U').toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-outline font-mario font-bold text-sm">@{userHandle || userEmail?.split('@')[0] || 'trader'}</div>
                    <div className="text-[10px] text-sky font-bold">oneupsol.fun</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-outline/60 uppercase tracking-wide font-bold">Powered by</div>
                  <div className="text-base font-mario font-black text-outline">1UP</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons - Mario Style */}
          <div className="flex gap-3">
            <button 
              onClick={handleDownload} 
              className="flex-1 gap-2 h-12 px-4 rounded-xl border-4 border-outline bg-luigi text-white hover:bg-luigi/90 shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center font-mario font-bold disabled:opacity-50" 
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
              className="flex-1 gap-2 h-12 px-4 rounded-xl border-4 border-outline bg-sky text-white hover:bg-sky/90 shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all flex items-center justify-center font-mario font-bold disabled:opacity-50"
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
