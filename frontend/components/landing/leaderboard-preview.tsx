"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, TrendingUp, ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

const TOP_TRADERS = [
  { rank: 1, username: "SolanaWhale", roi: 287.5, trades: 156, balance: 387.5, isRising: true },
  { rank: 2, username: "CryptoNinja", roi: 245.2, trades: 203, balance: 345.2, isRising: true },
  { rank: 3, username: "MoonTrader", roi: 198.7, trades: 89, balance: 298.7, isRising: false },
  { rank: 4, username: "DiamondHands", roi: 176.3, trades: 134, balance: 276.3, isRising: true },
  { rank: 5, username: "PumpMaster", roi: 152.8, trades: 178, balance: 252.8, isRising: false },
]

export function LeaderboardPreview() {
  return (
    <section className="py-20 md:py-32 bg-foreground text-background border-t border-background/20">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center space-y-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-balance">
            Top Traders
          </h2>
          <p className="text-xl text-background/70 max-w-2xl mx-auto leading-relaxed">
            Compete with traders worldwide. Climb the ranks and prove your skills.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Card className="max-w-4xl mx-auto bg-background border-2 border-background overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-foreground">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-background">Rank</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-background">Trader</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-background">ROI</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-background">Trades</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-background">Balance</th>
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
                          {trader.rank === 1 && <Trophy className="h-5 w-5 text-foreground" strokeWidth={2.5} />}
                          {trader.rank === 2 && <Trophy className="h-5 w-5 text-foreground" strokeWidth={2} />}
                          {trader.rank === 3 && <Trophy className="h-5 w-5 text-foreground" strokeWidth={1.5} />}
                          <span className={`text-lg ${trader.rank <= 3 ? 'font-bold' : 'font-medium'}`}>#{trader.rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`${trader.rank <= 3 ? 'font-bold' : 'font-medium'}`}>{trader.username}</span>
                          {trader.isRising && <TrendingUp className="h-4 w-4" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono ${trader.rank <= 3 ? 'font-bold' : 'font-medium'} text-[#00ff85]`}>+{trader.roi.toFixed(1)}%</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-muted-foreground font-mono">{trader.trades}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-mono ${trader.rank <= 3 ? 'font-bold' : 'font-medium'}`}>{trader.balance.toFixed(2)} SOL</span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>

        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <Link href="/leaderboard">
            <Button size="lg" variant="outline" className="group border-2 border-background text-background hover:bg-background hover:text-foreground">
              View Full Leaderboard
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
