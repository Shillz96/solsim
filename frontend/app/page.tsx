import { Metadata } from "next"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { LevelUpSection } from "@/components/landing/level-up-section"
import { RewardsSection } from "@/components/landing/rewards-section"
import { TrendingTokensSection } from "@/components/landing/trending-tokens-section"
import { LeaderboardPreview } from "@/components/landing/leaderboard-preview"
import { CTASection } from "@/components/landing/cta-section"
import { marioStyles } from "@/lib/utils"

export const metadata: Metadata = {
  title: "1UP SOL - Mario-themed Solana Paper Trading",
  description: "1UP your Solana trading skills! Mario-themed paper trading game with real-time prices, FIFO accounting, and earn rewards. Practice trading without risk!",
  openGraph: {
    title: "1UP SOL - Mario-themed Solana Paper Trading",
    description: "1UP your Solana trading skills! Mario-themed paper trading game with real-time prices, FIFO accounting, and earn rewards. Practice trading without risk!",
    url: "https://1upsol.fun",
    siteName: "1UP SOL",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "1UP SOL - Mario-themed Solana Paper Trading",
    description: "1UP your Solana trading skills! Mario-themed paper trading game with real-time prices, FIFO accounting, and earn rewards. Practice trading without risk!",
    creator: "@1upsolfun",
  },
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <LevelUpSection />
        <RewardsSection />
        <TrendingTokensSection />
        <LeaderboardPreview />
        <CTASection />
      </main>
    </div>
  )
}
