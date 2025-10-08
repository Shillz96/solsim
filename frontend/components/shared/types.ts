/**
 * Types for shared components
 */
import { type ReactNode } from 'react';

/**
 * Trend direction type
 */
export type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Base props for all indicator components
 */
export interface BaseIndicatorProps {
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Optional size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Trend indicator component props
 */
export interface TrendIndicatorProps extends BaseIndicatorProps {
  /**
   * Value determining the trend direction and magnitude
   * Positive values show an upward trend, negative values show a downward trend
   */
  value: number;
  
  /**
   * Optional suffix to display after the value (e.g., %, pts)
   */
  suffix?: string;
  
  /**
   * Optional number of decimal places to display
   */
  decimals?: number;
  
  /**
   * Whether to show the trend icon
   */
  showIcon?: boolean;
  
  /**
   * Whether to show the value number
   */
  showValue?: boolean;
}

/**
 * P&L (Profit and Loss) indicator props
 */
export interface PnLIndicatorProps extends BaseIndicatorProps {
  /**
   * Amount in USD (positive for profit, negative for loss)
   */
  amount: number;
  
  /**
   * Optional percentage value
   */
  percentage?: number;
  
  /**
   * Whether to show the percentage
   */
  showPercentage?: boolean;
}

/**
 * Data card component props
 */
export interface DataCardProps {
  /**
   * Title of the card
   */
  title: string;
  
  /**
   * Optional subtitle or description
   */
  subtitle?: string;
  
  /**
   * Optional icon to display
   */
  icon?: ReactNode;
  
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Optional flag to show loading state
   */
  isLoading?: boolean;
  
  /**
   * Child content to render inside the card
   */
  children: ReactNode;
}

/**
 * Stat card component props
 */
export interface StatCardProps {
  /**
   * Title of the stat
   */
  title: string;
  
  /**
   * Main value to display
   */
  value: string | number;
  
  /**
   * Optional change/delta value
   */
  change?: number;
  
  /**
   * Optional suffix for the change value
   */
  changeSuffix?: string;
  
  /**
   * Optional icon to display
   */
  icon?: ReactNode;
  
  /**
   * Optional trend direction for semantic coloring
   */
  trend?: 'positive' | 'negative' | 'neutral';
  
  /**
   * Optional flag to show loading state
   */
  isLoading?: boolean;
  
  /**
   * Optional CSS class name
   */
  className?: string;
}