'use client'

import { formatUSD } from "@/lib/format"
import { formatSolEquivalent } from "@/lib/sol-equivalent-utils"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { cn } from "@/lib/utils"

type PrecisionLevel = 'low' | 'medium' | 'high' | 'crypto'
type ColorizeStyle = 'profit' | 'loss' | 'neutral' | 'none'

interface FinancialValueProps {
  /** USD value to display */
  usd: number
  /** Whether to show SOL equivalent (default: true) */
  showSolEquivalent?: boolean
  /** Precision level for formatting (default: 'medium') */
  precision?: PrecisionLevel
  /** Colorize based on value type (default: 'none') */
  colorize?: ColorizeStyle
  /** Override SOL price for conversion */
  solPrice?: number
  /** Custom prefix (e.g., '+', '-') */
  prefix?: string
  /** Additional CSS classes */
  className?: string
  /** Render inline (spans) or block (divs) */
  inline?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Emphasis level */
  emphasis?: 'normal' | 'medium' | 'bold'
}

/**
 * FinancialValue Component
 * 
 * Standardized component for displaying financial values with:
 * - Automatic SOL equivalent calculation and display
 * - Configurable precision levels
 * - Proper colorization for profit/loss
 * - Consistent typography and spacing
 * - Screen reader accessibility
 * 
 * @example
 * ```tsx
 * <FinancialValue 
 *   usd={1234.56} 
 *   precision="high"
 *   colorize="profit" 
 *   size="lg"
 * />
 * ```
 */
export function FinancialValue({
  usd,
  showSolEquivalent = true,
  precision = 'medium',
  colorize = 'none',
  solPrice: overrideSolPrice,
  prefix = '',
  className,
  inline = false,
  size = 'md',
  emphasis = 'normal'
}: FinancialValueProps) {
  const { prices: livePrices } = usePriceStreamContext()
  const solPrice = overrideSolPrice || livePrices.get('So11111111111111111111111111111111111111112')?.price || 0

  // Determine decimal places based on precision
  const getDecimals = (value: number, precision: PrecisionLevel): number => {
    switch (precision) {
      case 'low':
        return value >= 1 ? 0 : 2
      case 'medium':
        return value >= 1 ? 2 : 4
      case 'high':
        return value >= 1 ? 4 : 6
      case 'crypto':
        return value >= 1 ? 6 : 8
      default:
        return 2
    }
  }

  const decimals = getDecimals(Math.abs(usd), precision)
  
  // Custom USD formatting with configurable decimals
  const formatUsdValue = (value: number, decimals: number): string => {
    if (Math.abs(value) === 0) return '$0.00'
    if (Math.abs(value) < 0.01 && decimals < 4) {
      // For very small values, ensure at least 4 decimals
      return `$${value.toFixed(Math.max(4, decimals))}`
    }
    return `$${value.toFixed(decimals)}`
  }
  
  const formattedUsd = formatUsdValue(Math.abs(usd), decimals)
  const solEquivalent = showSolEquivalent && solPrice > 0 
    ? formatSolEquivalent(Math.abs(usd), solPrice) 
    : null

  // Colorization classes
  const getColorClass = (colorize: ColorizeStyle, value: number): string => {
    switch (colorize) {
      case 'profit':
        return 'text-profit'
      case 'loss':
        return 'text-loss'
      case 'neutral':
        return value >= 0 ? 'text-profit' : 'text-loss'
      default:
        return 'text-foreground'
    }
  }

  // Size classes
  const getSizeClasses = (size: string): { main: string; sub: string } => {
    switch (size) {
      case 'sm':
        return { main: 'text-sm', sub: 'text-xs' }
      case 'md':
        return { main: 'text-base', sub: 'text-sm' }
      case 'lg':
        return { main: 'text-lg', sub: 'text-sm' }
      case 'xl':
        return { main: 'text-2xl', sub: 'text-base' }
      default:
        return { main: 'text-base', sub: 'text-sm' }
    }
  }

  // Emphasis classes
  const getEmphasisClass = (emphasis: string): string => {
    switch (emphasis) {
      case 'medium':
        return 'font-medium'
      case 'bold':
        return 'font-bold'
      default:
        return 'font-normal'
    }
  }

  const colorClass = getColorClass(colorize, usd)
  const sizeClasses = getSizeClasses(size)
  const emphasisClass = getEmphasisClass(emphasis)

  const Container = inline ? 'span' : 'div'
  const SubContainer = inline ? 'span' : 'div'

  return (
    <Container className={cn('font-mono', className)}>
      {/* Main USD value */}
      <span 
        className={cn(
          sizeClasses.main,
          emphasisClass,
          colorClass,
          'tabular-nums'
        )}
        aria-label={`${prefix}${Math.abs(usd) < 0.01 ? 'less than one cent' : formattedUsd}`}
      >
        {prefix}{formattedUsd}
      </span>
      
      {/* SOL equivalent */}
      {solEquivalent && (
        <SubContainer 
          className={cn(
            sizeClasses.sub,
            'text-muted-foreground tabular-nums',
            inline ? 'ml-2' : 'mt-1'
          )}
          aria-label={`Equivalent to ${solEquivalent}`}
        >
          ≈ {solEquivalent}
        </SubContainer>
      )}
    </Container>
  )
}

/**
 * Specialized variants for common use cases
 */

export function ProfitLossValue(props: Omit<FinancialValueProps, 'colorize'>) {
  return (
    <FinancialValue 
      {...props} 
      colorize="neutral"
      prefix={props.usd >= 0 ? '+' : ''}
    />
  )
}

export function PortfolioValue(props: Omit<FinancialValueProps, 'precision' | 'size'>) {
  return (
    <FinancialValue 
      {...props} 
      precision="medium"
      size="lg"
    />
  )
}

export function TradingValue(props: Omit<FinancialValueProps, 'precision'>) {
  return (
    <FinancialValue 
      {...props} 
      precision="high"
    />
  )
}