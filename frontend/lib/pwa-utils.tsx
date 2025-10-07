// PWA Service Worker Registration and Management
// Handles service worker lifecycle, updates, and offline capabilities

'use client'

import React, { useEffect, useState } from 'react'

interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAHookReturn {
  isInstallable: boolean
  isInstalled: boolean
  isUpdateAvailable: boolean
  isOffline: boolean
  install: () => Promise<void>
  skipWaiting: () => void
}

// Custom hook for PWA functionality
export function usePWA(): PWAHookReturn {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)
  const [isOffline, setIsOffline] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallPrompt | null>(null)

  useEffect(() => {
    // Check if already installed
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches)

    // Check initial online status
    setIsOffline(!navigator.onLine)

    // Register service worker (skip in development)
    if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'development') {
      registerServiceWorker()
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as PWAInstallPrompt)
      setIsInstallable(true)
    }

    // Listen for online/offline status
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const registerServiceWorker = async () => {
    // Skip service worker registration in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Service Worker skipped in development mode')
      return
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })

      // Check for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              setIsUpdateAvailable(true)
            }
          })
        }
      })

      // Handle messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          setIsUpdateAvailable(true)
        }
      })

      console.log('🔧 Service Worker registered successfully')
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
    }
  }

  const install = async (): Promise<void> => {
    if (!deferredPrompt) return

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
        console.log('📱 PWA installed successfully')
      }
      
      setDeferredPrompt(null)
    } catch (error) {
      console.error('❌ PWA installation failed:', error)
    }
  }

  const skipWaiting = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
      setIsUpdateAvailable(false)
      // Reload after a short delay to ensure new SW is active
      setTimeout(() => window.location.reload(), 100)
    }
  }

  return {
    isInstallable,
    isInstalled,
    isUpdateAvailable,
    isOffline,
    install,
    skipWaiting,
  }
}

// PWA Provider Component for global state
export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Skip PWA features in development
    if (process.env.NODE_ENV === 'development') {
      return
    }
    
    // Enable periodic background sync if supported
    if ('serviceWorker' in navigator && 'periodicSync' in (window as any).ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return (registration as any).periodicSync.register('portfolio-sync', {
          minInterval: 5 * 60 * 1000, // 5 minutes
        })
      }).catch((error) => {
        console.warn('Periodic background sync not supported:', error)
      })
    }
  }, [])

  if (!mounted) return null

  return <>{children}</>
}

// Utility functions for service worker communication
export const swUtils = {
  // Send message to service worker
  postMessage: (message: any) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message)
    }
  },

  // Cache portfolio data manually
  cachePortfolioData: (data: any) => {
    swUtils.postMessage({
      type: 'CACHE_PORTFOLIO',
      data: data,
    })
  },

  // Request background sync
  requestBackgroundSync: (tag: string) => {
    if ('serviceWorker' in navigator && 'sync' in (window as any).ServiceWorkerRegistration.prototype) {
      navigator.serviceWorker.ready.then((registration) => {
        return (registration as any).sync.register(tag)
      })
    }
  },

  // Check if offline
  isOffline: () => !navigator.onLine,

  // Get cached response
  getCachedResponse: async (url: string) => {
    if ('caches' in window) {
      const cache = await caches.open('portfolio-data')
      return await cache.match(url)
    }
    return null
  },
}

// PWA Install Prompt Component
export function PWAInstallPrompt() {
  const { isInstallable, install } = usePWA()
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (isInstallable) {
      // Show prompt after a delay
      const timer = setTimeout(() => setShowPrompt(true), 5000)
      return () => clearTimeout(timer)
    }
  }, [isInstallable])

  if (!showPrompt || !isInstallable) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div className="bg-card border border-border rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="h-5 w-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zM12 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1V4zM12 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Install SolSim</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Add to your home screen for offline trading and faster access
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={install}
                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={() => setShowPrompt(false)}
                className="text-xs bg-muted text-muted-foreground px-3 py-1.5 rounded-md hover:bg-muted/80 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// PWA Update Prompt Component
export function PWAUpdatePrompt() {
  const { isUpdateAvailable, skipWaiting } = usePWA()

  if (!isUpdateAvailable) return null

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50">
      <div className="bg-primary text-primary-foreground rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Update Available</h3>
            <p className="text-xs opacity-90 mt-1">
              A new version of SolSim is ready with improvements and fixes
            </p>
            <button
              onClick={skipWaiting}
              className="text-xs bg-white/20 px-3 py-1.5 rounded-md hover:bg-white/30 transition-colors mt-2"
            >
              Update Now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}