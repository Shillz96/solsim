/**
 * Chat Content Sanitization Utility
 *
 * Sanitizes user chat messages to prevent:
 * - XSS attacks (HTML/script injection)
 * - Unicode confusables and zero-width characters
 * - Excessive whitespace and malformed content
 * - Phishing patterns
 * 
 * Allows native emojis (Unicode emoji ranges) for user expression
 */

// Constants
const MAX_MESSAGE_LENGTH = 280;

const PHISHING_PATTERNS = [
  /airdrop.*claim/i,
  /free.*\$\d+/i,
  /congratulations.*won/i,
  /click.*here.*verify/i,
  /urgent.*account.*suspended/i,
  /metamask.*wallet.*connect/i,
  /phantom.*wallet.*verify/i,
];

const ALLOWED_DOMAINS = [
  'twitter.com',
  'x.com',
  'solscan.io',
  'jup.ag',
  'dexscreener.com',
  'birdeye.so',
  'pump.fun',
];

// Regular Expressions
const INVISIBLE_CHARS_REGEX = /[\u200B-\u200D\uFEFF\u202A-\u202E\u2060-\u2069\u180E\u00AD]/g;
const HTML_TAGS_REGEX = /<[^>]*>/g;
const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\w+\.(com|net|org|io|xyz|fun)[^\s]*)/gi;

/**
 * Sanitize chat message content
 */
export function sanitizeChatMessage(content: string): string {
  if (!content || typeof content !== 'string') {
    throw new Error('Invalid message content');
  }

  let sanitized = content.trim();

  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    sanitized = sanitized.substring(0, MAX_MESSAGE_LENGTH);
  }

  sanitized = removeInvisibleCharacters(sanitized);
  sanitized = stripHtmlTags(sanitized);
  sanitized = sanitized.replace(/\s+/g, ' ');

  if (sanitized.length === 0) {
    throw new Error('Message is empty after sanitization');
  }

  return sanitized;
}

/**
 * Remove zero-width and invisible Unicode characters
 */
function removeInvisibleCharacters(text: string): string {
  return text.replace(INVISIBLE_CHARS_REGEX, '');
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(text: string): string {
  return text.replace(HTML_TAGS_REGEX, '');
}

/**
 * Check if message contains suspicious phishing patterns
 */
export function containsPhishingPattern(content: string): boolean {
  return PHISHING_PATTERNS.some(pattern => pattern.test(content));
}

/**
 * Check if message contains links
 */
export function containsLinks(content: string): boolean {
  return URL_REGEX.test(content);
}

/**
 * Extract links from message
 */
export function extractLinks(content: string): string[] {
  const matches = content.match(/(https?:\/\/[^\s]+)/gi);
  return matches || [];
}

/**
 * Check if URL is from allowed domain list
 */
export function isAllowedDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Generate message hash for duplicate detection
 */
export function getMessageHash(userId: string, content: string): string {
  const normalized = content.toLowerCase().trim().replace(/\s+/g, ' ');
  return `${userId}:${normalized}`;
}
