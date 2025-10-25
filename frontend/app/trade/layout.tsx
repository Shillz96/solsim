import { Metadata } from "next"
import { marioStyles } from "@/lib/utils"

export const metadata: Metadata = {
  title: marioStyles.generatePageTitle("Trade"),
  description: marioStyles.generatePageDescription("Trade"),
  openGraph: {
    title: marioStyles.generatePageTitle("Trade"),
    description: marioStyles.generatePageDescription("Trade"),
    images: ["/og-image.svg"],
  },
}

export default function TradeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
