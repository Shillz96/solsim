import { Metadata } from "next"
import { LaunchTokenForm } from "@/components/launch/launch-token-form"
import { LaunchTokenCard } from "@/components/launch/launch-token-card"

export const metadata: Metadata = {
  title: "Launch Token | 1UP SOL",
  description: "Create your own Solana token on Pump.fun with 1UP SOL. Launch tokens on the bonding curve and start trading immediately.",
  openGraph: {
    title: "Launch Token | 1UP SOL",
    description: "Create your own Solana token on Pump.fun with 1UP SOL. Launch tokens on the bonding curve and start trading immediately.",
    images: ["/og-image.svg"],
  },
}

export default function LaunchPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="font-mario text-3xl md:text-4xl text-[var(--outline-black)] font-black mb-2">
            Launch Token
          </h1>
          <p className="text-lg text-[var(--outline-black)]/80 font-semibold">
            Create your own Solana token on Pump.fun
          </p>
        </div>

        {/* Info Card */}
        <LaunchTokenCard />

        {/* Launch Form */}
        <LaunchTokenForm />
      </div>
    </div>
  )
}
