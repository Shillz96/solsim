/**
 * Image URL normalization utilities for token logos/metadata images.
 * Converts IPFS/Arweave/custom forms into HTTPS gateways and blocks unsafe patterns.
 */

const IPFS_HTTP_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cf-ipfs.com/ipfs/',
  'https://nftstorage.link/ipfs/',
];

/**
 * Normalize a token image URL to a safe, loadable HTTPS URL.
 * - ipfs://<hash> → https://ipfs.io/ipfs/<hash>
 * - ar://<id> → https://arweave.net/<id>
 * - //host/path → https://host/path
 * - dd.dexscreener.com without protocol → https://dd.dexscreener.com/...
 * - Block http://<ip>/... images (security risk)
 * Returns null when the input is empty or unsafe.
 */
export function normalizeTokenImageUrl(input?: string | null): string | null {
  if (!input) return null;
  let url = input.trim();

  // Block obvious unsafe IP literal over http
  if (/^http:\/\/\d+\.\d+\.\d+\.\d+/.test(url)) return null;

  // Handle protocol-relative URLs
  if (url.startsWith('//')) {
    url = `https:${url}`;
  }

  // Add https for dd.dexscreener.com without protocol
  if (!/^https?:\/\//i.test(url) && url.startsWith('dd.dexscreener.com')) {
    url = `https://${url}`;
  }

  // IPFS
  if (url.startsWith('ipfs://')) {
    const hash = url.replace('ipfs://', '').replace(/^ipfs\//, '');
    return `${IPFS_HTTP_GATEWAYS[0]}${hash}`;
  }
  // Sometimes only the CID/hash is provided
  if (/^[a-zA-Z0-9]{46,100}$/.test(url)) {
    return `${IPFS_HTTP_GATEWAYS[0]}${url}`;
  }

  // Arweave
  if (url.startsWith('ar://')) {
    const id = url.replace('ar://', '');
    return `https://arweave.net/${id}`;
  }

  // If it already has http/https and is not an IP literal http, keep it
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  // Unknown scheme; as a last resort, try to coerce to https
  return `https://${url}`;
}

/**
 * Try multiple IPFS gateways for a given ipfs:// or CID.
 * Returns the first candidate URL (no network calls here; selection for callers).
 */
export function buildIpfsGatewayCandidates(ipfsRef: string): string[] {
  const ref = ipfsRef.replace('ipfs://', '').replace(/^ipfs\//, '');
  return IPFS_HTTP_GATEWAYS.map((g) => `${g}${ref}`);
}

export default {
  normalizeTokenImageUrl,
  buildIpfsGatewayCandidates,
};


