/**
 * Portfolio component types - Re-exports backend types and UI-specific interfaces
 */

// Re-export backend portfolio types
export type {
  PortfolioPosition,
  PortfolioTotals,
  PortfolioResponse
} from '@/lib/types/backend';

/**
 * Enhanced position with token metadata for UI display
 */
export interface EnhancedPosition extends PortfolioPosition {
  tokenSymbol?: string;
  tokenName?: string;
  tokenImageUrl?: string;
  currentPrice?: number;
}

/**
 * Portfolio summary for UI components
 */
export interface PortfolioSummary {
  totalValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  realizedPnL: number;
  unrealizedPnL: number;
  positionsCount: number;
  lastUpdated: Date;
}

/**
 * Props for the portfolio positions table
 */
export interface PortfolioPositionsProps {
  positions: EnhancedPosition[];
  isLoading?: boolean;
  onSelectPosition?: (position: EnhancedPosition) => void;
}

/**
 * Performance data point for charts
 */
export interface PortfolioPerformancePoint {
  date: string;
  value: number;
  pnl?: number;
}

/**
 * Props for portfolio performance chart
 */
export interface PortfolioChartProps {
  data: PortfolioPerformancePoint[];
  isLoading?: boolean;
  timeframe?: '1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL';
  onTimeframeChange?: (timeframe: string) => void;
}