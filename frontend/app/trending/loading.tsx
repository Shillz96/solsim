import Image from "next/image"

export default function TrendingLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-page-xl mx-auto">
        {/* Header Skeleton */}
        <div className="mb-4">
          <div className="bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-xl p-6">
            <div className="mb-6 flex justify-center">
              <div className="h-24 w-full max-w-[600px] bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-lg animate-pulse"></div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Filter buttons skeleton */}
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-9 w-24 bg-[var(--sky-200)] border-3 border-[var(--outline-black)] rounded-lg animate-pulse"></div>
                ))}
              </div>
              
              {/* Search skeleton */}
              <div className="h-10 w-full md:w-64 bg-[var(--sky-200)] border-3 border-[var(--outline-black)] rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Table Skeleton - Mario Theme */}
        <div className="bg-white border-4 border-[var(--pipe-700)] shadow-[6px_6px_0_var(--outline-black)] rounded-xl overflow-hidden">
          {/* Loading spinner */}
          <div className="flex flex-col items-center justify-center h-64 bg-[var(--sky-50)]">
            <div className="relative mb-4">
              <div className="h-16 w-16 border-4 border-[var(--mario-red)]/30 border-t-[var(--mario-red)] rounded-full animate-spin"></div>
              <div className="absolute inset-0 h-16 w-16 flex items-center justify-center">
                <Image src="/icons/mario/star.png" alt="Loading" width={24} height={24} className="animate-pulse" />
              </div>
            </div>
            <span className="font-bold text-[var(--pipe-900)] font-mario">LOADING TRENDING TOKENS...</span>
            <p className="text-sm text-[var(--pipe-700)] mt-2 font-semibold">Collecting the hottest coins!</p>
          </div>
        </div>
      </main>
    </div>
  )
}
