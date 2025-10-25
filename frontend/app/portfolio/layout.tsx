import { Metadata } from "next"
import { marioStyles } from "@/lib/utils"

export const metadata: Metadata = {
  title: marioStyles.generatePageTitle("Portfolio"),
  description: marioStyles.generatePageDescription("Portfolio"),
  openGraph: {
    title: marioStyles.generatePageTitle("Portfolio"),
    description: marioStyles.generatePageDescription("Portfolio"),
    images: ["/og-image.svg"],
  },
}

export default function PortfolioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
