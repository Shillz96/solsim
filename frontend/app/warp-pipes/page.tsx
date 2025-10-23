/**
 * Warp Pipes Hub Page
 *
 * Token discovery hub showing bonded, graduating, and new tokens
 */

import { Metadata } from "next"
import { WarpPipesHub } from "@/components/warp-pipes/warp-pipes-hub"

export const metadata: Metadata = {
  title: "Warp Pipes Hub | 1UP SOL",
  description: "Discover new Solana tokens as they progress from new pairs to about to graduate to bonded. Track token health, liquidity, and migration status in real-time.",
  openGraph: {
    title: "Warp Pipes Hub | 1UP SOL",
    description: "Discover new Solana tokens in real-time. Watch tokens progress from new pairs to bonded curve.",
    images: ["/og-image.svg"],
  },
}

export default function WarpPipesPage() {
  return (
    <WarpPipesHub />
  )
}
