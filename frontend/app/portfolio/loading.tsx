import Image from "next/image"

export default function PortfolioLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="container mx-auto px-4 py-6 max-w-page-xl">
        {/* Header Skeleton - Mario Theme */}
        <div className="mb-8">
          <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="bg-[var(--mario-red)] p-3 rounded-lg border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
                  <Image src="/icons/mario/money-bag.png" alt="Portfolio" width={32} height={32} />
                </div>
                <div className="space-y-2">
                  <div className="h-8 w-48 bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-lg animate-pulse"></div>
                  <div className="h-4 w-64 bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-lg animate-pulse"></div>
                </div>
              </div>
              
              {/* Level Badge Skeleton */}
              <div className="bg-[var(--star-yellow)] border-4 border-[var(--outline-black)] rounded-lg px-4 py-3 shadow-[4px_4px_0_var(--outline-black)]">
                <div className="h-12 w-16 bg-[var(--coin-gold)] border-2 border-[var(--outline-black)] rounded animate-pulse"></div>
              </div>
            </div>
            
            {/* XP Bar Skeleton */}
            <div className="h-6 bg-gray-200 border-3 border-[var(--outline-black)] rounded-full animate-pulse"></div>
          </div>
        </div>

        {/* Portfolio Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[var(--sky-200)] border-3 border-[var(--outline-black)] rounded-lg animate-pulse" />
                <div className="h-6 w-20 bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-lg animate-pulse"></div>
              </div>
              <div className="h-4 w-24 bg-[var(--sky-200)] rounded mb-2 animate-pulse" />
              <div className="h-8 w-32 bg-[var(--sky-200)] rounded mb-2 animate-pulse" />
              <div className="h-3 w-28 bg-[var(--sky-200)] rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[3fr_1fr] gap-6">
          {/* Left Column - Main Content */}
          <div className="space-y-6">
            {/* PnL Card Skeleton */}
            <div className="bg-white border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
              <div className="flex flex-col items-center justify-center h-48">
                <div className="relative mb-4">
                  <div className="h-16 w-16 border-4 border-[var(--luigi-green)]/30 border-t-[var(--luigi-green)] rounded-full animate-spin"></div>
                  <div className="absolute inset-0 h-16 w-16 flex items-center justify-center">
                    <Image src="/icons/mario/money-bag.png" alt="Loading" width={24} height={24} className="animate-pulse" />
                  </div>
                </div>
                <span className="font-bold text-[var(--outline-black)] font-mario">LOADING PORTFOLIO...</span>
                <p className="text-sm text-muted-foreground font-semibold mt-2">Counting your coins!</p>
              </div>
            </div>

            {/* Positions Table Skeleton */}
            <div className="bg-white border-4 border-[var(--pipe-700)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar Skeleton */}
          <aside className="space-y-6">
            <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
              <div className="h-32 bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-lg animate-pulse" />
            </div>
            <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6">
              <div className="h-48 bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-lg animate-pulse" />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
