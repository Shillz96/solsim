import { Card } from "@/components/ui/card"
import { CardSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/enhanced-skeleton"

export default function PortfolioLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 max-w-page-xl">
        {/* Header Skeleton */}
        <div className="mb-6">
          <CardSkeleton className="h-12 w-48 mb-2" />
          <CardSkeleton className="h-4 w-64" />
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* PnL Card Skeleton */}
            <Card className="bento-card">
              <CardSkeleton />
            </Card>

            {/* Chart Skeleton */}
            <Card className="bento-card p-6">
              <ChartSkeleton />
            </Card>

            {/* Table Skeleton */}
            <Card className="bento-card p-6">
              <TableSkeleton rows={5} />
            </Card>
          </div>

          {/* Right Sidebar Skeleton */}
          <aside className="space-y-6">
            <Card className="bento-card">
              <CardSkeleton />
            </Card>
            <Card className="bento-card">
              <CardSkeleton />
            </Card>
          </aside>
        </div>
      </main>
    </div>
  )
}
