import { Metadata } from "next"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { LevelUpSection } from "@/components/landing/level-up-section"
import { TrendingTokensSection } from "@/components/landing/trending-tokens-section"
import { LeaderboardPreview } from "@/components/landing/leaderboard-preview"
import { CTASection } from "@/components/landing/cta-section"
import { marioStyles } from "@/lib/utils"

export const metadata: Metadata = {
  title: marioStyles.generatePageTitle("Home"),
  description: marioStyles.generatePageDescription("Home"),
  openGraph: {
    title: marioStyles.generatePageTitle("Home"),
    description: marioStyles.generatePageDescription("Home"),
    images: ["/og-image.svg"],
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
        <TrendingTokensSection />
        <LeaderboardPreview />
        <CTASection />
      </main>
    </div>
  )
}
