/**
 * Image URL Utilities
 *
 * Helper functions for detecting and converting image URLs from various sources
 * Extracted from handleNewToken to make reusable
 */

/**
 * Check if a URL looks like an image file
 */
export function isLikelyImageUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(url);
}

/**
 * Convert IPFS, Arweave, and other decentralized storage URLs to HTTP
 */
export function convertIPFStoHTTP(url?: string | null): string | undefined {
  if (!url) return undefined;

  // Already HTTP/HTTPS
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Protocol-relative URL
  if (url.startsWith('//')) {
    return `https:${url}`;
  }

  // IPFS URLs
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '').replace(/^ipfs\//, '');
    return `https://ipfs.io/ipfs/${hash}`;
  }

  // Raw IPFS hash (46-100 characters, alphanumeric)
  if (/^[a-zA-Z0-9]{46,100}$/.test(url)) {
    return `https://ipfs.io/ipfs/${url}`;
  }

  // Arweave URLs
  if (url.startsWith('ar://')) {
    const hash = url.replace('ar://', '');
    return `https://arweave.net/${hash}`;
  }

  // DexScreener CDN (missing protocol)
  if (url.startsWith('dd.dexscreener.com')) {
    return `https://${url}`;
  }

  // Return as-is if we can't convert
  return url;
}

/**
 * Get logo URI from token metadata
 * Prefers explicit image URLs over metadata URIs
 */
export function getLogoURI(
  metadataImageUrl?: string | null,
  uri?: string | null
): string | undefined {
  // Prefer metadata image if available
  if (metadataImageUrl) {
    return convertIPFStoHTTP(metadataImageUrl);
  }

  // Only use URI if it looks like an image
  if (uri && isLikelyImageUrl(uri)) {
    return convertIPFStoHTTP(uri);
  }

  return undefined;
}
