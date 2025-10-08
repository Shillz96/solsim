import { Card } from "@/components/ui/card"
import { ChartSkeleton, CardSkeleton, TableSkeleton } from "@/components/ui/enhanced-skeleton"

export default function TradeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="px-2 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[calc(100vh-5rem)]">
          {/* Left Sidebar Skeleton */}
          <aside className="lg:col-span-2 space-y-3">
            <Card className="bento-card p-4">
              <CardSkeleton />
            </Card>
            <Card className="bento-card p-4">
              <TableSkeleton rows={8} />
            </Card>
          </aside>

          {/* Center - Chart Skeleton */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="h-[500px] lg:h-[700px]">
              <Card className="bento-card h-full p-4">
                <ChartSkeleton className="h-full" />
              </Card>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="bento-card">
                <CardSkeleton />
              </Card>
              <Card className="bento-card">
                <CardSkeleton />
              </Card>
            </div>
          </div>

          {/* Right Sidebar - Trading Panel Skeleton */}
          <aside className="lg:col-span-2">
            <Card className="bento-card p-4">
              <CardSkeleton />
            </Card>
          </aside>
        </div>

        {/* Bottom - Active Positions Skeleton */}
        <div className="mt-3">
          <Card className="bento-card p-4">
            <TableSkeleton rows={3} />
          </Card>
        </div>
      </main>
    </div>
  )
}
