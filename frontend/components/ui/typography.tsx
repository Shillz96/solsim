import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TextProps {
  children: ReactNode;
  className?: string;
}

// Display Typography - For hero sections and major headings
export function DisplayHeading({ children, className }: TextProps) {
  return (
    <h1 className={cn("scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl", className)}>
      {children}
    </h1>
  );
}

// Heading Typography - For section titles
export function Heading({ children, className }: TextProps) {
  return (
    <h2 className={cn("scroll-m-20 text-2xl font-semibold tracking-tight", className)}>
      {children}
    </h2>
  );
}

// Subheading Typography - For card titles and smaller sections
export function Subheading({ children, className }: TextProps) {
  return (
    <h3 className={cn("scroll-m-20 text-xl font-medium tracking-tight", className)}>
      {children}
    </h3>
  );
}

// Large Body Text - For emphasized paragraphs
export function BodyLarge({ children, className }: TextProps) {
  return <p className={cn("text-base leading-7", className)}>{children}</p>;
}

// Default Body Text - For standard content
export function BodyDefault({ children, className }: TextProps) {
  return <p className={cn("text-sm leading-6", className)}>{children}</p>;
}

// Small Body Text - For captions and secondary text
export function BodySmall({ children, className }: TextProps) {
  return <p className={cn("text-xs leading-5 text-muted-foreground", className)}>{children}</p>;
}

// Monospace Text - For code, wallet addresses, and numeric values
export function Monospace({ children, className }: TextProps) {
  return <span className={cn("font-mono text-sm", className)}>{children}</span>;
}

// Financial Values - For displaying currency and percentages
interface FinancialValueProps extends Omit<TextProps, 'children'> {
  children?: ReactNode;
  value: number;
  prefix?: string;
  suffix?: string;
  showIndicator?: boolean;
  decimalPlaces?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function FinancialValue({ 
  children, 
  className, 
  value,
  prefix = "",
  suffix = "",
  showIndicator = true,
  decimalPlaces = 2,
  size = 'md'
}: FinancialValueProps) {
  const isPositive = value > 0;
  const isNegative = value < 0;
  
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg font-medium",
    xl: "text-xl font-medium"
  };
  
  const formattedValue = value.toFixed(decimalPlaces);
  const displayValue = `${prefix}${isPositive && showIndicator ? '+' : ''}${formattedValue}${suffix}`;
  
  return (
    <span className={cn(
      "tabular-nums tracking-tight",
      isPositive && "text-profit",
      isNegative && "text-loss",
      !isPositive && !isNegative && "text-muted-foreground",
      sizeClasses[size],
      className
    )}>
      {displayValue}
      {children}
    </span>
  );
}

// Trading Label - For form labels and data headings
export function TradingLabel({ children, className }: TextProps) {
  return (
    <span className={cn(
      "text-xs font-medium uppercase text-muted-foreground tracking-wide",
      className
    )}>
      {children}
    </span>
  );
}

// Data Value - For displaying important metric values
export function DataValue({ children, className }: TextProps) {
  return (
    <span className={cn(
      "text-lg font-medium tabular-nums",
      className
    )}>
      {children}
    </span>
  );
}