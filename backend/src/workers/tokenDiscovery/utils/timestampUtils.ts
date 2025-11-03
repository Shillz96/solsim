/**
 * Timestamp Utilities
 *
 * Helper functions for validating and converting timestamps from swap events
 * Extracted from handleSwap to make reusable
 */

import { config } from '../config/index.js';
import { loggers } from '../../../utils/logger.js';

const logger = loggers.server;

/**
 * Validate and convert timestamp to Date object
 * Handles both seconds and milliseconds timestamps
 * Validates timestamp is within reasonable bounds
 *
 * @param timestamp - Unix timestamp (seconds or milliseconds)
 * @param mint - Token mint address (for logging)
 * @returns Validated Date object, or current date as fallback
 */
export function validateAndConvertTimestamp(timestamp: number, mint?: string): Date {
  try {
    // Convert to milliseconds if timestamp is in seconds
    // Year 2100 in seconds = 4102444800
    const timestampMs = timestamp > config.validation.TIMESTAMP_EPOCH_THRESHOLD
      ? timestamp
      : timestamp * 1000;

    const date = new Date(timestampMs);

    // Validate date is reasonable (between MIN_YEAR and MAX_YEAR)
    const year = date.getFullYear();
    if (year < config.validation.MIN_TIMESTAMP_YEAR || year > config.validation.MAX_TIMESTAMP_YEAR) {
      logger.warn({
        mint: mint ? mint.slice(0, 8) : 'unknown',
        timestamp,
        parsed: date.toISOString(),
        year,
      }, 'Invalid timestamp - outside valid year range');

      return new Date(); // Fallback to current time
    }

    return date;
  } catch (error) {
    logger.error({
      timestamp,
      mint: mint ? mint.slice(0, 8) : 'unknown',
      error,
    }, 'Error parsing timestamp');

    return new Date(); // Fallback to current time
  }
}

/**
 * Check if a date is within a certain window from now
 * @param date - Date to check
 * @param windowMs - Window in milliseconds
 * @returns true if date is within window
 */
export function isWithinWindow(date: Date, windowMs: number): boolean {
  const now = Date.now();
  const timeSince = now - date.getTime();
  return timeSince < windowMs;
}

/**
 * Calculate age in minutes from a date
 * @param date - Date to calculate from
 * @returns Age in minutes
 */
export function getAgeMinutes(date: Date): number {
  return (Date.now() - date.getTime()) / 60000;
}
