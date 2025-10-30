import Image from "next/image"
import { MarioStatSkeleton } from "@/components/ui/enhanced-skeleton"

export default function RewardsLoading() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6 text-center">
          <div className="h-12 w-80 bg-star/30 border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-lg mx-auto mb-4 animate-pulse motion-reduce:animate-none" />
          <div className="h-6 w-64 bg-[var(--sky-200)] rounded mx-auto animate-pulse motion-reduce:animate-none" />
        </div>

        {/* Daily reward claim card skeleton */}
        <div className="bg-card border-4 border-outline shadow-[6px_6px_0_var(--outline-black)] rounded-xl p-8 mb-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-coin/30 rounded-full animate-pulse motion-reduce:animate-none" />
            <div className="h-8 w-56 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
            <div className="h-6 w-40 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
            <div className="h-14 w-48 bg-luigi/30 border-4 border-outline rounded-lg animate-pulse motion-reduce:animate-none" />
          </div>
        </div>

        {/* Rewards sections grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Active missions skeleton */}
          <div className="bg-card border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6">
            <div className="h-8 w-48 bg-sky/30 border-2 border-outline rounded mb-4 animate-pulse motion-reduce:animate-none" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-[var(--sky-100)] border-2 border-outline rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-6 w-40 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                    <div className="h-8 w-20 bg-coin/30 rounded-full animate-pulse motion-reduce:animate-none" />
                  </div>
                  <div className="h-4 w-full bg-[var(--sky-200)] rounded mb-2 animate-pulse motion-reduce:animate-none" />
                  <div className="h-3 w-32 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                </div>
              ))}
            </div>
          </div>

          {/* Achievements skeleton */}
          <div className="bg-card border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6">
            <div className="h-8 w-48 bg-[var(--sky-200)] rounded mb-4 animate-pulse motion-reduce:animate-none" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 p-3 bg-[var(--sky-100)] border-2 border-outline rounded-lg"
                >
                  <div className="w-16 h-16 bg-star/30 rounded-full animate-pulse motion-reduce:animate-none" />
                  <div className="h-3 w-16 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard rewards skeleton */}
        <div className="bg-card border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6 mb-6">
          <div className="h-8 w-56 bg-coin/30 border-2 border-outline rounded mb-4 animate-pulse motion-reduce:animate-none" />

          {/* Top rewards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[
              { color: 'var(--star-yellow)' },
              { color: 'var(--sky-blue)' },
              { color: 'var(--brick-brown)' }
            ].map((reward, i) => (
              <div
                key={i}
                className="bg-[var(--sky-100)] border-3 border-outline rounded-lg p-6 text-center"
              >
                <div className="h-10 w-10 bg-[var(--sky-200)] rounded-full mx-auto mb-3 animate-pulse motion-reduce:animate-none" />
                <div className="h-6 w-32 bg-[var(--sky-200)] rounded mx-auto mb-2 animate-pulse motion-reduce:animate-none" />
                <div className="h-8 w-40 bg-luigi/30 rounded mx-auto animate-pulse motion-reduce:animate-none" />
              </div>
            ))}
          </div>

          {/* Other ranks skeleton */}
          <div className="space-y-2">
            {[4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-[var(--sky-100)] border-2 border-outline rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="h-6 w-12 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                  <div className="h-5 w-32 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                </div>
                <div className="h-6 w-24 bg-luigi/30 rounded animate-pulse motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Rewards history skeleton */}
        <div className="bg-card border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6">
          <div className="h-8 w-48 bg-[var(--sky-200)] rounded mb-4 animate-pulse motion-reduce:animate-none" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-[var(--sky-100)] border-2 border-outline rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-coin/30 rounded-full animate-pulse motion-reduce:animate-none" />
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                    <div className="h-4 w-32 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-coin/30 rounded animate-pulse motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Loading message with coin icon */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-card border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-full">
            <div className="relative w-8 h-8">
              <div className="w-8 h-8 border-4 border-mario/30 border-t-[var(--mario-red)] rounded-full animate-spin motion-reduce:animate-none" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Image src="/icons/mario/star.png" alt="Loading" width={16} height={16} className="animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
            <span className="text-[var(--pipe-900)] font-bold font-mario">LOADING REWARDS...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

