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
    'rounded-xl border-3 border-outline p-3 bg-white',
    'shadow-[3px_3px_0_var(--outline-black)] transition-all',
    hover && 'hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5'
  ),

  /**
   * Large prominent card - For headers, hero sections, featured content
   * Uses 4px border and 6px shadow for maximum impact
   */
  cardLg: (hover: boolean = true) => cn(
    'rounded-2xl border-4 border-outline p-6 bg-white',
    'shadow-[6px_6px_0_var(--outline-black)] transition-all',
    hover && 'hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-1'
  ),

  /**
   * Compact card - For list items, tight layouts
   * Uses 2px border and 2px shadow for subtle effect
   */
  cardSm: (hover: boolean = true) => cn(
    'rounded-lg border-2 border-outline p-2 bg-white',
    'shadow-[2px_2px_0_var(--outline-black)] transition-all',
    hover && 'hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5'
  ),

  /**
   * Card with colored background gradient
   * @param bgGradient Tailwind gradient classes (e.g., 'from-[var(--sky-blue)]/20 to-white')
   * @param hover Whether to include hover effects (default: true)
   */
  cardGradient: (bgGradient: string, hover: boolean = true) => cn(
    'rounded-xl border-4 border-outline p-4',
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
  button: (variant: MarioButtonVariant = 'primary', size: 'sm' | 'md' | 'lg' = 'md') => cn(
    'border-3 border-outline font-bold transition-all rounded-lg',
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
      'bg-star hover:bg-coin text-outline': variant === 'primary',
      'bg-mario hover:bg-mario/90 text-white': variant === 'danger',
      'bg-luigi hover:bg-pipe text-white': variant === 'success',
      'bg-sky hover:bg-super text-white': variant === 'secondary',
      'bg-white hover:bg-background text-outline': variant === 'outline',
    }
  ),

  /**
   * Icon button - Circular button for icon-only actions
  /**
   * Icon button - Circular button for icon-only actions
   * @param variant Color variant
   * @param size Size in pixels (default: 40)
   */
  iconButton: (variant: MarioButtonVariant = 'primary', size: number = 40) => cn(
    'rounded-full border-3 border-outline font-bold transition-all',
    'shadow-[2px_2px_0_var(--outline-black)]',
    'hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5',
    'flex items-center justify-center',
    {
      'bg-star hover:bg-coin text-outline': variant === 'primary',
      'bg-mario hover:bg-mario/90 text-white': variant === 'danger',
      'bg-luigi hover:bg-pipe text-white': variant === 'success',
      'bg-sky hover:bg-super text-white': variant === 'secondary',
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
    'border-3 border-outline',
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
    'h-4 w-4 rounded-full border-2 border-outline',
    'bg-white flex items-center justify-center overflow-hidden',
    'shadow-[1px_1px_0_var(--outline-black)]'
  ),

  /**
   * Larger badge with text - For achievements, tiers, etc.
   * @param variant Color variant
   */
  badgeLg: (variant: MarioBadgeVariant = 'gold') => cn(
    'px-2 py-1 rounded-lg border-3 border-outline',
    'shadow-[2px_2px_0_var(--outline-black)]',
    'text-xs font-mario font-bold text-white uppercase',
    {
      'bg-coin': variant === 'gold',
      'bg-[var(--pipe-300)]': variant === 'silver',
      'bg-brick': variant === 'bronze',
      'bg-mario': variant === 'admin',
      'bg-luigi': variant === 'verified',
    }
  ),

  /* ============================================
     ICON CONTAINER VARIANTS
     ============================================ */

  /**
   * Icon container with Mario styling - For decorative icons
   * @param size Size variant: 'xs' (24px), 'sm' (32px), 'md' (40px), 'lg' (48px), 'xl' (64px)
   * @param bgColor Background color (default: white)
   */
  iconContainer: (size: MarioSize = 'md', bgColor: string = 'white') => cn(
    'rounded-lg border-3 border-outline',
    'flex items-center justify-center',
    'shadow-[3px_3px_0_var(--outline-black)]',
    `bg-${bgColor}`,
    {
      'h-6 w-6 text-sm border-2 shadow-[2px_2px_0_var(--outline-black)]': size === 'xs',
      'h-8 w-8 text-base': size === 'sm',
      'h-10 w-10 text-xl': size === 'md',
      'h-12 w-12 text-2xl': size === 'lg',
      'h-16 w-16 text-3xl border-4 shadow-[4px_4px_0_var(--outline-black)]': size === 'xl',
    }
  ),

  /* ============================================
     AVATAR VARIANTS
     ============================================ */

  /**
   * Chat-specific avatar with better visibility
   * @param size Size variant: 'sm' (28px), 'md' (40px)
   */
  chatAvatar: (size: 'sm' | 'md' = 'sm') => cn(
    'rounded-full overflow-hidden border border-outline/40',
    'shadow-[1px_1px_0_var(--outline-black)]/30',
    {
      'h-7 w-7': size === 'sm',
      'h-10 w-10 border-2 border-outline/60 shadow-[2px_2px_0_var(--outline-black)]/40': size === 'md',
    }
  ),

  /**
   * Avatar with Mario border styling
   * @param size Size variant: 'xs' (16px), 'sm' (24px), 'md' (40px), 'lg' (64px), 'xl' (96px)
   */
  avatar: (size: MarioSize = 'md') => cn(
    'rounded-full overflow-hidden',
    // Lighter borders for better visibility on small avatars
    {
      'h-4 w-4 border border-outline/40 shadow-[1px_1px_0_var(--outline-black)]/30': size === 'xs',
      'h-7 w-7 border-2 border-outline/60 shadow-[1px_1px_0_var(--outline-black)]/40': size === 'sm',
      'h-10 w-10 border-3 border-outline shadow-[2px_2px_0_var(--outline-black)]': size === 'md',
      'h-16 w-16 border-4 border-outline shadow-[3px_3px_0_var(--outline-black)]': size === 'lg',
      'h-24 w-24 border-4 border-outline shadow-[4px_4px_0_var(--outline-black)]': size === 'xl',
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
    'p-4 border-b-4 border-outline',
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
    'bg-sky/20 border-l-4 border-outline',
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
    'border-3 border-outline rounded-lg font-medium',
    'shadow-[2px_2px_0_var(--outline-black)]',
    'focus:shadow-[3px_3px_0_var(--outline-black)] transition-all',
    'focus:border-luigi',
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
    'border-3 border-outline rounded-lg font-medium',
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
    'rounded-xl border-4 border-outline',
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
    'rounded-lg border-3 border-outline',
    'shadow-[3px_3px_0_var(--outline-black)]',
    bgGradient && `bg-gradient-to-br ${bgGradient}`
  ),

  /**
   * Circular icon container for vitals cards
   * @param bgColor Background color
   * @param size Size variant: 'md' (64px) or 'lg' (80px)
   */
  vitalsIcon: (bgColor: string, size: 'md' | 'lg' = 'md') => cn(
    'rounded-full border-4 border-outline',
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
    'bg-background border-[var(--color-border)]',
    'backdrop-blur-sm' // Subtle blur for depth
  ),

  /**
   * Divider line with Mario styling
   * @param orientation 'horizontal' or 'vertical'
   */
  divider: (orientation: MarioOrientation = 'horizontal') => cn(
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
    'animate-pulse bg-sky/20',
    'border-3 border-outline',
    'rounded-lg'
  ),

  /* ============================================
     ROUNDED CORNER UTILITIES - Standardized border radius
     ============================================ */

  /**
   * Standardized rounded corners for consistent visual hierarchy
   * @param size Rounded size variant
   */
  rounded: (size: MarioRounded = 'md') => {
    const roundedMap: Record<MarioRounded, string> = {
      'sm': 'rounded-lg',    // 8px - small elements, badges
      'md': 'rounded-xl',    // 12px - cards, inputs
      'lg': 'rounded-2xl',   // 16px - large cards, panels
      'xl': 'rounded-xl', // 16px - special containers
      '2xl': 'rounded-xl', // 20px - hero sections
      'full': 'rounded-full',  // circular elements
    }
    return roundedMap[size]
  },

  /* ============================================
     HOVER TRANSFORM UTILITIES - Standardized lift effects
     ============================================ */

  /**
   * Standardized hover lift effect for interactive elements
   * @param intensity Lift intensity: 'subtle' (0.5px), 'normal' (1px), 'strong' (2px)
   */
  hoverLift: (intensity: 'subtle' | 'normal' | 'strong' = 'normal') => cn(
    'transition-all duration-200',
    {
      'hover:-translate-y-0.5': intensity === 'subtle',
      'hover:-translate-y-[1px]': intensity === 'normal',
      'hover:-translate-y-[2px]': intensity === 'strong',
    }
  ),

  /* ============================================
     COMBINED INTERACTIVE ELEMENTS - Complete button-like elements
     ============================================ */

  /**
   * Interactive card that acts as a button/link
   * Combines card styling with hover effects
   * @param size Card size variant
   */
  interactiveCard: (size: 'sm' | 'md' | 'lg' = 'md') => cn(
    'cursor-pointer transition-all duration-200',
    {
      'rounded-lg border-2 border-outline p-2 bg-white shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] hover:-translate-y-0.5': size === 'sm',
      'rounded-xl border-3 border-outline p-3 bg-white shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5': size === 'md',
      'rounded-2xl border-4 border-outline p-6 bg-white shadow-[6px_6px_0_var(--outline-black)] hover:shadow-[8px_8px_0_var(--outline-black)] hover:-translate-y-1': size === 'lg',
    }
  ),

  /* ============================================
     TEXT UTILITIES - Typography consistency
     ============================================ */

  /**
   * Mario-styled heading text
   * @param level Heading level for semantic sizing
   */
  heading: (level: 1 | 2 | 3 | 4 = 2) => cn(
    'font-mario font-bold text-outline',
    {
      'text-3xl md:text-4xl': level === 1,
      'text-2xl md:text-3xl': level === 2,
      'text-xl md:text-2xl': level === 3,
      'text-lg md:text-xl': level === 4,
    }
  ),

  /**
   * Body text with consistent styling
   * @param weight Font weight variant
   */
  bodyText: (weight: 'normal' | 'medium' | 'semibold' | 'bold' = 'normal') => cn(
    'text-outline',
    {
      'font-normal': weight === 'normal',
      'font-medium': weight === 'medium',
      'font-semibold': weight === 'semibold',
      'font-bold': weight === 'bold',
    }
  ),

  /* ============================================
     BORDER WIDTH UTILITIES - Semantic border system
     ============================================ */

  /**
   * Standardized border width for Mario theme
   * @param size Border size based on element prominence
   */
  border: (size: 'sm' | 'md' | 'lg' | 'xl' = 'md') => cn(
    'border-outline',
    {
      'border-2': size === 'sm',
      'border-3': size === 'md',
      'border-4': size === 'lg',
      'border-[5px]': size === 'xl',
    }
  ),

  /* ============================================
     WARP PIPES TOKEN CARD UTILITIES
     ============================================ */

  /**
   * Format metric labels consistently for token cards
   * @param label The metric label (e.g., "MC", "Vol", "24h")
   */
  formatMetricLabel: (label: string) => cn(
    'text-[11px] font-bold uppercase text-[var(--metric-label-color)]',
    'tracking-wide'
  ),

  /**
   * Get security status color based on freeze and mint authority
   * @param freezeRevoked Whether freeze authority is revoked
   * @param mintRenounced Whether mint authority is renounced
   */
  getSecurityStatus: (freezeRevoked?: boolean | null, mintRenounced?: boolean | null) => {
    if (freezeRevoked && mintRenounced) return 'green';
    if (freezeRevoked || mintRenounced) return 'yellow';
    return 'red';
  },

  /**
   * Get security shield icon color classes
   * @param freezeRevoked Whether freeze authority is revoked
   * @param mintRenounced Whether mint authority is renounced
   */
  getSecurityIconColor: (freezeRevoked?: boolean | null, mintRenounced?: boolean | null) => {
    const status = marioStyles.getSecurityStatus(freezeRevoked, mintRenounced);
    return cn(
      'w-4 h-4',
      {
        'text-luigi': status === 'green',
        'text-star': status === 'yellow',
        'text-mario': status === 'red',
      }
    );
  },

  /**
   * Format metric value with appropriate color coding
   * @param value The numeric value
   * @param type The metric type for color coding
   */
  formatMetricValue: (value: number | null | undefined, type: 'positive' | 'negative' | 'neutral' = 'neutral') => {
    if (value === null || value === undefined) return '—';
    
    const colorClasses = {
      positive: 'text-[var(--metric-positive)]',
      negative: 'text-[var(--metric-negative)]',
      neutral: 'text-[var(--metric-value-color)]',
    };

    return cn(
      'text-[14px] font-mono font-bold',
      colorClasses[type]
    );
  },

  /* ============================================
     PAGE TITLE UTILITIES
     ============================================ */

  /**
   * Generate page title with consistent branding
   * @param pageName The name of the current page
   * @param includeBrand Whether to include "1UP SOL" branding
   */
  generatePageTitle: (pageName: string, includeBrand: boolean = true): string => {
    if (includeBrand) {
      return `${pageName} | 1UP SOL`;
    }
    return pageName;
  },

  /**
   * Generate page description for SEO
   * @param pageName The name of the current page
   * @param description Custom description for the page
   */
  generatePageDescription: (pageName: string, description?: string): string => {
    if (description) return description;
    
    const defaultDescriptions: Record<string, string> = {
      'Home': 'Level up your trading skills! Practice Solana trading, earn XP, compete on leaderboards. Real-time market data, zero financial risk.',
      'Trade': 'Trade Solana tokens with paper money. Practice trading strategies, track your performance, and compete on leaderboards.',
      'Warp Pipes Hub': 'Discover new Solana tokens as they progress from new pairs to about to graduate to bonded. Track token health, liquidity, and migration status in real-time.',
      'Portfolio': 'Track your trading performance, view your positions, and monitor your PnL. See your trading history and portfolio analytics.',
      'Leaderboard': 'Compete with other traders! See the top performers, track your ranking, and climb the leaderboard.',
      'Docs': 'Learn how to use 1UP SOL. Trading guides, feature explanations, and platform documentation.',
      'About': 'Learn about 1UP SOL - the Solana paper trading game that helps you level up your trading skills.',
    };

    return defaultDescriptions[pageName] || `Explore ${pageName} on 1UP SOL - the Solana paper trading game.`;
  },
}

/**
 * Validates if a URL is HTTPS and safe to load in production
 *
 * @param url The URL to validate
 * @returns true if URL is HTTPS or relative, false if HTTP (blocked in production)
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (url === null || url === undefined) return false;

  // Allow relative URLs (internal images)
  if (url.startsWith('/')) return true;

  // Allow data URLs
  if (url.startsWith('data:')) return true;

  // Block IP addresses with HTTP (security risk)
  if (url.match(/^http:\/\/\d+\.\d+\.\d+\.\d+/)) {
    return false;
  }

  // In production, only allow HTTPS
  if (process.env.NODE_ENV === 'production') {
    return url.startsWith('https://');
  }

  // In development, allow both HTTP and HTTPS (except IP addresses)
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Gets a safe fallback URL for images that fail HTTPS validation
 *
 * @param originalUrl The original URL that failed
 * @param fallbackUrl The fallback URL to use
 * @returns The safe URL to use
 */
export function getSafeImageUrl(originalUrl: string | null | undefined, fallbackUrl: string): string {
  if (isValidImageUrl(originalUrl)) {
    return originalUrl || fallbackUrl;
  }

  // Only log warning if URL is not null/undefined (i.e., it's an actual invalid URL)
  if (originalUrl !== null && originalUrl !== undefined) {
    // Suppress warnings for HTTP IP addresses as they're handled gracefully
    if (!originalUrl.match(/^http:\/\/\d+\.\d+\.\d+\.\d+/)) {
      console.warn('Blocked unsafe image URL in production:', originalUrl);
    }
  }

  return fallbackUrl;
}

/**
 * Creates a safe image props object with HTTPS validation
 *
 * @param src The image source URL
 * @param fallbackSrc The fallback source URL
 * @param alt The alt text
 * @returns Object with safe src and event handlers
 */
export function createSafeImageProps(
  src: string | null | undefined,
  fallbackSrc: string,
  alt: string
): {
  src: string;
  alt: string;
  onError: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  onLoad: (e: React.SyntheticEvent<HTMLImageElement>) => void;
} {
  const safeSrc = getSafeImageUrl(src, fallbackSrc);

  return {
    src: safeSrc,
    alt,
    onError: (e) => {
      const target = e.currentTarget;
      // Only replace if it's not already the fallback
      if (target.src !== fallbackSrc) {
        // Suppress warnings for HTTP IP addresses as they're handled gracefully
        if (!src?.match(/^http:\/\/\d+\.\d+\.\d+\.\d+/)) {
          console.warn('Image failed to load, using fallback:', src);
        }
        target.src = fallbackSrc;
      }
    },
    onLoad: (e) => {
      const target = e.currentTarget;
      // Double-check that loaded image is HTTPS in production
      if (process.env.NODE_ENV === 'production' && target.src && target.src.startsWith('http://')) {
        console.warn('Blocked HTTP image loaded in HTTPS context:', target.src);
        target.src = fallbackSrc;
      }
    }
  };
}
