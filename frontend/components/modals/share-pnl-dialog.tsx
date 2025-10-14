"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Share2, Download, Copy, Check, Loader2 } from "lucide-react"
import html2canvas from "html2canvas"

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
}

export function SharePnLDialog({ totalPnL, totalPnLPercent, currentValue, initialBalance, open: externalOpen, onOpenChange: externalOnOpenChange, userHandle, userAvatarUrl, userEmail }: SharePnLDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const handleDownload = async () => {
    if (!cardRef.current || isGenerating) return

    try {
      setIsGenerating(true)
      await new Promise((resolve) => setTimeout(resolve, 100))

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        logging: false,
        useCORS: true,
      })

      const link = document.createElement("a")
      link.download = `solsim-pnl-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
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
      await new Promise((resolve) => setTimeout(resolve, 100))

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        logging: false,
        useCORS: true,
      })

      canvas.toBlob(async (blob) => {
        if (blob) {
          await navigator.clipboard.write([
            new ClipboardItem({
              "image/png": blob,
            }),
          ])
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      })
    } catch (error) {
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
          className="gap-2 bg-transparent"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        >
          <Share2 className="h-4 w-4" />
          Share PnL
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Share Your Performance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Shareable Card */}
          <div
            ref={cardRef}
            className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-8"
          >
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-accent/20 to-transparent rounded-full blur-3xl" />
            </div>

            {/* Content Container */}
            <div className="relative z-10">
              {/* Logo and Branding */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-sm" />
                  <span className="text-xl font-bold text-white">SOL SIM</span>
                </div>
                <span className="text-lg font-semibold text-primary">Sol Sim</span>
              </div>

              {/* Main PnL Display */}
              <div
                className={`${
                  totalPnL > 0 ? "bg-accent/20 border-accent" : "bg-destructive/20 border-destructive"
                } border-2 rounded-lg p-4 mb-6`}
              >
                <div className="text-4xl font-bold font-mono text-white">
                  {totalPnL > 0 ? "+" : ""}${Math.abs(totalPnL).toFixed(2)}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-primary text-sm font-semibold">PNL</span>
                  <span className={`text-sm font-mono ${totalPnL > 0 ? "text-accent" : "text-destructive"}`}>
                    {totalPnL > 0 ? "+" : ""}
                    {totalPnLPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-primary text-sm font-semibold">Invested</span>
                  <span className="text-sm font-mono text-white">${initialBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-primary text-sm font-semibold">Position</span>
                  <span className="text-sm font-mono text-white">${currentValue.toFixed(2)}</span>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3">
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt={userHandle || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                    {(userHandle?.[0] || userEmail?.[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-white font-semibold">@{userHandle || userEmail?.split('@')[0] || 'trader'}</div>
                  <div className="text-xs text-primary">solsim.fun</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="flex-1 gap-2" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download
                </>
              )}
            </Button>
            <Button
              onClick={handleCopy}
              variant="outline"
              className="flex-1 gap-2 bg-transparent"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Image
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
