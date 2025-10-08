import { cn } from "@/lib/utils";
import { ArrowDownIcon, ArrowRightIcon, ArrowUpIcon } from "lucide-react";

interface TrendIndicatorProps {
  value: number;
  showIcon?: boolean;
  showValue?: boolean;
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  decimalPlaces?: number;
  suffix?: string;
}

/**
 * TrendIndicator - A consistent component for showing value trends
 * 
 * @example
 * <TrendIndicator value={2.5} /> // "+2.50%"
 * <TrendIndicator value={-1.2} /> // "-1.20%"
 * <TrendIndicator value={0} /> // "0.00%"
 * 
 * <TrendIndicator value={0.5} iconOnly /> // Just shows up arrow
 * <TrendIndicator value={12.34} suffix="SOL" /> // "+12.34 SOL"
 */
export function TrendIndicator({
  value,
  showIcon = true,
  showValue = true,
  className,
  iconOnly = false,
  size = 'md',
  decimalPlaces = 2,
  suffix = "%"
}: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-medium"
  };
  
  return (
    <div 
      className={cn(
        "flex items-center gap-1 transition-colors",
        isPositive ? "text-profit" : isNeutral ? "text-muted-foreground" : "text-loss",
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <span className="flex items-center">
          {isPositive ? (
            <ArrowUpIcon className="h-3.5 w-3.5" />
          ) : isNeutral ? (
            <ArrowRightIcon className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownIcon className="h-3.5 w-3.5" />
          )}
        </span>
      )}
      {showValue && !iconOnly && (
        <span className="tabular-nums">
          {isPositive ? "+" : ""}{value.toFixed(decimalPlaces)}{suffix ? ` ${suffix}` : ""}
        </span>
      )}
    </div>
  );
}

interface PnLIndicatorProps {
  value: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  decimalPlaces?: number;
  showPrefix?: boolean;
}

/**
 * PnLIndicator - Specialized indicator for profit/loss values
 * 
 * @example
 * <PnLIndicator value={150.25} /> // "$150.25"
 * <PnLIndicator value={-75.50} /> // "-$75.50"
 */
export function PnLIndicator({
  value,
  className,
  size = 'md',
  decimalPlaces = 2,
  showPrefix = true
}: PnLIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base font-medium"
  };
  
  const formattedValue = value.toFixed(decimalPlaces);
  
  return (
    <div 
      className={cn(
        "tabular-nums",
        isPositive ? "text-profit" : isNeutral ? "text-muted-foreground" : "text-loss",
        sizeClasses[size],
        className
      )}
    >
      {isPositive && "+"}{showPrefix && "$"}{formattedValue}
    </div>
  );
}