import { EnhancedCard } from "@/components/ui/enhanced-card-system"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, BarChart3, Loader2 } from "lucide-react"

export function ChartSkeleton() {
  return (
    <EnhancedCard className="h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm relative">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 opacity-50"></div>
      
      <div className="relative z-10 p-6 space-y-6 h-full flex flex-col">
        {/* Chart header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary/60" />
              <Skeleton className="h-6 w-32 bg-muted/50" />
            </div>
            <Skeleton className="h-5 w-24 bg-muted/30" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-16 bg-muted/50 rounded-full" />
            <Skeleton className="h-8 w-16 bg-muted/50 rounded-full" />
            <Skeleton className="h-8 w-16 bg-muted/50 rounded-full" />
          </div>
        </div>

        {/* Chart area with enhanced loading state */}
        <div className="flex-1 relative bg-muted/20 rounded-lg border border-border/30">
          <Skeleton className="h-full w-full rounded-lg" />
          
          {/* Animated chart lines simulation */}
          <div className="absolute inset-4 overflow-hidden rounded">
            <div className="flex items-end justify-between h-full gap-1">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-primary/20 rounded-t animate-pulse"
                  style={{ 
                    height: `${Math.random() * 80 + 20}%`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '2s'
                  }}
                />
              ))}
            </div>
          </div>
          
          {/* Loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/5 backdrop-blur-sm">
            <div className="text-center space-y-3 p-6 bg-background/80 rounded-lg border border-border/50">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Loading Chart</p>
                <p className="text-xs text-muted-foreground">Fetching real-time data...</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>Powered by DexScreener</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {['1m', '5m', '15m', '1h', '4h', '1d'].map((timeframe, i) => (
              <Skeleton 
                key={i} 
                className="h-8 w-10 bg-muted/50 rounded-md" 
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-24 bg-muted/30" />
            <Skeleton className="h-6 w-6 bg-muted/30 rounded-full" />
          </div>
        </div>
      </div>
    </EnhancedCard>
  )
}
