/**
 * Warp Pipes Hub Page
 *
 * Token discovery hub showing bonded, graduating, and new tokens
 */

import { Metadata } from "next"
import { WarpPipesHub } from "@/components/warp-pipes/warp-pipes-hub"
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

export default function WarpPipesPage() {
  return (
    <WarpPipesHub />
  )
}
