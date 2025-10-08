import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

type DataCardProps = {
  title: string;
  description?: string;
  footer?: ReactNode;
  className?: string;
  children: ReactNode;
  isLoading?: boolean;
  trend?: 'positive' | 'negative' | 'neutral';
  headerAction?: ReactNode;
};

/**
 * DataCard - A consistent card pattern for displaying financial data in SolSim
 * 
 * @example
 * <DataCard
 *   title="Portfolio Value"
 *   description="Your current portfolio valuation"
 *   trend="positive"
 *   headerAction={<RefreshButton onClick={refetch} />}
 * >
 *   <div className="flex flex-col gap-2">
 *     <FinancialValue value={423.55} prefix="$" size="xl" />
 *     <div className="flex items-center gap-2">
 *       <TrendIndicator value={5.2} />
 *       <BodySmall>Since yesterday</BodySmall>
 *     </div>
 *   </div>
 * </DataCard>
 */
export function DataCard({
  title,
  description,
  footer,
  className,
  children,
  isLoading = false,
  trend = 'neutral',
  headerAction
}: DataCardProps) {
  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isLoading && "animate-pulse opacity-70",
      trend === 'positive' && "border-l-4 border-l-profit",
      trend === 'negative' && "border-l-4 border-l-loss",
      trend === 'neutral' && "border-l-transparent",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <DataCardSkeleton /> : children}
      </CardContent>
      {footer && <CardFooter className="pt-3 border-t">{footer}</CardFooter>}
    </Card>
  );
}

function DataCardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  className?: string;
  isLoading?: boolean;
  changePrefix?: string;
  changeSuffix?: string;
  trend?: 'positive' | 'negative' | 'neutral';
};

/**
 * StatCard - A simplified DataCard variant for displaying key metrics
 * 
 * @example
 * <StatCard
 *   title="Total Balance"
 *   value="$1,234.56"
 *   change={2.5}
 *   changeSuffix="%"
 *   icon={<WalletIcon className="h-4 w-4" />}
 * />
 */
export function StatCard({
  title,
  value,
  change,
  icon,
  className,
  isLoading = false,
  changePrefix = "",
  changeSuffix = "",
  trend = change === undefined ? 'neutral' : change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
}: StatCardProps) {
  
  return (
    <DataCard
      title={title}
      trend={trend}
      isLoading={isLoading}
      className={cn("h-[140px]", className)}
    >
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-center gap-2 mt-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
        </div>
        
        {change !== undefined && (
          <div className={cn(
            "text-sm tabular-nums font-medium flex items-center gap-1 mt-2",
            trend === 'positive' && "text-profit",
            trend === 'negative' && "text-loss",
          )}>
            {trend === 'positive' && '+'}{changePrefix}{change.toFixed(2)}{changeSuffix}
            {trend === 'positive' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
            )}
            {trend === 'negative' && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            )}
          </div>
        )}
      </div>
    </DataCard>
  );
}