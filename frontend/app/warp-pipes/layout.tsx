import { Metadata } from "next"
import { marioStyles } from "@/lib/utils"

export const metadata: Metadata = {
  title: marioStyles.generatePageTitle("Warp Pipes Hub"),
  description: marioStyles.generatePageDescription("Warp Pipes Hub"),
  openGraph: {
    title: marioStyles.generatePageTitle("Warp Pipes Hub"),
    description: marioStyles.generatePageDescription("Warp Pipes Hub"),
    images: ["/og-image.svg"],
  },
}

export default function WarpPipesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
