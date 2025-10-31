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

  const handleDownload = async () => {
    if (!cardRef.current || isGenerating) return
    try {
      setIsGenerating(true)
      await waitForImagesToLoad(cardRef.current)
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "var(--background)",
        skipAutoScale: true,
      })
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
      await waitForImagesToLoad(cardRef.current)
      const blob = await toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "var(--background)",
        skipAutoScale: true,
      })
      if (!blob) throw new Error("Failed to generate image blob")
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
      setHasDownloaded(true)
      toast({ title: "Copied to clipboard", description: "Your PnL card is ready to paste." })
    } catch (error) {
      console.error("Failed to copy PnL image:", error)
      toast({ title: "Copy failed", description: "Please try again.", variant: "destructive" })
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
        className="sm:max-w-[640px] rounded-2xl"
        style={{
          background: "var(--modal)",
          border: "4px solid var(--outline-black)",
          boxShadow: "var(--shadow-modal)",
          zIndex: "var(--z-modal)"
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

        <div className="space-y-4">
          {/* Shareable Card */}
          <div
            ref={cardRef}
            className="
              share-card mario-card-desktop relative w-full aspect-[16/9] overflow-hidden
              bg-[var(--card-bg-elevated)]
            "
            style={{ padding: 'var(--share-card-padding)' }}
            aria-label="Shareable PnL preview card"
          >
            {/* Top bar - aligned horizontally */}
            <div
              className="share-card__header"
              style={{
                position: 'absolute',
                insetInline: 'var(--share-card-padding)',
                insetBlockStart: 'var(--share-card-padding)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: 'calc(100% - (var(--share-card-padding) * 2))'
              }}
            >
              {/* Left: Header badge - just the SVG */}
              <div className="inline-flex items-center justify-center px-3 py-2 rounded-lg mario-border mario-shadow bg-[var(--card-info)]">
                <img
                  src="/Check-out-my-pnl-10-31-2025.png"
                  alt="Share banner"
                  className="h-6 w-auto object-contain"
                  crossOrigin="anonymous"
                  loading="eager"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                />
              </div>

              {/* Right: LIVE tag */}
              <div className="px-3 py-2 rounded-lg mario-border mario-shadow bg-[var(--luigi-green)]">
                <span className="text-[10px] font-display font-bold text-white tracking-widest live-indicator">LIVE</span>
              </div>
            </div>

            {/* Content - better vertical centering */}
            <div
              className="share-card__content"
              style={{
                position: 'relative',
                zIndex: 10,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 'var(--share-card-gap)',
                padding: 'var(--share-card-padding)',
                paddingBlockStart: 'calc(var(--share-card-padding) + var(--share-header-height))'
              }}
            >
              {/* Main content area - even gap between columns */}
              <div
                className="share-card__main"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 180px',
                  gap: '1rem',
                  alignItems: 'stretch'
                }}
              >
                {/* Left: PnL - compact padding */}
                <div className="rounded-lg mario-border mario-shadow p-6 flex flex-col justify-center bg-[color-mix(in_oklab,var(--luigi-green)_20%,var(--background)_80%)]" style={{
                  backgroundColor: positive 
                    ? 'color-mix(in oklab, var(--luigi-green) 20%, var(--background) 80%)' 
                    : 'color-mix(in oklab, var(--mario-red) 18%, var(--background) 82%)'
                }}>
                  {/* Compact vertical spacing */}
                  <div className="space-y-4">
                    {/* Token/Label row - better alignment */}
                    <div className="flex items-center gap-2">
                      {isTokenSpecific && tokenImageUrl && (
                        <img
                          src={tokenImageUrl}
                          alt={tokenName || tokenSymbol || "Token"}
                          className="w-7 h-7 rounded-full object-cover mario-border"
                          crossOrigin="anonymous"
                          loading="eager"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                        />
                      )}
                      <div className="text-xs font-display font-bold tracking-wider text-[var(--muted-foreground)] uppercase">
                        {isTokenSpecific && tokenSymbol ? `${tokenSymbol} PNL` : "DOPE PNL"}
                      </div>
                    </div>

                    {/* PnL Amount */}
                    <div className={`text-6xl font-display font-black leading-none tracking-tighter ${positive ? "text-[var(--luigi-dark)]" : "text-[var(--mario-dark)]"}`}>
                      {positive ? "+" : ""}${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>

                    {/* Percentage badge */}
                    <div className="flex items-center">
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-display font-black mario-border mario-shadow ${positive ? "bg-[var(--luigi-green)] text-white" : "bg-[var(--mario-red)] text-white"}`}>
                        <span className="text-lg leading-none">{positive ? "↗" : "↘"}</span>
                        <span className="leading-none">{positive ? "+" : ""}{totalPnLPercent.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Stats - compact spacing */}
                <div
                  className="share-card__stats"
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
                >
                  {/* Invested card - smaller */}
                  <div className="rounded-lg mario-border mario-shadow p-4 bg-[var(--card-portfolio)]">
                    <div className="text-[10px] text-[var(--muted-foreground)] mb-2 uppercase font-display font-bold tracking-wider">Invested</div>
                    <div className="text-2xl font-display font-black text-[var(--outline-black)] tracking-tight leading-none">
                      ${initialBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  
                  {/* Position card - smaller */}
                  <div className="rounded-lg mario-border mario-shadow p-4 bg-[var(--card-stats)]">
                    <div className="text-[10px] text-[var(--muted-foreground)] mb-2 uppercase font-display font-bold tracking-wider">Position</div>
                    <div className="text-2xl font-display font-black text-[var(--outline-black)] tracking-tight leading-none">
                      ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer: user - compact padding */}
              <div
                className="share-card__footer mario-border"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingBlockStart: 'var(--share-footer-gap)',
                  borderTop: '3px solid var(--outline-black)'
                }}
              >
                <div className="flex items-center gap-2">
                  {userAvatarUrl ? (
                    <img
                      src={userAvatarUrl}
                      alt={userHandle || userEmail || "User"}
                      className="w-8 h-8 rounded-full object-cover mario-border mario-shadow"
                      crossOrigin="anonymous"
                      loading="eager"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement
                        img.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full mario-border mario-shadow bg-[var(--star-yellow)] grid place-items-center">
                      <span className="font-display font-black text-[var(--outline-black)] text-sm">
                        {(userHandle?.[0] || userEmail?.[0] || "A").toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="space-y-0">
                    <div className="text-[var(--outline-black)] font-display font-bold text-sm leading-tight">
                      @{userHandle || userEmail?.split("@")[0] || "admin"}
                    </div>
                    <div className="text-[10px] text-[var(--sky-blue)] font-display font-semibold tracking-wide uppercase">ONEUPSOL.FUN</div>
                  </div>
                </div>
                <div className="text-right space-y-0">
                  <div className="text-[9px] text-[var(--muted-foreground)] uppercase font-display font-bold tracking-wider">Powered by</div>
                  <div className="text-xl font-display font-black text-[var(--outline-black)] tracking-tight leading-none">1UP</div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 h-12 px-4 rounded-xl mario-border mario-shadow font-display
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
                className="flex-1 h-12 px-4 rounded-xl mario-border mario-shadow font-display
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
            <div className="space-y-2">
              <button
                onClick={handleShareToTwitter}
                disabled={isTracking || !hasDownloaded}
                className={`w-full h-14 px-4 rounded-xl mario-border mario-shadow font-display text-lg
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

              <div className="flex items-center justify-center gap-3 p-3 rounded-lg mario-border bg-[color-mix(in_oklab,var(--color-star)_10%,transparent_90%)]">
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
