// Offline Utilities for Client-side Offline Support
// Handles offline detection, data storage, and sync registration

export class OfflineManager {
  private static instance: OfflineManager
  private isOnline: boolean = true
  private offlineCallbacks: Set<() => void> = new Set()
  private onlineCallbacks: Set<() => void> = new Set()
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager()
    }
    return OfflineManager.instance
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      this.setupEventListeners()
      this.registerServiceWorker()
    }
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      console.log('App is back online')
      this.isOnline = true
      this.triggerSync()
      this.notifyOnlineCallbacks()
    })

    window.addEventListener('offline', () => {
      console.log('App is offline')
      this.isOnline = false
      this.notifyOfflineCallbacks()
    })
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')
        this.serviceWorkerRegistration = registration
        console.log('Service Worker registered successfully')
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker installed, prompt user to refresh
                this.notifyServiceWorkerUpdate()
              }
            })
          }
        })
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }
  }

  private notifyServiceWorkerUpdate() {
    // Dispatch custom event for components to handle
    window.dispatchEvent(new CustomEvent('sw:update-available'))
  }

  private triggerSync() {
    if (this.serviceWorkerRegistration && 'serviceWorker' in navigator) {
      try {
        // Trigger background sync for offline data
        (this.serviceWorkerRegistration as any).sync?.register('offline-trades-sync')
        .catch((error: any) => console.warn('Background sync register failed:', error));
        (this.serviceWorkerRegistration as any).sync?.register('offline-profile-sync')
        .catch((error: any) => console.warn('Background sync register failed:', error))
      } catch (error) {
        console.warn('Background sync not supported:', error)
      }
    }
  }

  private notifyOfflineCallbacks() {
    this.offlineCallbacks.forEach(callback => callback())
  }

  private notifyOnlineCallbacks() {
    this.onlineCallbacks.forEach(callback => callback())
  }

  // Public API
  public getOnlineStatus(): boolean {
    return this.isOnline
  }

  public onOffline(callback: () => void): () => void {
    this.offlineCallbacks.add(callback)
    return () => this.offlineCallbacks.delete(callback)
  }

  public onOnline(callback: () => void): () => void {
    this.onlineCallbacks.add(callback)
    return () => this.onlineCallbacks.delete(callback)
  }

  // Store data for offline sync
  public async storeOfflineTrade(tradeData: any, token: string): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const db = await this.openOfflineDB()
      const transaction = db.transaction(['trades'], 'readwrite')
      const store = transaction.objectStore('trades')
      
      await store.add({
        data: tradeData,
        token: token,
        timestamp: Date.now(),
        type: 'trade'
      })
      
      console.log('Offline trade stored successfully')
    } catch (error) {
      console.error('Failed to store offline trade:', error)
      throw error
    }
  }

  public async storeOfflineProfileUpdate(profileData: any, token: string): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const db = await this.openOfflineDB()
      const transaction = db.transaction(['profileUpdates'], 'readwrite')
      const store = transaction.objectStore('profileUpdates')
      
      await store.add({
        data: profileData,
        token: token,
        timestamp: Date.now(),
        type: 'profile'
      })
      
      console.log('Offline profile update stored successfully')
    } catch (error) {
      console.error('Failed to store offline profile update:', error)
      throw error
    }
  }

  public async getCachedData(url: string): Promise<any | null> {
    if (typeof window === 'undefined') return null

    try {
      const db = await this.openOfflineDB()
      const transaction = db.transaction(['cachedData'], 'readonly')
      const store = transaction.objectStore('cachedData')
      
      return new Promise<any>((resolve, reject) => {
        const request = store.get(url)
        request.onsuccess = () => {
          const result = request.result
          if (result && Date.now() - result.timestamp < 5 * 60 * 1000) { // 5 minutes
            resolve(result.data)
          } else {
            resolve(null)
          }
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get cached data:', error)
      return null
    }
  }

  public async storeCachedData(url: string, data: any, type: string = 'api'): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      const db = await this.openOfflineDB()
      const transaction = db.transaction(['cachedData'], 'readwrite')
      const store = transaction.objectStore('cachedData')
      
      return new Promise<void>((resolve, reject) => {
        const request = store.put({
          url: url,
          data: data,
          type: type,
          timestamp: Date.now()
        })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to store cached data:', error)
    }
  }

  private openOfflineDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('SolSimOffline', 2)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        if (!db.objectStoreNames.contains('trades')) {
          const tradeStore = db.createObjectStore('trades', { keyPath: 'id', autoIncrement: true })
          tradeStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('profileUpdates')) {
          const profileStore = db.createObjectStore('profileUpdates', { keyPath: 'id', autoIncrement: true })
          profileStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
        
        if (!db.objectStoreNames.contains('cachedData')) {
          const cacheStore = db.createObjectStore('cachedData', { keyPath: 'url' })
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false })
          cacheStore.createIndex('type', 'type', { unique: false })
        }
      }
    })
  }

  // Get pending offline items count
  public async getPendingItemsCount(): Promise<{trades: number, profileUpdates: number}> {
    if (typeof window === 'undefined') return { trades: 0, profileUpdates: 0 }

    try {
      const db = await this.openOfflineDB()
      
      const tradesTransaction = db.transaction(['trades'], 'readonly')
      const tradesStore = tradesTransaction.objectStore('trades')
      const tradesCount = await this.countItems(tradesStore)
      
      const profileTransaction = db.transaction(['profileUpdates'], 'readonly')
      const profileStore = profileTransaction.objectStore('profileUpdates')
      const profileCount = await this.countItems(profileStore)
      
      return { trades: tradesCount, profileUpdates: profileCount }
    } catch (error) {
      console.error('Failed to get pending items count:', error)
      return { trades: 0, profileUpdates: 0 }
    }
  }

  private countItems(store: IDBObjectStore): Promise<number> {
    return new Promise((resolve, reject) => {
      const request = store.count()
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }
}

// React hook for offline status
import { useState, useEffect } from 'react'

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingItems, setPendingItems] = useState({ trades: 0, profileUpdates: 0 })

  useEffect(() => {
    const offlineManager = OfflineManager.getInstance()
    setIsOnline(offlineManager.getOnlineStatus())

    const unsubscribeOffline = offlineManager.onOffline(() => {
      setIsOnline(false)
    })

    const unsubscribeOnline = offlineManager.onOnline(() => {
      setIsOnline(true)
      // Refresh pending items when back online
      updatePendingItems()
    })

    const updatePendingItems = async () => {
      const items = await offlineManager.getPendingItemsCount()
      setPendingItems(items)
    }

    updatePendingItems()

    // Update pending items periodically
    const interval = setInterval(updatePendingItems, 30000) // 30 seconds

    return () => {
      unsubscribeOffline()
      unsubscribeOnline()
      clearInterval(interval)
    }
  }, [])

  return { isOnline, pendingItems }
}

// Export singleton instance
export const offlineManager = OfflineManager.getInstance()