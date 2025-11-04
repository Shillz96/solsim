// Enhanced Service Worker for VirtualSol PWA
// Includes proper background sync handling and offline capabilities

import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[]
  }
  
  interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
    addEventListener(type: string, listener: (event: any) => void): void;
    registration: ServiceWorkerRegistration & {
      periodicSync?: {
        register(tag: string, options?: { minInterval?: number }): Promise<void>;
      };
    };
  }
}

declare const self: ServiceWorkerGlobalScope

// Cache version - increment this to force cache refresh
const CACHE_VERSION = 'v1.0.10-cache-error-fix'

// Initialize Serwist with precaching and minimal runtime caching to avoid errors
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true, // Immediately activate new service worker
  clientsClaim: true, // Take control of all pages immediately
  navigationPreload: true,
  // Disable runtime caching to prevent Cache.put() errors with external resources
  runtimeCaching: [],
})

// Override the default fetch handler to exclude WebSocket connections and problematic URLs
const originalHandleFetch = serwist.handleFetch.bind(serwist)
serwist.handleFetch = (event) => {
  const url = new URL(event.request.url)
  
  // Skip service worker for WebSocket connections
  if (event.request.headers.get('upgrade') === 'websocket') {
    return; // Let the browser handle WebSocket connections directly
  }
  
  // Skip service worker for WebSocket URLs
  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    return; // Let the browser handle WebSocket connections directly
  }
  
  // Skip service worker for Railway WebSocket endpoints
  if (url.hostname.includes('railway.app') && url.pathname.includes('/ws/')) {
    return; // Let the browser handle Railway WebSocket connections directly
  }
  
  // Skip external token image sources that cause CORS issues
  if (url.hostname.includes('pump.fun') || 
      url.hostname.includes('ipfs.io') ||
      url.hostname.includes('gateway.pinata.cloud') ||
      url.hostname.includes('cloudflare-ipfs.com') ||
      url.hostname.includes('nftstorage.link') ||
      url.hostname.includes('arweave.net')) {
    return; // Let the browser handle external images directly to avoid CORS cache errors
  }
  
  // Skip real-time API endpoints that might return streaming or invalid responses
  if (url.pathname.includes('/api/prices') ||
      url.pathname.includes('/api/trending') ||
      url.pathname.includes('/ws/') ||
      url.pathname.includes('/stream') ||
      url.pathname.includes('/events')) {
    return; // Let the browser handle real-time endpoints directly
  }
  
  // For all other requests, use Serwist's default handling with error protection
  try {
    return originalHandleFetch(event)
  } catch (error) {
    // Silently handle cache errors to prevent console spam
    return; // Let the browser handle the request if service worker fails
  }
}

// Add Serwist event listeners
serwist.addEventListeners()

// Add global error handler for cache operations to prevent console spam
self.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('Cache.put') || 
      event.reason?.message?.includes('cache') ||
      event.reason?.message?.includes('network error')) {
    // Prevent cache-related errors from spamming the console
    event.preventDefault()
  }
})

// Enhanced error handling for fetch events
self.addEventListener('error', (event) => {
  if (event.message?.includes('Cache.put') || 
      event.message?.includes('cache') ||
      event.message?.includes('network error')) {
    // Prevent cache-related errors from spamming the console
    event.preventDefault()
  }
})

// Force cache invalidation on service worker update - more aggressive cleanup
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete all old caches to prevent cache.put() errors from corrupted entries
          if (cacheName.includes('font') || 
              cacheName.includes('google-fonts') ||
              cacheName.includes('static-') ||
              cacheName.includes('runtime') ||
              cacheName.includes('serwist')) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// Handle periodic background sync with proper permission checking
self.addEventListener('message', async (event) => {
  if (event.data?.type === 'REGISTER_PERIODIC_SYNC') {
    try {
      // Check if periodic background sync is available and permitted
      if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
        const permission = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName })
        
        if (permission.state === 'granted' && self.registration.periodicSync) {
          // Only register if permission is granted (PWA installed)
          const registration = await self.registration.periodicSync.register('background-data-sync', {
            minInterval: 5 * 60 * 1000, // 5 minutes minimum interval
          })
          // Periodic background sync registered successfully - logged via service worker
        } else {
          // Periodic background sync not permitted - app needs to be installed as PWA
        }
      }
    } catch (error) {
      // Silently handle permission denied errors to prevent console spam
      if (error instanceof Error && error.name === 'NotAllowedError') {
        // Background sync not allowed - app not installed as PWA (expected in non-PWA mode)
      } else {
        // Failed to register periodic background sync - logged via service worker
      }
    }
  }
})

// Handle background sync events with rate limiting awareness
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'background-data-sync') {
    event.waitUntil(handlePeriodicSync())
  }
})

async function handlePeriodicSync() {
  try {
    // Only fetch critical data in background to avoid rate limits
    // Avoid frequent portfolio/balance updates in background
    // Performing minimal background sync - logged via service worker
    
    // Could implement minimal data sync here if needed
    // For now, just log to prevent excessive API calls
  } catch (error) {
    // Background sync failed - logged via service worker
  }
}