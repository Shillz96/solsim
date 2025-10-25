/**
 * Chat Content Sanitization Utility
 *
 * Sanitizes user chat messages to prevent:
 * - XSS attacks (HTML/script injection)
 * - Unicode confusables and zero-width characters
 * - Excessive whitespace and malformed content
 * - Phishing patterns
 * 
 * IMPORTANT: Allows native emojis (Unicode emoji ranges) for user expression
 */

/**
 * Sanitize chat message content
 * @param content - Raw message content from user
 * @returns Sanitized content safe for display
 */
export function sanitizeChatMessage(content: string): string {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid message content');
  }

  let sanitized = content;

  // 1. Trim whitespace
  sanitized = sanitized.trim();

  // 2. Limit length to 280 characters (Twitter-style)
  // Note: Emojis are counted as they appear (some take 2+ chars)
  if (sanitized.length > 280) {
    sanitized = sanitized.substring(0, 280);
  }

  // 3. Remove zero-width characters and invisible Unicode (but keep emojis)
  sanitized = removeInvisibleCharacters(sanitized);

  // 4. Strip HTML tags (basic sanitization)
  sanitized = stripHtmlTags(sanitized);

  // 5. Normalize whitespace (collapse multiple spaces)
  sanitized = sanitized.replace(/\s+/g, ' ');

  // 6. Check for empty message after sanitization
  if (sanitized.length === 0) {
    throw new Error('Message is empty after sanitization');
  }

  return sanitized;
}

/**
 * Remove zero-width and other invisible Unicode characters
 */
function removeInvisibleCharacters(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Zero-width spaces
    .replace(/[\u202A-\u202E]/g, '') // Bidirectional text controls
    .replace(/[\u2060-\u2069]/g, '') // Word joiners and invisible separators
    .replace(/[\u180E]/g, '') // Mongolian vowel separator
    .replace(/[\u00AD]/g, ''); // Soft hyphen
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

/**
 * Check if message contains suspicious phishing patterns
 * @param content - Sanitized message content
 * @returns true if message looks suspicious
 */
export function containsPhishingPattern(content: string): boolean {
  const phishingPatterns = [
    /airdrop.*claim/i,
    /free.*\$\d+/i,
    /congratulations.*won/i,
    /click.*here.*verify/i,
    /urgent.*account.*suspended/i,
    /metamask.*wallet.*connect/i,
    /phantom.*wallet.*verify/i,
  ];

  return phishingPatterns.some(pattern => pattern.test(content));
}

/**
 * Check if message contains links
 * @param content - Message content
 * @returns true if message contains URLs
 */
export function containsLinks(content: string): boolean {
  const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\w+\.(com|net|org|io|xyz|fun)[^\s]*)/gi;
  return urlPattern.test(content);
}

/**
 * Extract links from message
 * @param content - Message content
 * @returns Array of URLs found in message
 */
export function extractLinks(content: string): string[] {
  const urlPattern = /(https?:\/\/[^\s]+)/gi;
  const matches = content.match(urlPattern);
  return matches || [];
}

/**
 * Check if links are from allowlist (for future use)
 */
export function isAllowedDomain(url: string): boolean {
  const allowedDomains = [
    'twitter.com',
    'x.com',
    'solscan.io',
    'jup.ag',
    'dexscreener.com',
    'birdeye.so',
    'pump.fun',
  ];

  try {
    const urlObj = new URL(url);
    return allowedDomains.some(domain => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Calculate message hash for duplicate detection
 * @param userId - User ID
 * @param content - Message content
 * @returns Hash string for Redis deduplication
 */
export function getMessageHash(userId: string, content: string): string {
  // Simple hash: userId + lowercase content (normalized)
  const normalized = content.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${userId}:${normalized}`;
}
