import type { Step, Tour } from "onborda/dist/types"
import { Zap, MessageCircle, TrendingUp, Users, Rocket } from "lucide-react"

/**
 * Onboarding tour steps configuration for 1UP SOL
 *
 * This configuration defines the interactive product tour that guides new users
 * through the 4 key features of the platform:
 * 1. Warp Pipes (Token Discovery)
 * 2. Chats (Community Communication)
 * 3. Trending (Hot Tokens)
 * 4. Rooms (Trading Collaboration)
 *
 * Steps are styled with Mario theme.
 */

export const onboardingTours: Tour[] = [{
  tour: "main-tour",
  steps: [
  // Step 1: Warp Pipes - Token Discovery
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Warp Pipes: Discover New Tokens",
    content: "Jump into the fast lane of token discovery! Warp Pipes shows you newly bonded, graduating, and fresh tokens from pump.fun in real-time. Filter by security scores, liquidity, and watch your favorites.",
    selector: "#warp-pipes-feed", // Target the main warp pipes feed
    side: "top",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    nextRoute: "/pipe-network",
  },

  // Step 2: Chats - Community Communication (Pipe Network)
  {
    icon: <MessageCircle className="h-5 w-5" />,
    title: "Chat: Connect with Traders",
    content: "Join the conversation! Chat with other traders in global rooms or token-specific channels. Share strategies, discuss market moves, and learn from the community in real-time.",
    selector: "#chat-section", // Target the chat interface
    side: "left",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    nextRoute: "/pipe-network",
  },

  // Step 3: Trending - Hot Tokens
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Trending: Hottest Tokens",
    content: "See what's moving! Trending shows you the hottest Solana tokens with real-time market data from DexScreener and Helius. Track price changes, volume spikes, and momentum to catch the next big move.",
    selector: "#trending-section", // Target trending tokens section
    side: "top",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
    nextRoute: "/rooms",
  },

  // Step 4: Rooms - Trading Collaboration
  {
    icon: <Users className="h-5 w-5" />,
    title: "Rooms: Trade Together",
    content: "Power up with trading rooms! Join or create rooms to collaborate with other traders. Share positions, discuss strategies in real-time, and level up your trading game together. Perfect for groups and trading teams!",
    selector: "#rooms-section", // Target rooms section
    side: "top",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
  },

  // Step 5: Final - Ready to Trade
  {
    icon: <Rocket className="h-5 w-5" />,
    title: "You're Ready!",
    content: "That's it! You've seen the core features of 1UP SOL. Now explore Warp Pipes for new gems, chat with traders, track trending tokens, and join rooms. Start trading risk-free with virtual SOL! 🚀",
    selector: "body", // Fallback to body for final step
    side: "top",
    showControls: true,
    pointerPadding: 10,
    pointerRadius: 8,
  },
]}]

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
