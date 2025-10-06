import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ChartSkeleton() {
  return (
    <Card className="h-full overflow-hidden border-border p-4">
      <div className="space-y-4 h-full flex flex-col">
        {/* Chart header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>

        {/* Chart area */}
        <div className="flex-1 relative">
          <Skeleton className="h-full w-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading chart...</p>
            </div>
          </div>
        </div>

        {/* Chart controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-8" />
            ))}
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </Card>
  )
}
