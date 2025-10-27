"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, TrendingUp, ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import * as api from "@/lib/api"
import { MarioPageHeader } from "@/components/shared/mario-page-header"

export function LeaderboardPreview() {
  // Fetch real leaderboard data from backend
  const { data: leaderboardData, isLoading } = useQuery({
    queryKey: ['leaderboard-preview'],
    queryFn: () => api.getLeaderboard(5), // Get top 5 traders
    refetchInterval: 60000, // Refresh every minute,
  })

  // Fallback to placeholder data if API fails or no data
  const TOP_TRADERS = leaderboardData?.length
    ? leaderboardData.map((entry, index) => ({
        rank: index + 1,
        username: entry.handle || `Trader ${entry.userId.slice(0, 8)}`,
        roi: parseFloat(entry.totalPnlUsd) || 0,
        trades: entry.totalTrades,
        balance: parseFloat(entry.totalVolumeUsd) || 0,
        isRising: entry.winRate > 50,
      }))
    : [
        { rank: 1, username: "SolanaWhale", roi: 287.5, trades: 156, balance: 387.5, isRising: true },
        { rank: 2, username: "CryptoNinja", roi: 245.2, trades: 203, balance: 345.2, isRising: true },
        { rank: 3, username: "MoonTrader", roi: 198.7, trades: 89, balance: 298.7, isRising: false },
        { rank: 4, username: "DiamondHands", roi: 176.3, trades: 134, balance: 276.3, isRising: true },
        { rank: 5, username: "PumpMaster", roi: 152.8, trades: 178, balance: 252.8, isRising: false },
      ]
  return (
    <section className="py-20 md:py-32 bg-gradient-to-br from-[var(--background)] via-[var(--background)] to-white border-t-4 border-b-4 border-outline/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
        <motion.div
          className="absolute top-10 left-10 text-8xl"
          animate={{ y: [0, -20, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          🏆
        </motion.div>
        <motion.div
          className="absolute bottom-20 right-20 text-7xl"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 10, repeat: Infinity }}
        >
          ⭐
        </motion.div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          className="text-center space-y-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          {/* Mario header */}
          <div className="mb-6 max-w-3xl mx-auto">
            <MarioPageHeader
              src="/leaderboard-header.png"
              alt="Leaderboard"
              width={750}
              height={150}
            />
          </div>

          <h2 className="font-mario text-4xl md:text-5xl font-bold text-balance" style={{ color: 'var(--outline-black)' }}>
            Top Traders Hall of Fame! 🏆
          </h2>
          <p className="text-xl max-w-2xl mx-auto leading-relaxed font-bold" style={{ color: 'var(--outline-black)' }}>
            Compete with traders worldwide. Climb the ranks and prove your trading skills!
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <div className="mario-card max-w-4xl mx-auto bg-card border-4 border-star overflow-hidden shadow-[6px_6px_0_var(--outline-black)]">
            {isLoading ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                <p className="mt-4 text-muted-foreground">Loading top traders...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-card">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-mario text-outline border-b-4 border-outline">Rank</th>
                      <th className="px-6 py-4 text-left text-sm font-mario text-outline border-b-4 border-outline">Trader</th>
                      <th className="px-6 py-4 text-right text-sm font-mario text-outline border-b-4 border-outline">PnL (USD)</th>
                      <th className="px-6 py-4 text-right text-sm font-mario text-outline border-b-4 border-outline">Trades</th>
                      <th className="px-6 py-4 text-right text-sm font-mario text-outline border-b-4 border-outline">Volume (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {TOP_TRADERS.map((trader) => (
                      <motion.tr
                        key={trader.rank}
                        className="hover:bg-muted transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: trader.rank * 0.05 }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {trader.rank === 1 && <img src="/icons/mario/1st.png" alt="1st place" className="h-6 w-6 drop-shadow-[3px_3px_0_var(--outline-black)]" />}
                            {trader.rank === 2 && <img src="/icons/mario/2nd-place.png" alt="2nd place" className="h-6 w-6 drop-shadow-[3px_3px_0_var(--outline-black)]" />}
                            {trader.rank === 3 && <img src="/icons/mario/3rd.png" alt="3rd place" className="h-6 w-6 drop-shadow-[3px_3px_0_var(--outline-black)]" />}
                            <span className={`text-lg font-bold ${trader.rank <= 3 ? 'text-mario-red' : 'font-medium'}`}>#{trader.rank}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`${trader.rank <= 3 ? 'font-bold' : 'font-medium'}`}>{trader.username}</span>
                            {trader.isRising && <TrendingUp className="h-4 w-4" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-mono ${trader.rank <= 3 ? 'font-bold' : 'font-medium'} ${trader.roi >= 0 ? 'text-[var(--luigi-green)]' : 'text-[var(--mario-red)]'}`}>
                            {trader.roi >= 0 ? '+' : ''}{trader.roi.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-muted-foreground font-mono">{trader.trades}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-mono ${trader.rank <= 3 ? 'font-bold' : 'font-medium'}`}>${trader.balance.toFixed(2)}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <Link href="/leaderboard">
            <button className="mario-btn mario-btn-lg bg-card text-mario hover:bg-card/90 border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-1 group">
              <span className="flex items-center justify-center gap-2">
                View Full Leaderboard 🏆
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
