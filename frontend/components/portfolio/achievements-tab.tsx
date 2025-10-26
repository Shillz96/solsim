"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { Trophy, Star, Zap, Target, Award, Crown } from "lucide-react"

/**
 * Achievements Tab - Progress & Recognition
 * Shows user achievements, badges, and leaderboard position
 */
export function AchievementsTab() {
  // Mock achievements - replace with real data later
  const achievements = [
    {
      id: 1,
      title: "First Trade!",
      description: "Started your journey",
      icon: "/icons/mario/trophy.png",
      unlocked: true,
      color: "star-yellow"
    },
    {
      id: 2,
      title: "Hot Streak",
      description: "Win 5 trades in a row",
      icon: "/icons/mario/fire.png",
      unlocked: false,
      color: "mario-red"
    },
    {
      id: 3,
      title: "Coin Collector",
      description: "Earn 1000 SOL profit",
      icon: "/icons/mario/money-bag.png",
      unlocked: false,
      color: "star-yellow"
    },
    {
      id: 4,
      title: "Speed Demon",
      description: "Complete 10 trades in one day",
      icon: "/icons/mario/star.png",
      unlocked: false,
      color: "luigi-green"
    },
    {
      id: 5,
      title: "Diamond Hands",
      description: "Hold a position for 7 days",
      icon: "/icons/mario/mushroom.png",
      unlocked: false,
      color: "mario-red"
    },
    {
      id: 6,
      title: "Risk Taker",
      description: "Make a trade over 100 SOL",
      icon: "/icons/mario/fire.png",
      unlocked: false,
      color: "mario-red"
    }
  ]

  const unlockedCount = achievements.filter(a => a.unlocked).length
  const totalCount = achievements.length

  return (
    <div className="space-y-6">
      {/* Achievement Progress Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-star/20 border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Image src="/icons/mario/trophy.png" alt="Trophy" width={48} height={48} className="animate-pulse" />
            <div>
              <h2 className="text-2xl font-mario font-bold text-outline">ACHIEVEMENTS</h2>
              <p className="text-sm text-muted-foreground font-bold mt-1">
                Unlock badges by completing challenges!
              </p>
            </div>
          </div>
          <div className="bg-star border-3 border-outline rounded-lg px-6 py-3 shadow-[3px_3px_0_var(--outline-black)]">
            <div className="text-center">
              <div className="text-3xl font-mario font-bold text-outline">
                {unlockedCount}/{totalCount}
              </div>
              <div className="text-xs font-bold text-outline mt-1">UNLOCKED</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-gray-200 border-3 border-outline rounded-full h-6 overflow-hidden">
          <motion.div
            className="bg-gradient-to-r from-[var(--star-yellow)] to-[var(--star-yellow)]/80 h-full flex items-center justify-center"
            initial={{ width: 0 }}
            animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            transition={{ duration: 1 }}
          >
            <span className="text-xs font-mario font-bold text-outline">
              {Math.round((unlockedCount / totalCount) * 100)}%
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={`
              ${achievement.unlocked 
                ? `bg-[var(--${achievement.color})]/20 border-[var(--${achievement.color})]` 
                : 'bg-gray-100 border-gray-400 opacity-60'}
              border-4 shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6 relative
            `}
          >
            {/* Unlocked Badge */}
            {achievement.unlocked && (
              <div className="absolute -top-2 -right-2 bg-luigi border-3 border-outline rounded-full p-2 shadow-[2px_2px_0_var(--outline-black)]">
                <Star className="h-4 w-4 text-white fill-white" />
              </div>
            )}

            {/* Achievement Icon */}
            <div className="flex items-center gap-4 mb-3">
              <div className={`
                ${achievement.unlocked ? 'animate-pulse' : ''}
              `}>
                <Image 
                  src={achievement.icon} 
                  alt={achievement.title} 
                  width={48} 
                  height={48}
                />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-mario font-bold text-outline">
                  {achievement.title}
                </h3>
                <p className="text-xs text-muted-foreground font-bold mt-1">
                  {achievement.description}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-outline">
              <span className="text-xs font-bold text-muted-foreground">
                {achievement.unlocked ? 'UNLOCKED!' : 'LOCKED'}
              </span>
              {achievement.unlocked && (
                <div className="text-xs font-mario font-bold text-luigi">
                  +50 XP
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Leaderboard Position */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-[var(--mario-red)]/20 to-[var(--star-yellow)]/20 border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Image src="/icons/mario/star.png" alt="Leaderboard" width={32} height={32} className="animate-pulse" />
          <h3 className="text-xl font-mario font-bold text-outline">LEADERBOARD RANK</h3>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card/50 border-3 border-outline rounded-lg p-4 text-center">
            <Image src="/icons/mario/trophy.png" alt="Global" width={32} height={32} className="mx-auto mb-2" />
            <div className="text-2xl font-mario font-bold text-outline">#127</div>
            <div className="text-xs text-muted-foreground font-bold mt-1">Global</div>
          </div>
          
          <div className="bg-card/50 border-3 border-outline rounded-lg p-4 text-center">
            <Image src="/icons/mario/fire.png" alt="Weekly" width={32} height={32} className="mx-auto mb-2" />
            <div className="text-2xl font-mario font-bold text-outline">#45</div>
            <div className="text-xs text-muted-foreground font-bold mt-1">This Week</div>
          </div>
          
          <div className="bg-card/50 border-3 border-outline rounded-lg p-4 text-center">
            <Image src="/icons/mario/star.png" alt="Daily" width={32} height={32} className="mx-auto mb-2" />
            <div className="text-2xl font-mario font-bold text-outline">#23</div>
            <div className="text-xs text-muted-foreground font-bold mt-1">Today</div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
