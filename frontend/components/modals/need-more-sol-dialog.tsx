"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Sparkles, Check, Loader2, Gift, Share2, Clock } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { useSolRewards } from "@/hooks/use-sol-rewards"
import { motion, AnimatePresence } from "framer-motion"
import { formatDistanceToNow } from "date-fns"

interface NeedMoreSolDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onShareClick?: () => void
}

export function NeedMoreSolDialog({ open, onOpenChange, onShareClick }: NeedMoreSolDialogProps) {
  const {
    shareCount,
    remainingShares,
    canClaim,
    totalRewarded,
    nextClaimAvailable,
    trackShare,
    claimReward,
    isTracking,
    isClaiming,
  } = useSolRewards()

  const progressPercent = (shareCount / 3) * 100

  // Check if in cooldown
  const isInCooldown = nextClaimAvailable && new Date() < new Date(nextClaimAvailable)
  const cooldownText = isInCooldown 
    ? `Next reward available ${formatDistanceToNow(new Date(nextClaimAvailable!), { addSuffix: true })}`
    : null

  const handleShareClick = () => {
    onShareClick?.()
    onOpenChange(false)
  }

  const handleClaim = async () => {
    claimReward()
    // Dialog will stay open to show success message
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[var(--background)] border-4 border-[var(--outline)] shadow-[8px_8px_0_var(--outline-black)] z-50">
        <DialogHeader>
          <DialogTitle className="font-mario text-2xl text-[var(--outline)] flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[var(--star)]" />
            Need More SOL?
          </DialogTitle>
          <DialogDescription className="text-[var(--outline)]/70">
            Share your trading performance on X (Twitter) to earn $1000 virtual SOL!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Hero Section */}
          <div className="relative p-6 rounded-xl bg-gradient-to-br from-[var(--star)]/20 to-[var(--luigi)]/20 border-4 border-[var(--outline)] shadow-[4px_4px_0_var(--outline-black)]">
            <div className="absolute top-0 right-0 p-2">
              <Gift className="h-8 w-8 text-[var(--star)]" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-3xl font-mario font-black text-[var(--outline)]">
                $1,000
                <span className="text-base ml-2 text-[var(--outline)]/70">SOL</span>
              </h3>
              <p className="text-sm text-[var(--outline)]/80 font-bold">
                Share 3 PnL cards to unlock your reward
              </p>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mario font-bold text-[var(--outline)]">
                Progress
              </span>
              <span className="text-sm font-mario font-bold text-[var(--outline)]">
                {shareCount}/3 shares
              </span>
            </div>

            {/* Progress Bar */}
            <div className="relative h-8 rounded-lg bg-[var(--outline)]/20 border-3 border-[var(--outline)] overflow-hidden shadow-[2px_2px_0_var(--outline-black)]">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--luigi)] to-[var(--star)] flex items-center justify-center"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                {progressPercent > 15 && (
                  <span className="text-xs font-mario font-black text-white drop-shadow-[1px_1px_0_var(--outline-black)]">
                    {progressPercent.toFixed(0)}%
                  </span>
                )}
              </motion.div>
            </div>

            {/* Share Checkpoints */}
            <div className="flex justify-between px-1">
              {[1, 2, 3].map((checkpoint) => (
                <motion.div
                  key={checkpoint}
                  className={`flex flex-col items-center gap-1 ${
                    shareCount >= checkpoint ? 'opacity-100' : 'opacity-40'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: checkpoint * 0.1 }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-3 border-[var(--outline)] shadow-[2px_2px_0_var(--outline-black)] ${
                      shareCount >= checkpoint
                        ? 'bg-[var(--luigi)] text-white'
                        : 'bg-[var(--background)] text-[var(--outline)]/50'
                    }`}
                  >
                    {shareCount >= checkpoint ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-[10px] font-mario font-bold text-[var(--outline)]/70">
                    Share {checkpoint}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Cooldown Warning */}
          {isInCooldown && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--sky)]/20 border-2 border-[var(--sky)]">
              <Clock className="h-4 w-4 text-[var(--sky)]" />
              <p className="text-xs font-bold text-[var(--outline)]">
                {cooldownText}
              </p>
            </div>
          )}

          {/* Total Rewarded */}
          {totalRewarded > 0 && (
            <div className="text-center p-3 rounded-lg bg-[var(--star)]/10 border-2 border-[var(--star)]/30">
              <p className="text-xs text-[var(--outline)]/70 font-bold">
                Total Earned
              </p>
              <p className="text-2xl font-mario font-black text-[var(--star)]">
                ${totalRewarded.toLocaleString()}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <AnimatePresence mode="wait">
              {canClaim && !isInCooldown ? (
                <motion.div
                  key="claim"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className="w-full h-14 text-lg font-mario font-bold bg-[var(--star)] text-[var(--outline)] hover:bg-[var(--star)]/90 border-4 border-[var(--outline)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all rounded-xl"
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Gift className="h-5 w-5 mr-2" />
                        Claim $1,000 SOL!
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="share"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <Button
                    onClick={handleShareClick}
                    disabled={isInCooldown}
                    className="w-full h-14 text-lg font-mario font-bold bg-[var(--luigi)] text-white hover:bg-[var(--luigi)]/90 border-4 border-[var(--outline)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Share2 className="h-5 w-5 mr-2" />
                    {isInCooldown 
                      ? 'In Cooldown Period' 
                      : `Share My PnL (${remainingShares} more)`
                    }
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full font-mario font-bold border-3 border-[var(--outline)] shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all bg-[var(--background)] text-[var(--outline)] hover:bg-[var(--outline)]/10"
            >
              Maybe Later
            </Button>
          </div>

          {/* Info Text */}
          <div className="text-center space-y-1">
            <p className="text-xs text-[var(--outline)]/70 font-bold">
              {isInCooldown 
                ? "You've already claimed this week's reward!"
                : "Share your trading wins (or lessons learned 😅) with the community"
              }
            </p>
            <p className="text-[10px] text-[var(--outline)]/60">
              Virtual SOL only • No wallet connection required
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
