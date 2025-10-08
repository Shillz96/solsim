/**
 * Types for UI typography components
 */
import { type ReactNode } from 'react';
import { type VariantProps } from 'class-variance-authority';

/**
 * Base typography props shared by all text components
 */
export interface BaseTypographyProps {
  /**
   * Text content
   */
  children: ReactNode;
  
  /**
   * Optional CSS class name
   */
  className?: string;
  
  /**
   * Optional HTML element to render as
   */
  as?: React.ElementType;
}

/**
 * Props for text components that can have semantic variants
 */
export interface VariantTypographyProps extends BaseTypographyProps {
  /**
   * Optional variant for semantic styling
   */
  variant?: 'default' | 'muted' | 'success' | 'destructive' | 'warning';
}

/**
 * Props for heading components
 */
export interface HeadingProps extends BaseTypographyProps {
  /**
   * Optional level for semantic HTML (h1-h6)
   */
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Props for financial value display
 */
export interface FinancialValueProps extends VariantTypographyProps {
  /**
   * Optional prefix (like currency symbol)
   */
  prefix?: string;
  
  /**
   * Optional suffix (like % or units)
   */
  suffix?: string;
  
  /**
   * Whether the value represents a change/delta
   */
  isChange?: boolean;
  
  /**
   * Whether to force positive sign for positive values
   */
  forceSign?: boolean;
  
  /**
   * Number of decimal places to display
   */
  decimals?: number;
}

/**
 * Props for data value display
 */
export interface DataValueProps extends VariantTypographyProps {
  /**
   * Optional label to display with the value
   */
  label?: string;
  
  /**
   * Optional trend direction for semantic coloring
   */
  trend?: 'positive' | 'negative' | 'neutral';
  
  /**
   * Whether the value is loading
   */
  isLoading?: boolean;
}

/**
 * Props for monospace text (code, numbers, etc.)
 */
export interface MonospaceProps extends BaseTypographyProps {
  /**
   * Whether to apply tabular number formatting
   */
  tabularNums?: boolean;
}