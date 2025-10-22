"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { calculateLevel, LEVEL_THRESHOLDS, formatXP } from "@/lib/utils/levelSystem"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Trophy, Star, Lock, Zap } from "lucide-react"

interface LevelProgressModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentXP: number
}

export function LevelProgressModal({ open, onOpenChange, currentXP }: LevelProgressModalProps) {
  const levelInfo = calculateLevel(currentXP)
  const xpIntoLevel = levelInfo.xpIntoLevel
  const xpNeededForNext = levelInfo.xpForNextLevel - levelInfo.xpForCurrentLevel
  const progressPercent = Math.min(100, (xpIntoLevel / xpNeededForNext) * 100)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-4 border-pipe-800 shadow-mario">
        <DialogHeader>
          <DialogTitle className="font-mario text-2xl text-mario-red-500 text-center mb-4">
            Level Progression
          </DialogTitle>
        </DialogHeader>

        {/* Current Level Display */}
        <div className="mb-6 p-6 bg-gradient-to-r from-star-yellow-400 to-coin-yellow-500 rounded-lg border-4 border-star-yellow-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="text-6xl">{levelInfo.icon}</div>
              <div>
                <div className="font-mario text-3xl text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                  Level {levelInfo.level}
                </div>
                <div className="text-xl text-white/90 font-bold">
                  {levelInfo.title}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/80 font-bold">Total XP</div>
              <div className="font-mario text-2xl text-white drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]">
                {formatXP(currentXP)}
              </div>
            </div>
          </div>

          {/* Progress to Next Level */}
          <div className="bg-white/30 backdrop-blur-sm rounded-lg p-4 border-2 border-white/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white">Progress to Level {levelInfo.level + 1}</span>
              <span className="text-sm font-bold text-white">{Math.floor(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-4 bg-white/50 border-2 border-white/70" />
            <div className="flex items-center justify-between mt-2 text-xs text-white/90">
              <span className="font-semibold">{formatXP(xpIntoLevel)} XP</span>
              <span className="font-semibold">{formatXP(xpNeededForNext - xpIntoLevel)} XP needed</span>
            </div>
          </div>
        </div>

        {/* All Levels Grid */}
        <div>
          <h3 className="font-mario text-lg text-foreground mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-mario-yellow-500" />
            All Levels
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LEVEL_THRESHOLDS.map((threshold) => {
              const isUnlocked = currentXP >= threshold.xpRequired
              const isCurrent = threshold.level === levelInfo.level
              const isNext = threshold.level === levelInfo.level + 1

              return (
                <div
                  key={threshold.level}
                  className={cn(
                    "p-4 rounded-lg border-3 transition-all",
                    isCurrent && "bg-gradient-to-r from-star-yellow-400/30 to-coin-yellow-500/30 border-star-yellow-600 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.15)]",
                    isNext && "bg-gradient-to-r from-luigi-green-400/20 to-luigi-green-500/20 border-luigi-green-600 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]",
                    !isCurrent && !isNext && isUnlocked && "bg-white border-pipe-700",
                    !isUnlocked && "bg-pipe-100 border-pipe-400 opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "text-3xl",
                        !isUnlocked && "grayscale opacity-50"
                      )}>
                        {threshold.icon}
                      </div>
                      <div>
                        <div className={cn(
                          "font-mario text-sm",
                          isCurrent && "text-star-yellow-700",
                          isNext && "text-luigi-green-700",
                          !isCurrent && !isNext && isUnlocked && "text-foreground",
                          !isUnlocked && "text-muted-foreground"
                        )}>
                          Level {threshold.level}
                        </div>
                        <div className={cn(
                          "text-xs font-semibold",
                          isUnlocked ? "text-foreground/80" : "text-muted-foreground"
                        )}>
                          {threshold.title}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isUnlocked ? (
                        isCurrent ? (
                          <div className="flex items-center gap-1 text-star-yellow-600">
                            <Star className="h-4 w-4 fill-current" />
                            <span className="text-xs font-bold">Current</span>
                          </div>
                        ) : isNext ? (
                          <div className="text-xs font-bold text-luigi-green-600">
                            Next Level
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600">
                            <Trophy className="h-4 w-4" />
                            <span className="text-xs font-bold">Unlocked</span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Lock className="h-4 w-4" />
                          <span className="text-xs font-bold">Locked</span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1 font-mono">
                        {formatXP(threshold.xpRequired)} XP
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* XP Guide Section */}
        <div className="mt-6 p-4 bg-sky-50 rounded-lg border-3 border-sky-200">
          <h4 className="font-mario text-sm text-foreground mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-coin-yellow-500" />
            How to Earn XP
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-start gap-2">
              <div className="text-lg">💰</div>
              <div>
                <div className="font-bold text-foreground">Trading Volume</div>
                <div className="text-muted-foreground">10 XP per $100 traded</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="text-lg">📈</div>
              <div>
                <div className="font-bold text-foreground">Profitable Trades</div>
                <div className="text-muted-foreground">25 XP + 50 XP per $100 profit</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="text-lg">🏆</div>
              <div>
                <div className="font-bold text-foreground">Leaderboard</div>
                <div className="text-muted-foreground">Up to 5,000 XP for #1</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="text-lg">🎯</div>
              <div>
                <div className="font-bold text-foreground">Achievements</div>
                <div className="text-muted-foreground">500-1,000 XP each</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
