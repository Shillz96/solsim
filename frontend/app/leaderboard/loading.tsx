import Image from "next/image"

export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--sky-50)] via-white to-[var(--sky-100)]">
      <div className="container mx-auto px-4 py-8">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-32 w-full max-w-[750px] bg-[var(--sky-200)] border-4 border-[var(--outline-black)] rounded-xl animate-pulse mb-4"></div>
        </div>

        {/* Time Filter Skeleton */}
        <div className="mb-6">
          <div className="bg-white border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] px-6 py-3">
            <div className="h-10 w-64 bg-[var(--sky-200)] border-3 border-[var(--outline-black)] rounded-[12px] animate-pulse"></div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Leaderboard Table Skeleton */}
          <div className="lg:col-span-2">
            <div className="bg-white border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] p-6">
              {/* Loading spinner */}
              <div className="flex flex-col items-center justify-center h-96">
                <div className="relative mb-4">
                  <div className="h-20 w-20 border-4 border-[var(--mario-red)]/30 border-t-[var(--mario-red)] rounded-full animate-spin"></div>
                  <div className="absolute inset-0 h-20 w-20 flex items-center justify-center">
                    <Image src="/icons/mario/trophy.png" alt="Loading" width={32} height={32} className="animate-pulse" />
                  </div>
                </div>
                <span className="font-bold text-[var(--outline-black)] font-mario text-lg">LOADING LEADERBOARD...</span>
                <p className="text-sm text-[var(--outline-black)] mt-2 font-semibold opacity-70">Finding the top traders!</p>
              </div>
            </div>
          </div>

          {/* Right: Sidebar Skeletons */}
          <div className="space-y-6">
            {/* Rank Card Skeleton */}
            <div className="p-6 bg-[var(--sky-50)] border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)]">
              <div className="h-32 w-full bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-[12px] animate-pulse"></div>
            </div>
            
            {/* Top Performers Skeleton */}
            <div className="p-6 bg-white border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)]">
              <div className="h-48 w-full bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-[12px] animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
