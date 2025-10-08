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
