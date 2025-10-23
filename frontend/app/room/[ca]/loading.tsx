import { Loader2 } from 'lucide-react'

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-center space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-[var(--luigi-green)]" />
          <div className="absolute inset-0 h-12 w-12 border-2 border-[var(--star-yellow)]/20 border-b-[var(--star-yellow)] rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <div>
          <h3 className="text-lg font-semibold font-mario">Loading Trade Room</h3>
          <p className="text-sm text-muted-foreground">Preparing your trading interface...</p>
        </div>
      </div>
    </div>
  )
}
