/**
 * Image URL Validation Utility
 * 
 * Validates image URLs to prevent INVALID_IMAGE_OPTIMIZE_REQUEST errors
 * in Next.js Image components. Use this helper before passing any dynamic
 * URL to next/image.
 */

/**
 * Validates that a URL is safe for Next.js Image optimization
 * 
 * @param url - The URL to validate (can be string, null, or undefined)
 * @returns Valid URL string or null if invalid
 * 
 * @example
 * ```tsx
 * <Image 
 *   src={validateImageUrl(token.logoURI) || "/placeholder.svg"} 
 *   alt="Token"
 * />
 * ```
 */
export function validateImageUrl(url?: string | null): string | null {
  // Must be a non-empty string
  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return null;
  }

  // Must start with http:// or https:// (or be a relative path starting with /)
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/')) {
    return null;
  }

  // For absolute URLs, do basic validation
  if (trimmed.startsWith('http')) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      // Invalid URL format
      return null;
    }
  }

  // Relative paths are OK
  return trimmed;
}

/**
 * Gets a validated image URL with fallback
 * 
 * @param url - The URL to validate
 * @param fallback - Fallback URL if validation fails (default: "/placeholder-token.svg")
 * @returns Valid URL or fallback
 * 
 * @example
 * ```tsx
 * <Image 
 *   src={getValidImageUrl(token.logoURI)} 
 *   alt="Token"
 * />
 * ```
 */
export function getValidImageUrl(url?: string | null, fallback = "/placeholder-token.svg"): string {
  return validateImageUrl(url) || fallback;
}
