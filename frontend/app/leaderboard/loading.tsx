import Image from "next/image"

export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6 text-center">
          <div className="h-12 w-80 bg-star/30 border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-lg mx-auto mb-4 animate-pulse motion-reduce:animate-none" />
          <div className="h-6 w-64 bg-[var(--sky-200)] rounded mx-auto animate-pulse motion-reduce:animate-none" />
        </div>

        {/* Filter tabs skeleton */}
        <div className="flex gap-2 mb-6 justify-center">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-32 bg-sky/30 border-3 border-outline rounded-lg animate-pulse motion-reduce:animate-none"
            />
          ))}
        </div>

        {/* Top 3 podium skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* 2nd place - Silver */}
          <div className="md:order-1 md:mt-8">
            <div className="bg-card border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="w-20 h-20 bg-[var(--sky-200)] rounded-full animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="h-8 w-8 bg-[var(--sky-200)] rounded-full mx-auto mb-3 animate-pulse motion-reduce:animate-none" />
              <div className="h-6 w-32 bg-[var(--sky-200)] rounded mx-auto mb-2 animate-pulse motion-reduce:animate-none" />
              <div className="h-8 w-40 bg-[var(--sky-200)] rounded mx-auto animate-pulse motion-reduce:animate-none" />
            </div>
          </div>

          {/* 1st place - Gold */}
          <div className="md:order-2">
            <div className="bg-star/10 border-4 border-outline shadow-[6px_6px_0_var(--outline-black)] rounded-xl p-8 text-center">
              <div className="mb-4 flex justify-center">
                <div className="w-24 h-24 bg-star/30 rounded-full animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="h-10 w-10 bg-star/40 rounded-full mx-auto mb-3 animate-pulse motion-reduce:animate-none" />
              <div className="h-7 w-40 bg-star/30 rounded mx-auto mb-2 animate-pulse motion-reduce:animate-none" />
              <div className="h-10 w-48 bg-star/30 rounded mx-auto animate-pulse motion-reduce:animate-none" />
            </div>
          </div>


          {/* 3rd place - Bronze */}
          <div className="md:order-3 md:mt-8">
            <div className="bg-card border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6 text-center">
              <div className="mb-4 flex justify-center">
                <div className="w-20 h-20 bg-brick/30 rounded-full animate-pulse motion-reduce:animate-none" />
              </div>
              <div className="h-8 w-8 bg-brick/40 rounded-full mx-auto mb-3 animate-pulse motion-reduce:animate-none" />
              <div className="h-6 w-32 bg-[var(--sky-200)] rounded mx-auto mb-2 animate-pulse motion-reduce:animate-none" />
              <div className="h-8 w-40 bg-[var(--sky-200)] rounded mx-auto animate-pulse motion-reduce:animate-none" />
            </div>
          </div>
        </div>

        {/* Leaderboard table skeleton */}
        <div className="bg-card border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-xl p-6">
          <div className="h-8 w-48 bg-[var(--sky-200)] rounded mb-4 animate-pulse motion-reduce:animate-none" />

          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 pb-3 mb-3 border-b-3 border-outline">
            {['Rank', 'Player', 'Level', 'Profit', 'Trades'].map((label, i) => (
              <div key={i} className="h-5 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
            ))}
          </div>

          {/* Table rows */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-4 py-3 px-4 bg-[var(--sky-100)] border-2 border-outline rounded-lg"
              >
                <div className="h-6 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                <div className="h-6 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                <div className="h-6 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
                <div className="h-6 bg-luigi/30 rounded animate-pulse motion-reduce:animate-none" />
                <div className="h-6 bg-[var(--sky-200)] rounded animate-pulse motion-reduce:animate-none" />
              </div>
            ))}
          </div>

          {/* Pagination skeleton */}
          <div className="flex justify-center items-center gap-2 mt-6">
            <div className="h-10 w-10 bg-[var(--sky-200)] border-2 border-outline rounded-lg animate-pulse motion-reduce:animate-none" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-10 bg-[var(--sky-200)] border-2 border-outline rounded-lg animate-pulse motion-reduce:animate-none" />
            ))}
            <div className="h-10 w-10 bg-[var(--sky-200)] border-2 border-outline rounded-lg animate-pulse motion-reduce:animate-none" />
          </div>
        </div>

        {/* Loading message with trophy icon */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-card border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] rounded-full">
            <div className="relative w-8 h-8">
              <div className="w-8 h-8 border-4 border-mario/30 border-t-[var(--mario-red)] rounded-full animate-spin motion-reduce:animate-none" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Image src="/icons/mario/star.png" alt="Loading" width={16} height={16} className="animate-pulse motion-reduce:animate-none" />
              </div>
            </div>
            <span className="text-[var(--pipe-900)] font-bold font-mario">LOADING LEADERBOARD...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

