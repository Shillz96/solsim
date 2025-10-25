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
 * TypeScript types for Mario styling utilities
 */
export type MarioSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type MarioButtonVariant = 'primary' | 'danger' | 'success' | 'secondary' | 'outline'
export type MarioBadgeVariant = 'gold' | 'silver' | 'bronze' | 'admin' | 'verified'
export type MarioOrientation = 'horizontal' | 'vertical'
export type MarioRounded = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'

/**
 * Mario-themed className generators for consistent styling
 * 
 * These utilities provide reusable styling patterns that match the Mario theme
 * and reduce duplication across components.
 */
export const marioStyles = {
  /* ============================================
     CARD VARIANTS - Semantic sizes for different use cases
     ============================================ */
  
  /**
   * Standard Mario card - Most common use case
   * @param hover Whether to include hover effects (default: true)
   */
  card: (hover: boolean = true) => cn(
    'rounded-xl border-3 border-[var(--outline-black)] p-3 bg-white',
    'shadow-[3px_3px_0_var(--outline-black)] transition-all',
    hover && 'hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5'
  ),

  /**
   * Large prominent card - For headers, hero sections, featured content
   * Uses 4px border and 6px shadow for maximum impact
   */
  cardLg: (hover: boolean = true) => cn(
    'rounded-2xl border-4 border-[var(--outline-black)] p-6 bg-white',
    'shadow-[6px_6px_0_var(--outline-black)] transition-all',
    hover && 'hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-1'
  ),

  /**
   * Compact card - For list items, tight layouts
   * Uses 2px border and 2px shadow for subtle effect
   */
  cardSm: (hover: boolean = true) => cn(
    'rounded-lg border-2 border-[var(--outline-black)] p-2 bg-white',
    'shadow-[2px_2px_0_var(--outline-black)] transition-all',
    hover && 'hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5'
  ),

  /**
   * Card with colored background gradient
   * @param bgGradient Tailwind gradient classes (e.g., 'from-[var(--sky-blue)]/20 to-white')
   * @param hover Whether to include hover effects (default: true)
   */
  cardGradient: (bgGradient: string, hover: boolean = true) => cn(
    'rounded-xl border-4 border-[var(--outline-black)] p-4',
    'shadow-[4px_4px_0_var(--outline-black)] transition-all',
    `bg-gradient-to-br ${bgGradient}`,
    hover && 'hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-0.5'
  ),

  /* ============================================
     SHADOW UTILITIES - Semantic shadow system
     ============================================ */

  /**
   * Small shadow - For subtle depth on compact elements
   */
  shadowSm: 'shadow-[2px_2px_0_var(--outline-black)]',

  /**
   * Medium shadow - Standard shadow for most elements
   */
  shadowMd: 'shadow-[3px_3px_0_var(--outline-black)]',

  /**
   * Large shadow - For prominent elements and containers
   */
  shadowLg: 'shadow-[6px_6px_0_var(--outline-black)]',

  /**
   * Extra large shadow - For hero sections and major features
   */
  shadowXl: 'shadow-[8px_8px_0_var(--outline-black)]',

  /* ============================================
     BUTTON VARIANTS - Extended color options
     ============================================ */

  /**
   * Standard button with Mario styling
   * @param variant Color variant
   * @param size Size variant: 'sm', 'md', 'lg'
   */
  button: (variant: 'primary' | 'danger' | 'success' | 'secondary' | 'outline' = 'primary', size: 'sm' | 'md' | 'lg' = 'md') => cn(
    'border-3 border-[var(--outline-black)] font-bold transition-all rounded-lg',
    'shadow-[3px_3px_0_var(--outline-black)]',
    'hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5',
    'active:shadow-[2px_2px_0_var(--outline-black)] active:translate-y-0',
    // Size variants
    {
      'px-3 py-1.5 text-sm': size === 'sm',
      'px-4 py-2 text-base': size === 'md',
      'px-6 py-3 text-lg': size === 'lg',
    },
    // Color variants
    {
      'bg-[var(--star-yellow)] hover:bg-[var(--coin-gold)] text-[var(--outline-black)]': variant === 'primary',
      'bg-[var(--mario-red)] hover:bg-[var(--mario-red)]/90 text-white': variant === 'danger',
      'bg-[var(--luigi-green)] hover:bg-[var(--pipe-green)] text-white': variant === 'success',
      'bg-[var(--sky-blue)] hover:bg-[var(--super-blue)] text-white': variant === 'secondary',
      'bg-white hover:bg-[var(--background)] text-[var(--outline-black)]': variant === 'outline',
    }
  ),

  /**
   * Icon button - Circular button for icon-only actions
   * @param variant Color variant
   * @param size Size in pixels (default: 40)
   */
  iconButton: (variant: 'primary' | 'danger' | 'success' | 'secondary' = 'primary', size: number = 40) => cn(
    'rounded-full border-3 border-[var(--outline-black)] font-bold transition-all',
    'shadow-[2px_2px_0_var(--outline-black)]',
    'hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5',
    'flex items-center justify-center',
    {
      'bg-[var(--star-yellow)] hover:bg-[var(--coin-gold)] text-[var(--outline-black)]': variant === 'primary',
      'bg-[var(--mario-red)] hover:bg-[var(--mario-red)]/90 text-white': variant === 'danger',
      'bg-[var(--luigi-green)] hover:bg-[var(--pipe-green)] text-white': variant === 'success',
      'bg-[var(--sky-blue)] hover:bg-[var(--super-blue)] text-white': variant === 'secondary',
    }
  ),

  /* ============================================
     BADGE & TAG VARIANTS
     ============================================ */

  /**
   * Status indicator box with colored background
   * @param color CSS color value (use var(--color-name) or direct color)
   * @param size Size variant: 'sm', 'md'
   */
  statusBox: (color: string, size: 'sm' | 'md' = 'md') => cn(
    'flex items-center gap-1.5 rounded-lg',
    'border-3 border-[var(--outline-black)]',
    'shadow-[2px_2px_0_var(--outline-black)]',
    'font-mario font-bold text-white capitalize',
    {
      'px-2 py-1 text-[10px]': size === 'sm',
      'px-3 py-1.5 text-xs': size === 'md',
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
   * Larger badge with text - For achievements, tiers, etc.
   * @param variant Color variant
   */
  badgeLg: (variant: 'gold' | 'silver' | 'bronze' | 'admin' | 'verified' = 'gold') => cn(
    'px-2 py-1 rounded-lg border-3 border-[var(--outline-black)]',
    'shadow-[2px_2px_0_var(--outline-black)]',
    'text-xs font-mario font-bold text-white uppercase',
    {
      'bg-[var(--coin-gold)]': variant === 'gold',
      'bg-[var(--pipe-300)]': variant === 'silver',
      'bg-[var(--brick-brown)]': variant === 'bronze',
      'bg-[var(--mario-red)]': variant === 'admin',
      'bg-[var(--luigi-green)]': variant === 'verified',
    }
  ),

  /* ============================================
     AVATAR VARIANTS
     ============================================ */

  /**
   * Avatar with Mario border styling
   * @param size Size variant: 'xs' (16px), 'sm' (24px), 'md' (40px), 'lg' (64px), 'xl' (96px)
   */
  avatar: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md') => cn(
    'rounded-full border-3 border-[var(--outline-black)]',
    'shadow-[2px_2px_0_var(--outline-black)] overflow-hidden',
    {
      'h-4 w-4 border-2': size === 'xs',
      'h-6 w-6': size === 'sm',
      'h-10 w-10': size === 'md',
      'h-16 w-16 border-4 shadow-[3px_3px_0_var(--outline-black)]': size === 'lg',
      'h-24 w-24 border-4 shadow-[4px_4px_0_var(--outline-black)]': size === 'xl',
    }
  ),

  /* ============================================
     HEADER & SECTION STYLES
     ============================================ */

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
   * Section header with icon - For major page sections
   */
  sectionHeader: cn(
    'flex items-center gap-3 mb-4 p-4',
    'bg-[var(--sky-blue)]/20 border-l-4 border-[var(--outline-black)]',
    'rounded-r-lg'
  ),

  /* ============================================
     FORM ELEMENTS
     ============================================ */

  /**
   * Input field with Mario styling
   * @param size Size variant: 'sm', 'md', 'lg'
   */
  input: (size: 'sm' | 'md' | 'lg' = 'md') => cn(
    'border-3 border-[var(--outline-black)] rounded-lg font-medium',
    'shadow-[2px_2px_0_var(--outline-black)]',
    'focus:shadow-[3px_3px_0_var(--outline-black)] transition-all',
    'focus:border-[var(--luigi-green)]',
    {
      'px-2 py-1 text-sm': size === 'sm',
      'px-3 py-2 text-base': size === 'md',
      'px-4 py-3 text-lg': size === 'lg',
    }
  ),

  /**
   * Select dropdown with Mario styling
   */
  select: cn(
    'border-3 border-[var(--outline-black)] rounded-lg font-medium',
    'shadow-[2px_2px_0_var(--outline-black)]',
    'focus:shadow-[3px_3px_0_var(--outline-black)] transition-all',
    'bg-white px-3 py-2'
  ),

  /* ============================================
     UTILITY STYLES
     ============================================ */
  
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

  /**
   * Divider line with Mario styling
   * @param orientation 'horizontal' or 'vertical'
   */
  divider: (orientation: 'horizontal' | 'vertical' = 'horizontal') => cn(
    'bg-[var(--outline-black)]',
    {
      'h-[3px] w-full my-4': orientation === 'horizontal',
      'w-[3px] h-full mx-4': orientation === 'vertical',
    }
  ),

  /**
   * Loading skeleton with Mario styling
   */
  skeleton: cn(
    'animate-pulse bg-[var(--sky-blue)]/20',
    'border-3 border-[var(--outline-black)]',
    'rounded-lg'
  ),
}
