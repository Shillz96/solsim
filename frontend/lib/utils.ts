import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines multiple class names using clsx and tailwind-merge
 * for optimized Tailwind CSS class merging
 * 
 * @param inputs Array of class names or conditional class objects
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with specified decimal places
 * 
 * @param num The number to format
 * @param decimals The number of decimal places (default: 2)
 * @returns Formatted number string with commas as thousands separators
 */
export function formatNumber(num: number, decimals: number = 2): string {
  if (num === undefined || num === null || isNaN(num)) {
    return '0.00';
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a currency value with dollar sign and specified decimal places
 * 
 * @param amount The amount to format
 * @param decimals The number of decimal places (default: 2)
 * @returns Formatted currency string with $ prefix
 */
export function formatCurrency(amount: number, decimals: number = 2): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0.00';
  }
  return `$${formatNumber(amount, decimals)}`;
}

/**
 * Format a percentage value with % sign and optional plus prefix
 * 
 * @param value The percentage value (e.g., 0.1234 for 12.34%)
 * @param decimals The number of decimal places (default: 2)
 * @param includePlusSign Whether to include + sign for positive values (default: true)
 * @returns Formatted percentage string with % suffix
 */
export function formatPercent(value: number, decimals: number = 2, includePlusSign: boolean = true): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00%';
  }
  
  const percentValue = value * 100;
  const prefix = includePlusSign && percentValue > 0 ? '+' : '';
  return `${prefix}${formatNumber(percentValue, decimals)}%`;
}

/**
 * Format a large number in compact form with K, M, B suffixes
 * 
 * @param value The value to format
 * @param decimals The number of decimal places (default: 1)
 * @returns Formatted compact number (e.g., 1.2K, 3.4M)
 */
export function formatCompactNumber(value: number, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(decimals)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(decimals)}K`;
  }
  
  return `${sign}${formatNumber(absValue, decimals)}`;
}

/**
 * Mario-themed className generators for consistent styling
 * 
 * These utilities provide reusable styling patterns that match the Mario theme
 * and reduce duplication across components.
 */
export const marioStyles = {
  /**
   * Interactive card with standard Mario styling
   * @param hover Whether to include hover effects (default: true)
   */
  card: (hover: boolean = true) => cn(
    'rounded-xl border-3 border-[var(--outline-black)] p-3 bg-white',
    'shadow-[3px_3px_0_var(--outline-black)] transition-all',
    hover && 'hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5'
  ),
  
  /**
   * Status indicator box with colored background
   * @param color CSS color value (use var(--color-name) or direct color)
   */
  statusBox: (color: string) => cn(
    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
    'border-3 border-[var(--outline-black)]',
    'shadow-[2px_2px_0_var(--outline-black)]',
    'font-mario font-bold text-xs text-white capitalize'
  ),
  
  /**
   * Avatar with Mario border styling
   * @param size Size variant: 'sm' (24px), 'md' (40px), 'lg' (64px)
   */
  avatar: (size: 'sm' | 'md' | 'lg' = 'md') => cn(
    'rounded-full border-3 border-[var(--outline-black)]',
    'shadow-[2px_2px_0_var(--outline-black)] overflow-hidden',
    {
      'h-6 w-6': size === 'sm',
      'h-10 w-10': size === 'md',
      'h-16 w-16': size === 'lg',
    }
  ),
  
  /**
   * Small badge icon for user badges
   */
  badge: cn(
    'h-4 w-4 rounded-full border-2 border-[var(--outline-black)]',
    'bg-white flex items-center justify-center overflow-hidden',
    'shadow-[1px_1px_0_var(--outline-black)]'
  ),
  
  /**
   * Header gradient with bottom border
   * @param fromColor Starting gradient color (e.g., 'var(--luigi-green)')
   * @param toColor Optional ending gradient color
   */
  headerGradient: (fromColor: string, toColor?: string) => cn(
    'p-4 border-b-4 border-[var(--outline-black)]',
    'flex items-center justify-between flex-shrink-0',
    'shadow-[0_4px_0_var(--outline-black)]',
    `bg-gradient-to-r from-[${fromColor}]`,
    toColor && `to-${toColor}`
  ),
  
  /**
   * Input field with Mario styling
   */
  input: cn(
    'border-3 border-[var(--outline-black)] rounded-lg font-medium',
    'shadow-[2px_2px_0_var(--outline-black)]',
    'focus:shadow-[3px_3px_0_var(--outline-black)] transition-all'
  ),
  
  /**
   * Button with Mario styling
   * @param variant Color variant: 'primary', 'danger', 'success'
   */
  button: (variant: 'primary' | 'danger' | 'success' = 'primary') => cn(
    'border-3 border-[var(--outline-black)] font-bold px-4',
    'shadow-[3px_3px_0_var(--outline-black)] transition-all',
    'hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5',
    {
      'bg-[var(--luigi-green)] hover:bg-[var(--pipe-green)] text-white': variant === 'success',
      'bg-[var(--mario-red)] hover:bg-[var(--mario-red)]/90 text-white': variant === 'danger',
      'bg-[var(--star-yellow)] hover:bg-[var(--coin-gold)] text-[var(--outline-black)]': variant === 'primary',
    }
  ),
  
  /**
   * Empty state icon container
   * @param bgColor Background color (e.g., 'var(--luigi-green)')
   * @param size Optional size override (default: 'w-20 h-20')
   */
  emptyStateIcon: (bgColor: string, size: string = 'w-20 h-20') => cn(
    size,
    'rounded-xl border-4 border-[var(--outline-black)]',
    'flex items-center justify-center mb-4',
    'shadow-[4px_4px_0_var(--outline-black)] text-3xl',
    `bg-gradient-to-br from-[${bgColor}]`
  ),

  /**
   * Vitals stat card with gradient background and icon
   * Used for metrics display (volume, holders, etc.)
   * @param bgGradient Tailwind gradient classes (e.g., 'from-[var(--coin-gold)]/20 to-[var(--star-yellow)]/10')
   */
  vitalsCard: (bgGradient?: string) => cn(
    'flex flex-col items-center justify-center gap-3 p-6 aspect-square',
    'rounded-lg border-3 border-[var(--outline-black)]',
    'shadow-[3px_3px_0_var(--outline-black)]',
    bgGradient && `bg-gradient-to-br ${bgGradient}`
  ),

  /**
   * Circular icon container for vitals cards
   * @param bgColor Background color
   * @param size Size variant: 'md' (64px) or 'lg' (80px)
   */
  vitalsIcon: (bgColor: string, size: 'md' | 'lg' = 'md') => cn(
    'rounded-full border-4 border-[var(--outline-black)]',
    'flex items-center justify-center',
    'shadow-[3px_3px_0_var(--outline-black)]',
    `bg-[${bgColor}]`,
    {
      'h-16 w-16': size === 'md',
      'h-20 w-20': size === 'lg',
    }
  ),

  /**
   * Navigation bar with Mario theme background
   * Provides consistent styling for top and bottom navigation bars
   */
  navBar: cn(
    'bg-[var(--background)] border-[var(--color-border)]',
    'backdrop-blur-sm' // Subtle blur for depth
  ),
}
