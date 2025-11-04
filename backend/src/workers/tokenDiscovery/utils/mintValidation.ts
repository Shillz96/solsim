/**
 * Mint Address Validation Utilities
 * 
 * Centralized validation logic for Solana mint addresses
 * to prevent invalid tokens from entering the database
 */

/**
 * Validates if a mint address has the correct Solana format
 * @param mint - The mint address to validate
 * @returns true if valid, false otherwise
 */
export function isValidSolanaMintAddress(mint: string): boolean {
  if (!mint) return false;
  
  // Solana addresses are 32-44 characters, base58 encoded
  const isValidFormat = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(mint);

  // FIXED: Removed invalid suffix check - Pump.fun tokens legitimately end in "pump"
  // Example: 75DKSGUgWXDfE7BSKzGgzX6fxbrYzX3x74ESCPCRpump is a valid address

  // Additional validation: reject addresses that are clearly malformed
  const hasInvalidPatterns = mint.includes('undefined') ||
                           mint.includes('null') ||
                           mint.includes(' ') ||
                           mint.length < 32 ||
                           mint.length > 44;

  return isValidFormat && !hasInvalidPatterns;
}

/**
 * Validates and logs invalid mint addresses
 * @param mint - The mint address to validate
 * @param logger - Logger instance for error reporting
 * @param context - Additional context for logging
 * @returns true if valid, false otherwise
 */
export function validateMintWithLogging(
  mint: string,
  logger: any,
  context: Record<string, any> = {}
): boolean {
  if (!isValidSolanaMintAddress(mint)) {
    // Log validation failures for monitoring
    // Note: Removed hasInvalidSuffix check - Pump.fun tokens can end in "pump"
    logger.debug({
      mint,
      mintLength: mint.length,
      ...context
    }, 'Invalid mint address format - rejecting token');
    return false;
  }

  return true;
}