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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FFFAE9] border-3 border-pipe-800 shadow-xl">
        <DialogHeader className="border-b-2 border-pipe-300 pb-4">
          <DialogTitle className="font-mario text-xl text-mario-red-500 text-center">
            🏆 Level Progression 🏆
          </DialogTitle>
        </DialogHeader>

        {/* Current Level Display */}
        <div className="mb-4 p-5 bg-gradient-to-br from-star-yellow-400 to-coin-yellow-500 rounded-xl border-3 border-star-yellow-600 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="text-5xl">{levelInfo.icon}</div>
              <div>
                <div className="font-mario text-2xl text-pipe-900 drop-shadow-sm">
                  Level {levelInfo.level}
                </div>
                <div className="text-base text-pipe-800 font-bold">
                  {levelInfo.title}
                </div>
              </div>
            </div>
            <div className="text-right bg-white/40 backdrop-blur-sm px-3 py-2 rounded-lg border-2 border-white/60">
              <div className="text-xs text-pipe-700 font-bold">Total XP</div>
              <div className="font-mario text-xl text-pipe-900">
                {formatXP(currentXP)}
              </div>
            </div>
          </div>

          {/* Progress to Next Level */}
          <div className="bg-white rounded-lg p-3 border-2 border-pipe-300 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-pipe-800">Progress to Level {levelInfo.level + 1}</span>
              <span className="text-sm font-bold text-mario-red-500">{Math.floor(progressPercent)}%</span>
            </div>
            <div className="h-3 bg-pipe-200 rounded-full border-2 border-pipe-400 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-luigi-green-500 to-luigi-green-600 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-pipe-700">
              <span className="font-semibold">{formatXP(xpIntoLevel)} XP</span>
              <span className="font-semibold">{formatXP(xpNeededForNext - xpIntoLevel)} needed</span>
            </div>
          </div>
        </div>

        {/* All Levels Grid */}
        <div className="bg-white rounded-lg p-4 border-2 border-pipe-300">
          <h3 className="font-mario text-base text-pipe-900 mb-3 flex items-center gap-2 border-b-2 border-pipe-200 pb-2">
            <Trophy className="h-4 w-4 text-coin-yellow-600" />
            All Levels
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[400px] overflow-y-auto pr-2">
            {LEVEL_THRESHOLDS.map((threshold) => {
              const isUnlocked = currentXP >= threshold.xpRequired
              const isCurrent = threshold.level === levelInfo.level
              const isNext = threshold.level === levelInfo.level + 1

              return (
                <div
                  key={threshold.level}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all",
                    isCurrent && "bg-gradient-to-r from-star-yellow-400/40 to-coin-yellow-500/40 border-star-yellow-600 shadow-md",
                    isNext && "bg-gradient-to-r from-luigi-green-400/30 to-luigi-green-500/30 border-luigi-green-600 shadow-sm",
                    !isCurrent && !isNext && isUnlocked && "bg-sky-50 border-pipe-400",
                    !isUnlocked && "bg-pipe-100/50 border-pipe-300 opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "text-2xl",
                        !isUnlocked && "grayscale opacity-40"
                      )}>
                        {threshold.icon}
                      </div>
                      <div>
                        <div className={cn(
                          "font-mario text-xs",
                          isCurrent && "text-star-yellow-800",
                          isNext && "text-luigi-green-800",
                          !isCurrent && !isNext && isUnlocked && "text-pipe-900",
                          !isUnlocked && "text-pipe-600"
                        )}>
                          Level {threshold.level}
                        </div>
                        <div className={cn(
                          "text-[11px] font-semibold leading-tight",
                          isUnlocked ? "text-pipe-700" : "text-pipe-500"
                        )}>
                          {threshold.title}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {isUnlocked ? (
                        isCurrent ? (
                          <div className="flex items-center gap-1 text-star-yellow-700 bg-star-yellow-200 px-1.5 py-0.5 rounded">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="text-[10px] font-bold">Current</span>
                          </div>
                        ) : isNext ? (
                          <div className="text-[10px] font-bold text-luigi-green-700 bg-luigi-green-200 px-1.5 py-0.5 rounded">
                            Next
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-luigi-green-700">
                            <Trophy className="h-3 w-3" />
                            <span className="text-[10px] font-bold">Done</span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-1 text-pipe-500">
                          <Lock className="h-3 w-3" />
                          <span className="text-[10px] font-bold">Locked</span>
                        </div>
                      )}
                      <div className="text-[10px] text-pipe-600 mt-0.5 font-mono">
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
        <div className="mt-4 p-4 bg-sky-50 rounded-lg border-2 border-sky-300">
          <h4 className="font-mario text-sm text-pipe-900 mb-3 flex items-center gap-2 border-b-2 border-sky-200 pb-2">
            <Zap className="h-4 w-4 text-coin-yellow-600" />
            How to Earn XP
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-start gap-2 bg-white p-2 rounded border border-sky-200">
              <div className="text-base">💰</div>
              <div>
                <div className="font-bold text-pipe-900">Trading Volume</div>
                <div className="text-pipe-600 text-[11px]">10 XP per $100 traded</div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-white p-2 rounded border border-sky-200">
              <div className="text-base">📈</div>
              <div>
                <div className="font-bold text-pipe-900">Profitable Trades</div>
                <div className="text-pipe-600 text-[11px]">25 XP + 50 XP per $100 profit</div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-white p-2 rounded border border-sky-200">
              <div className="text-base">🏆</div>
              <div>
                <div className="font-bold text-pipe-900">Leaderboard</div>
                <div className="text-pipe-600 text-[11px]">Up to 5,000 XP for #1</div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-white p-2 rounded border border-sky-200">
              <div className="text-base">🎯</div>
              <div>
                <div className="font-bold text-pipe-900">Achievements</div>
                <div className="text-pipe-600 text-[11px]">500-1,000 XP each</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
