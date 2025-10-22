import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { HowItWorksSection } from "@/components/landing/how-it-works-section"
import { LevelUpSection } from "@/components/landing/level-up-section"
import { TrendingTokensSection } from "@/components/landing/trending-tokens-section"
import { LeaderboardPreview } from "@/components/landing/leaderboard-preview"
import { CTASection } from "@/components/landing/cta-section"
import { Footer } from "@/components/landing/footer"

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
      <Footer />
    </div>
  )
}
