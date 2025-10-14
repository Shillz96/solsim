"use client"

import { Suspense } from "react"
import { WalletTrackerContent } from "@/components/wallet-tracker/wallet-tracker-content"
import { Loader2 } from "lucide-react"

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">Loading wallet tracker...</p>
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