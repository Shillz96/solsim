import { Metadata } from "next"
import { marioStyles } from "@/lib/utils"

export const metadata: Metadata = {
  title: marioStyles.generatePageTitle("Trade Room"),
  description: marioStyles.generatePageDescription("Trade Room"),
  openGraph: {
    title: marioStyles.generatePageTitle("Trade Room"),
    description: marioStyles.generatePageDescription("Trade Room"),
    images: ["/og-image.svg"],
  },
}

export default function RoomLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
