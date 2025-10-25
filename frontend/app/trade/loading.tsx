import Image from "next/image"
import { MarioCardSkeleton, MarioChartSkeleton, MarioTableRowSkeleton } from "@/components/ui/enhanced-skeleton"

export default function TradeLoading() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <div className="h-10 w-48 bg-[var(--sky-200)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg animate-pulse motion-reduce:animate-none" />
          <div className="h-10 w-32 bg-[var(--luigi-green)]/20 border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg animate-pulse motion-reduce:animate-none" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Token search and info - Left side */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search box skeleton */}
            <div className="bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-4">
              <div className="h-6 w-32 bg-[var(--sky-200)] rounded mb-3 animate-pulse motion-reduce:animate-none" />
              <div className="h-12 bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-lg animate-pulse motion-reduce:animate-none" />
            </div>

            {/* Token info skeleton */}
            <MarioCardSkeleton rows={6} />
          </div>

          {/* Trading panel - Center */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6 space-y-4">
              {/* Title */}
              <div className="h-8 w-48 bg-[var(--coin-yellow)]/30 border-2 border-[var(--outline-black)] rounded mx-auto animate-pulse motion-reduce:animate-none" />

              {/* Trade type toggle */}
              <div className="flex gap-2">
                <div className="h-12 flex-1 bg-[var(--luigi-green)]/20 border-3 border-[var(--outline-black)] rounded-lg animate-pulse motion-reduce:animate-none" />
                <div className="h-12 flex-1 bg-[var(--mario-red)]/20 border-3 border-[var(--outline-black)] rounded-lg animate-pulse motion-reduce:animate-none" />
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <div className="h-5 w-24 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                <div className="h-16 bg-[var(--sky-200)] border-3 border-[var(--outline-black)] rounded-lg animate-pulse motion-reduce:animate-none" />
              </div>

              {/* Quick amount buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-[var(--sky-blue)]/30 border-2 border-[var(--outline-black)] rounded-lg animate-pulse motion-reduce:animate-none" />
                ))}
              </div>

              {/* Trade button */}
              <div className="h-14 bg-[var(--luigi-green)]/30 border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-lg animate-pulse motion-reduce:animate-none" />

              {/* Stats */}
              <div className="space-y-2 pt-4 border-t-3 border-[var(--outline-black)]">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-28 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                    <div className="h-4 w-24 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart and history - Right side */}
          <div className="lg:col-span-1 space-y-4">
            {/* Chart skeleton */}
            <MarioChartSkeleton />

            {/* Recent trades skeleton */}
            <div className="bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-4">
              <div className="h-6 w-40 bg-[var(--sky-200)] rounded mb-3 animate-pulse motion-reduce:animate-none" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <MarioTableRowSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading message with Mario spinner */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-full">
            <div className="relative w-8 h-8">
              <div className="w-8 h-8 border-4 border-[var(--mario-red)]/30 border-t-[var(--mario-red)] rounded-full animate-spin motion-reduce:animate-none" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Image src="/icons/mario/star.png" alt="Loading" width={16} height={16} className="animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
            <span className="text-[var(--pipe-900)] font-bold font-mario">LOADING TRADING PORTAL...</span>
          </div>
        </div>

      </div>
    </div>
  );
}
