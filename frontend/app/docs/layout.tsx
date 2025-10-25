import { Metadata } from "next"
import { marioStyles } from "@/lib/utils"

export const metadata: Metadata = {
  title: marioStyles.generatePageTitle("Docs"),
  description: marioStyles.generatePageDescription("Docs"),
  openGraph: {
    title: marioStyles.generatePageTitle("Docs"),
    description: marioStyles.generatePageDescription("Docs"),
    images: ["/og-image.svg"],
  },
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
