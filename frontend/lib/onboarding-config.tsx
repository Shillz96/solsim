import type { Step } from "onborda"
import { Coins, TrendingUp, Trophy, Star, Rocket, Users, Target, Zap } from "lucide-react"

/**
 * Onboarding tour steps configuration for 1UP SOL
 *
 * This configuration defines the interactive product tour that guides new users
 * through the key features of the platform. Steps are styled with Mario theme.
 */

export const onboardingSteps: Step[] = [
  // Step 1: Virtual SOL Balance
  {
    icon: <Coins className="h-5 w-5" />,
    title: "Your Virtual SOL Balance",
    content: "Start with virtual SOL to practice trading risk-free! Buy and sell Solana tokens without spending real money. Your starting balance depends on your tier.",
    selector: "#virtual-balance", // Target element in navbar or balance display
    side: "bottom",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    nextRoute: "/trade",
    showSkip: true,
  },

  // Step 2: Trade Page
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Make Your First Trade",
    content: "Search for any Solana token, check real-time prices, and execute instant paper trades. Choose Buy or Sell, enter your amount, and confirm!",
    selector: "#trade-panel", // Target the main trade panel
    side: "left",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    nextRoute: "/portfolio",
    showSkip: true,
  },

  // Step 3: Portfolio & PnL
  {
    icon: <Target className="h-5 w-5" />,
    title: "Track Your Positions",
    content: "View all your holdings with live P&L tracking. See unrealized gains/losses on open positions and realized profits from closed trades. FIFO accounting ensures accurate cost basis.",
    selector: "#portfolio-table", // Target portfolio positions table
    side: "top",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    nextRoute: "/rewards",
    showSkip: true,
  },

  // Step 4: XP & Gamification
  {
    icon: <Star className="h-5 w-5" />,
    title: "Earn XP & Level Up!",
    content: "Every trade earns you XP points! Level up to unlock higher tier rewards, bigger virtual balances, and bragging rights. Complete challenges for bonus XP!",
    selector: "#xp-display", // Target XP counter in navbar or rewards page
    side: "bottom",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    nextRoute: "/leaderboard",
    showSkip: true,
  },

  // Step 5: Leaderboard
  {
    icon: <Trophy className="h-5 w-5" />,
    title: "Compete on the Leaderboard",
    content: "See how you rank against other traders! Compete by total P&L, win rate, or portfolio value. Top traders earn special badges and recognition.",
    selector: "#leaderboard-table", // Target leaderboard table
    side: "top",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    nextRoute: "/trending",
    showSkip: true,
  },

  // Step 6: Trending Tokens
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Discover Trending Tokens",
    content: "Explore the hottest Solana tokens with real-time market data from DexScreener and Helius. See price changes, volume, and momentum indicators.",
    selector: "#trending-section", // Target trending tokens section
    side: "top",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    nextRoute: "/wallet-tracker",
    showSkip: true,
  },

  // Step 7: KOL Wallet Tracker (Advanced)
  {
    icon: <Users className="h-5 w-5" />,
    title: "Follow Top Traders",
    content: "Track what elite traders (KOLs) are buying and selling! Copy their strategies and learn from the best. Get notifications when they make moves.",
    selector: "#wallet-tracker", // Target wallet tracker section
    side: "top",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    showSkip: true,
  },

  // Step 8: Final - Platform Purpose
  {
    icon: <Rocket className="h-5 w-5" />,
    title: "You're Ready to Trade!",
    content: "1UP SOL is your risk-free training ground for Solana trading. Practice strategies, learn market dynamics, and build confidence—all without risking real money. Let's go! 🚀",
    selector: "#trade-now-cta", // Target a CTA button or fallback to body
    side: "top",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    showSkip: false, // Last step, no skip needed
  },
]

/**
 * Onboarding card styling configuration
 * Applies Mario theme to tour tooltips: bold borders, 3D shadows, Luigi Green accents
 */
export const onboardingCardStyles = {
  card: {
    backgroundColor: "white",
    border: "4px solid var(--outline-black)",
    borderRadius: "12px",
    boxShadow: "6px 6px 0 var(--outline-black)",
    padding: "1.5rem",
    maxWidth: "400px",
  },
  title: {
    fontFamily: "var(--font-ibm-plex-sans)",
    fontSize: "1.125rem",
    fontWeight: "700",
    color: "var(--outline-black)",
    marginBottom: "0.5rem",
  },
  content: {
    fontSize: "0.875rem",
    lineHeight: "1.5",
    color: "var(--pipe-600)",
    marginBottom: "1rem",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "var(--luigi-green)",
    color: "white",
    border: "3px solid var(--outline-black)",
    borderRadius: "8px",
    padding: "0.5rem 1rem",
    fontFamily: "var(--font-ibm-plex-sans)",
    fontWeight: "700",
    boxShadow: "3px 3px 0 var(--outline-black)",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  skipButton: {
    color: "var(--pipe-500)",
    fontSize: "0.875rem",
    fontWeight: "600",
    textDecoration: "underline",
    cursor: "pointer",
  },
}
