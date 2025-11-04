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
  tokenSymbol?: string
  tokenName?: string
  tokenImageUrl?: string
  isTokenSpecific?: boolean
}

export function SharePnLDialog({
  totalPnL,
  totalPnLPercent,
  currentValue,
  initialBalance,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  userHandle,
  userAvatarUrl,
  userEmail,
  tokenSymbol,
  tokenName,
  tokenImageUrl,
  isTokenSpecific
}: SharePnLDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasDownloaded, setHasDownloaded] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { trackShare, shareCount, remainingShares, isTracking } = useSolRewards()

  // wait for images to load (kept your logic, just tiny tidy)
  const waitForImagesToLoad = async (element: HTMLElement) => {
    const images = Array.from(element.querySelectorAll("img"))
    await Promise.all(
      images.map((img) => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve()
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 3000)
          img.onload = () => { clearTimeout(timeout); resolve() }
          img.onerror = () => { clearTimeout(timeout); resolve() }
        })
      })
    )
    await new Promise((r) => setTimeout(r, 100))
  }

  // Resolve a CSS custom property to a concrete color string (e.g., #fff)
  const getCssVarValue = (varName: string, fallback = "#ffffff") => {
    try {
      const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
      return value || fallback
    } catch {
      return fallback
    }
  }

  // Ensure fonts and images are ready before rasterizing
  const ensureAssetsReady = async (host: HTMLElement) => {
    // Wait for fonts (supported in modern browsers)
    try {
      if (document.fonts && typeof document.fonts.ready?.then === "function") {
        await document.fonts.ready
      }
    } catch {/* noop */}
    await waitForImagesToLoad(host)
  }

  // Convert external image to data URL to avoid CORS issues
  const imageToDataURL = async (imgElement: HTMLImageElement): Promise<string | null> => {
    try {
      // Skip if already a data URL
      if (imgElement.src.startsWith('data:')) return imgElement.src

      // For local images, keep as-is
      if (imgElement.src.startsWith(window.location.origin)) return imgElement.src

      // For external images, try to reload with CORS and convert to data URL
      const originalSrc = imgElement.src

      // Create a new image element with CORS enabled
      const corsImg = new Image()
      corsImg.crossOrigin = 'anonymous'

      // Wait for image to load with CORS
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Image load timeout')), 5000)
        corsImg.onload = () => {
          clearTimeout(timeout)
          resolve()
        }
        corsImg.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Image load failed'))
        }
        corsImg.src = originalSrc
      })

      // Convert to canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return null

      canvas.width = corsImg.naturalWidth || corsImg.width || 100
      canvas.height = corsImg.naturalHeight || corsImg.height || 100

      ctx.drawImage(corsImg, 0, 0)
      return canvas.toDataURL('image/png')
    } catch (error) {
      console.warn('Failed to convert image to data URL:', error)
      return null
    }
  }

  // Shared generator - returns PNG data URL or Blob
  function generateShareImage(mode: "png"): Promise<string>
  function generateShareImage(mode: "blob"): Promise<Blob | null>
  async function generateShareImage(mode: "png" | "blob") {
    const node = cardRef.current
    if (!node) throw new Error("Missing share card element")
    await ensureAssetsReady(node)

    // Convert all external images to data URLs to avoid CORS issues
    const images = Array.from(node.querySelectorAll('img'))
    await Promise.allSettled(
      images.map(async (img) => {
        try {
          // For external images, try to convert to data URL
          if (!img.src.startsWith('data:') && !img.src.startsWith(window.location.origin)) {
            const dataUrl = await imageToDataURL(img)
            if (dataUrl) {
              img.src = dataUrl
            } else {
              // If conversion fails, hide the image to prevent CORS errors
              console.warn('Could not convert external image, hiding:', img.src)
              img.style.display = 'none'
            }
          }
        } catch (error) {
          console.warn('Error processing image, hiding:', img.src, error)
          img.style.display = 'none'
        }
      })
    )

    // Wait a bit for images to update
    await new Promise(resolve => setTimeout(resolve, 150))

    const backgroundColor = getCssVarValue("--card", getCssVarValue("--background", "#ffffff"))
    const common = {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor,
      skipAutoScale: true,
      skipFonts: false,
      filter: (node: any) => {
        // Only filter Element nodes (not text nodes or other types)
        if (!node || node.nodeType !== Node.ELEMENT_NODE) {
          return true
        }
        try {
          // Exclude hidden elements
          const style = window.getComputedStyle(node as Element)
          return style.display !== 'none' && style.visibility !== 'hidden'
        } catch {
          return true
        }
      },
    } as const

    try {
      if (mode === "png") {
        return await toPng(node, common)
      }
      return await toBlob(node, common)
    } catch (error) {
      console.error('html-to-image generation failed:', error)
      throw error
    }
  }

  const handleDownload = async () => {
    if (!cardRef.current || isGenerating) return
    try {
      setIsGenerating(true)
      const dataUrl = await generateShareImage("png")
      const link = document.createElement("a")
      link.download = `oneupsol-pnl-${Date.now()}.png`
      link.href = dataUrl
      link.click()
      setHasDownloaded(true)
      toast({ title: "Download successful", description: "Your PnL card has been downloaded." })
    } catch (error) {
      console.error("Failed to download PnL image:", error)
      toast({ title: "Download failed", description: "Please try again.", variant: "destructive" })
      import("@/lib/error-logger").then(({ errorLogger }) => {
        errorLogger.error("Failed to download PnL image", { error: error as Error, action: "pnl_image_download_failed", metadata: { component: "SharePnLDialog" } })
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!cardRef.current || isGenerating) return
    try {
      setIsGenerating(true)

      // Clear any text selection that might interfere with clipboard operations
      if (window.getSelection) {
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
        }
      }

      const blob = await generateShareImage("blob")
      if (!blob) throw new Error("Failed to generate image blob")

      // Check if Clipboard API is available
      const itemCtor: any = (window as any).ClipboardItem
      const hasClipboardAPI = itemCtor && navigator.clipboard && typeof (navigator.clipboard as any).write === "function"

      if (hasClipboardAPI) {
        try {
          // Try to write image to clipboard
          await (navigator.clipboard as any).write([new itemCtor({ "image/png": blob })])
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
          setHasDownloaded(true)
          toast({
            title: "✅ Image copied!",
            description: "Paste it anywhere (Ctrl+V or Cmd+V)."
          })
        } catch (clipboardError: any) {
          // Clipboard write failed, fallback to download + instructions
          console.warn("Clipboard write failed, using fallback:", clipboardError)

          // Auto-download the image
          const dataUrl = URL.createObjectURL(blob)
          const link = document.createElement("a")
          link.download = `oneupsol-pnl-${Date.now()}.png`
          link.href = dataUrl
          link.click()

          toast({
            title: "Image downloaded",
            description: "Your browser blocked clipboard access. Image saved to Downloads folder instead.",
            duration: 5000
          })
          setHasDownloaded(true)
        }
      } else {
        // No clipboard API - download instead
        const dataUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.download = `oneupsol-pnl-${Date.now()}.png`
        link.href = dataUrl
        link.click()

        toast({
          title: "Image downloaded",
          description: "Clipboard not supported. Image saved to Downloads folder.",
          duration: 4000
        })
        setHasDownloaded(true)
      }
    } catch (error) {
      console.error("Failed to copy PnL image:", error)
      toast({
        title: "Copy failed",
        description: "Please try the Download button instead.",
        variant: "destructive"
      })
      import("@/lib/error-logger").then(({ errorLogger }) => {
        errorLogger.error("Failed to copy PnL image", { error: error as Error, action: "pnl_image_copy_failed", metadata: { component: "SharePnLDialog" } })
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleShareToTwitter = async () => {
    try {
      const pnlEmoji = totalPnL >= 0 ? "📈" : "📉"
      const pnlSign = totalPnL >= 0 ? "+" : ""
      const pnlAmount = Math.abs(totalPnL).toFixed(2)
      const text = isTokenSpecific && tokenSymbol
        ? `Check out my ${tokenSymbol} trading performance on @1upSOL! ${pnlEmoji} ${pnlSign}$${pnlAmount} PnL\n\nPaper trading Solana memecoins with ZERO risk.`
        : `Check out my trading performance on @1upSOL! ${pnlEmoji} ${pnlSign}$${pnlAmount} PnL (${pnlSign}${totalPnLPercent.toFixed(2)}%)\n\nPaper trading Solana memecoins with ZERO risk.`
      const url = "https://oneupsol.fun"
      const hashtags = "Solana,PaperTrading,Crypto,1UP"
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${hashtags}`
      window.open(twitterUrl, "_blank", "noopener,noreferrer")
      trackShare()
    } catch (error) {
      console.error("Failed to share to Twitter:", error)
      toast({ title: "Share failed", description: "Failed to open X. Please try again.", variant: "destructive" })
    }
  }

  const positive = totalPnL >= 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-9 px-4 font-display font-bold rounded-lg
                     mario-border mario-shadow bg-[var(--sky-blue)] text-[var(--outline-black)]
                     hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all"
          onClick={(e) => { e.stopPropagation(); setOpen(true) }}
          aria-label="Open share PnL dialog"
        >
          <Share2 className="h-4 w-4" />
          Share PnL
        </Button>
      </DialogTrigger>

      {/* Use semantic z-index token instead of hard-coded z-50 */}
      <DialogContent
        className="sm:max-w-[560px] rounded-2xl"
        style={{
          background: "var(--modal)",
          border: "4px solid var(--outline-black)",
          boxShadow: "var(--shadow-modal)",
          // Ensure we have a safe fallback if CSS var is absent
          zIndex: (typeof window !== "undefined" ? parseInt(getComputedStyle(document.documentElement).getPropertyValue("--z-modal").trim() || "1050") : 1050) as unknown as number
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-[var(--outline-black)]">
            Share Your Performance
          </DialogTitle>
          <DialogDescription className="text-[var(--muted-foreground)] font-body">
            Download or copy an image of your performance, then post to X to earn rewards.
          </DialogDescription>
        </DialogHeader>

  <div className="space-y-2">
          {/* Shareable Card */}
          <div
            ref={cardRef}
            className="
              share-card mario-card-desktop relative w-full aspect-[16/10] overflow-hidden
              bg-[var(--card-share-bg)] select-none
            "
            aria-label="Shareable PnL preview card"
          >
            {/* Inline background layer so html-to-image captures it (pseudo-elements are not serialized) */}
            {typeof window !== "undefined" && (
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url('${new URL("/24f6ff0a-ff72-4c1f-8c45-e44bbcb0f524.png", window.location.origin).toString()}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  zIndex: 0
                }}
              />
            )}
            {/* Preload background image used in CSS ::before so html-to-image waits for it */}
            <img
              src="/24f6ff0a-ff72-4c1f-8c45-e44bbcb0f524.png"
              alt=""
              aria-hidden
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
              crossOrigin="anonymous"
              loading="eager"
            />
            {/* Top banner - image with semi-transparent yellow bg */}
            <div className="share-card__header">
              <div className="w-full flex items-center justify-center px-3 py-3 rounded-xl mario-border mario-shadow relative overflow-hidden">
                {/* Semi-transparent background using site's main background color */}
                <div 
                  className="absolute inset-0 bg-[var(--background)]" 
                  style={{ opacity: 0.9 }}
                  aria-hidden="true"
                />
                <img
                  src="/Check-out-my-pnl-10-31-2025.png"
                  alt="Check out my PnL"
                  className="w-full h-auto max-h-[var(--share-header-height)] object-contain relative z-10"
                  crossOrigin="anonymous"
                  loading="eager"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              </div>
            </div>

            {/* Content - better vertical centering */}
            <div className="share-card__content">
              {/* Main content area - even gap between columns */}
              <div className="share-card__main">
                {/* Left: PnL - compact padding */}
                <div className="rounded-lg mario-border mario-shadow p-3 flex flex-col justify-center h-full bg-[color-mix(in_oklab,var(--luigi-green)_20%,var(--background)_80%)]" style={{
                  backgroundColor: positive 
                    ? 'color-mix(in oklab, var(--luigi-green) 20%, var(--background) 80%)' 
                    : 'color-mix(in oklab, var(--mario-red) 18%, var(--background) 82%)'
                }}>
                  {/* Compact vertical spacing */}
                  <div className="space-y-2.5">
                    {/* Token/Label row - better alignment */}
                    <div className="flex items-center gap-2">
                      {isTokenSpecific && tokenImageUrl && (
                        <img
                          src={tokenImageUrl}
                          alt={tokenName || tokenSymbol || "Token"}
                          className="w-6 h-6 rounded-full object-cover mario-border"
                          crossOrigin="anonymous"
                          loading="eager"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
                      )}
                      <div className="text-[11px] font-display font-bold tracking-wider text-[var(--muted-foreground)] uppercase">
                        {isTokenSpecific && tokenSymbol ? `${tokenSymbol} PNL` : "DOPE PNL"}
                      </div>
                    </div>

                    {/* PnL Amount */}
                    <div className={`text-5xl font-display font-black leading-none tracking-tighter ${positive ? "text-[var(--luigi-dark)]" : "text-[var(--mario-dark)]"}`}>
                      {positive ? "+" : ""}${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    {/* Percentage badge */}
                    <div className="flex items-center">
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-display font-black mario-border mario-shadow ${positive ? "bg-[var(--luigi-green)] text-white" : "bg-[var(--mario-red)] text-white"}`}>
                        <span className="text-base leading-none">{positive ? "↗" : "↘"}</span>
                        <span className="leading-none">{positive ? "+" : ""}{totalPnLPercent.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Stats - compact spacing */}
                <div className="share-card__stats">
                  {/* Invested card - smaller */}
                  <div className="rounded-lg mario-border mario-shadow p-2 bg-[var(--card-portfolio)]">
                    <div className="text-[8px] text-[var(--muted-foreground)] mb-1 uppercase font-display font-bold tracking-wider">Invested</div>
                    <div className="text-lg font-display font-black text-[var(--outline-black)] tracking-tight leading-none">
                      ${initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  {/* Position card - smaller */}
                  <div className="rounded-lg mario-border mario-shadow p-2 bg-[var(--card-stats)]">
                    <div className="text-[8px] text-[var(--muted-foreground)] mb-1 uppercase font-display font-bold tracking-wider">Position</div>
                    <div className="text-lg font-display font-black text-[var(--outline-black)] tracking-tight leading-none">
                      ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer: user - compact padding */}
              <div className="share-card__footer relative">
                {/* Semi-transparent background matching header */}
                <div 
                  className="absolute inset-0 bg-[var(--background)] rounded-b-lg" 
                  style={{ opacity: 0.9 }}
                  aria-hidden="true"
                />
                <div className="flex items-center gap-2 flex-shrink-0 relative z-10 pl-2">
                  {userAvatarUrl ? (
                    <img
                      src={userAvatarUrl}
                      alt={userHandle || userEmail || "User"}
                      className="w-7 h-7 rounded-full object-cover mario-border mario-shadow flex-shrink-0"
                      crossOrigin="anonymous"
                      loading="eager"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        img.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full mario-border mario-shadow bg-[var(--star-yellow)] grid place-items-center flex-shrink-0">
                      <span className="font-display font-black text-[var(--outline-black)] text-xs">
                        {(userHandle?.[0] || userEmail?.[0] || "A").toUpperCase()}
                      </span>
                    </div>
                  )}
                   <div className="space-y-0 min-w-0">
                    <div className="font-body font-semibold text-sm leading-tight tracking-normal truncate text-[var(--outline-black)]">
                      @{userHandle || userEmail?.split("@")[0] || "admin"}
                    </div>
                    <div className="text-[9px] font-body font-medium tracking-wide uppercase text-[var(--outline-black)]">ONEUPSOL.FUN</div>
                  </div>
                </div>
                 <div className="flex flex-col items-end gap-0.5 flex-shrink-0 relative z-10 pr-2">
                  <div className="text-[8px] uppercase font-body font-semibold tracking-wide text-[var(--outline-black)]">Powered by</div>
                  <img
                    src="/1up-10-31-2025.png"
                    alt="1UP"
                    className="h-5 w-auto object-contain"
                    crossOrigin="anonymous"
                    loading="eager"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 h-10 px-4 rounded-xl mario-border mario-shadow font-display
                           bg-[var(--color-luigi)] text-white transition-all
                           hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--outline-black)]
                           disabled:opacity-50 grid place-items-center gap-2"
                disabled={isGenerating}
                aria-label="Download PnL image"
              >
                {isGenerating ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Generating...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Download className="h-5 w-5" /> Download
                  </span>
                )}
              </button>

              <button
                onClick={handleCopy}
                className="flex-1 h-10 px-4 rounded-xl mario-border mario-shadow font-display
                           bg-[var(--color-sky)] text-white transition-all
                           hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--outline-black)]
                           disabled:opacity-50 grid place-items-center gap-2"
                disabled={isGenerating}
                aria-label="Copy PnL image to clipboard"
              >
                {isGenerating ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Generating...
                  </span>
                ) : copied ? (
                  <span className="inline-flex items-center gap-2">
                    <Check className="h-5 w-5" /> Copied!
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Copy className="h-5 w-5" /> Copy Image
                  </span>
                )}
              </button>
            </div>

            {/* X Share */}
            <div className="space-y-1.5">
              <button
                onClick={handleShareToTwitter}
                disabled={isTracking || !hasDownloaded}
                className={`w-full h-12 px-4 rounded-xl mario-border mario-shadow font-display text-lg
                           transition-all grid place-items-center gap-2
                           ${hasDownloaded ? "bg-[var(--color-star)] text-[var(--outline-black)] hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--outline-black)]"
                                           : "bg-[color-mix(in_oklab,var(--muted)_80%,white_20%)] text-[var(--muted-foreground)] opacity-75 cursor-not-allowed"}`}
                aria-label="Share to X (Twitter)"
                title={hasDownloaded ? "Share to X • Earn SOL!" : "Download or copy first to enable sharing"}
              >
                {isTracking ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" /> Tracking...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Share to X • Earn SOL!
                  </span>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 p-2 rounded-lg mario-border bg-[color-mix(in_oklab,var(--color-star)_10%,transparent_90%)]">
                <ShareProgressIndicator shareCount={shareCount} maxShares={3} size="sm" />
                <span className="text-xs font-display text-[var(--outline-black)]">
                  {remainingShares > 0 ? `${remainingShares} more ${remainingShares === 1 ? "share" : "shares"} to earn $1000 SOL!` : "Ready to claim $1000 SOL!"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
