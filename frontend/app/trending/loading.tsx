import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function TrendingLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="w-full px-2 py-6 max-w-page-xl mx-auto">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        <Card className="p-4 mb-4">
          <Skeleton className="h-10 w-full" />
        </Card>

        <Card className="overflow-hidden">
          <div className="p-4 space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      </main>
    </div>
  )
}
