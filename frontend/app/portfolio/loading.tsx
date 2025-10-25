import Image from "next/image"
import { MarioStatSkeleton, MarioTableRowSkeleton } from "@/components/ui/enhanced-skeleton"

export default function PortfolioLoading() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-10 w-64 bg-[var(--sky-200)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg mb-4 animate-pulse motion-reduce:animate-none" />
          <div className="h-6 w-48 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
        </div>

        {/* Portfolio stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { color: 'var(--coin-yellow)' },
            { color: 'var(--luigi-green)' },
            { color: 'var(--sky-blue)' }
          ].map((stat, i) => (
            <div
              key={i}
              className="bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6"
            >
              <div className="h-5 w-32 bg-[var(--sky-200)] rounded mb-3 animate-pulse motion-reduce:animate-none" />
              <div className="h-8 w-40 bg-[var(--sky-200)] rounded mb-2 animate-pulse motion-reduce:animate-none" />
              <div className="h-4 w-24 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
            </div>
          ))}
        </div>

        {/* Holdings section */}
        <div className="bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 w-48 bg-[var(--coin-yellow)]/30 border-2 border-[var(--outline-black)] rounded animate-pulse motion-reduce:animate-none" />
            <div className="h-10 w-32 bg-[var(--luigi-green)]/30 border-3 border-[var(--outline-black)] rounded-lg animate-pulse motion-reduce:animate-none" />
          </div>

          {/* Holdings table skeleton */}
          <div className="space-y-3">
            {/* Table header */}
            <div className="grid grid-cols-5 gap-4 pb-3 border-b-3 border-[var(--outline-black)]">
              {['Token', 'Amount', 'Value', 'P/L', 'Actions'].map((label, i) => (
                <div key={i} className="h-5 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
              ))}
            </div>

            {/* Table rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-5 gap-4 py-3 border-b-2 border-[var(--sky-200)]">
                <div className="h-6 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                <div className="h-6 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                <div className="h-6 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                <div className="h-6 bg-[var(--luigi-green)]/30 rounded animate-pulse motion-reduce:animate-none" />
                <div className="h-8 w-20 bg-[var(--sky-blue)]/30 border-2 border-[var(--outline-black)] rounded-lg animate-pulse motion-reduce:animate-none" />
              </div>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6">
          <div className="h-8 w-56 bg-[var(--sky-200)] rounded mb-4 animate-pulse motion-reduce:animate-none" />

          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <MarioTableRowSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Loading message with Mario icon */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-[var(--card)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] rounded-full">
            <div className="relative w-8 h-8">
              <div className="w-8 h-8 border-4 border-[var(--mario-red)]/30 border-t-[var(--mario-red)] rounded-full animate-spin motion-reduce:animate-none" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Image src="/icons/mario/coin.png" alt="Loading" width={16} height={16} className="animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
            <span className="text-[var(--pipe-900)] font-bold font-mario">LOADING PORTFOLIO...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

