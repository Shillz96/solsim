import { Metadata } from "next"
import { marioStyles } from "@/lib/utils"

export const metadata: Metadata = {
  title: marioStyles.generatePageTitle("Leaderboard"),
  description: marioStyles.generatePageDescription("Leaderboard"),
  openGraph: {
    title: marioStyles.generatePageTitle("Leaderboard"),
    description: marioStyles.generatePageDescription("Leaderboard"),
    images: ["/og-image.svg"],
  },
}

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
