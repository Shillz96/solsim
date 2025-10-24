import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/enhanced-skeleton"

export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--sky-50)] via-white to-[var(--sky-100)]">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Skeleton className="h-12 w-64 mb-4 bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-[12px]" />
          <Skeleton className="h-6 w-96 bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-[8px]" />
        </div>

        <div className="mb-6">
          <Skeleton className="h-10 w-64 bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-[12px]" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="p-6 bg-white border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)]">
              <div className="space-y-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-[12px]" />
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 bg-white border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)]">
              <Skeleton className="h-32 w-full bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-[12px]" />
            </div>
            <div className="p-6 bg-white border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)]">
              <Skeleton className="h-48 w-full bg-[var(--sky-200)] border-2 border-[var(--outline-black)] rounded-[12px]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
