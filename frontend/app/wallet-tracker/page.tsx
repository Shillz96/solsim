"use client"

import { Suspense } from "react"
import { WalletTrackerContent } from "@/components/wallet-tracker/wallet-tracker-content"
import { Loader2 } from "lucide-react"

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 h-16 w-16 border-2 border-green-500/20 border-b-green-500 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Loading Wallet Tracker</h3>
            <p className="text-sm text-muted-foreground">Fetching tracked wallets...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WalletTrackerPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WalletTrackerContent />
    </Suspense>
  )
}