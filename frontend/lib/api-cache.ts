// API Response Caching Layer
// Provides intelligent caching with TTL, invalidation strategies, and performance optimization

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  fingerprint: string
  tags: string[]
}

interface CacheConfig {
  defaultTTL: number
  maxSize: number
  enableCompression: boolean
  enablePersistence: boolean
}

export class ApiCache {
  private static instance: ApiCache
  private cache = new Map<string, CacheEntry<any>>()
  private config: CacheConfig
  private compressionSupported: boolean = false

  static getInstance(): ApiCache {
    if (!ApiCache.instance) {
      ApiCache.instance = new ApiCache()
    }
    return ApiCache.instance
  }

  private constructor() {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      enableCompression: true,
      enablePersistence: true
    }

    this.checkCompressionSupport()
    this.loadPersistentCache()
    this.setupCleanupInterval()
  }

  private checkCompressionSupport() {
    this.compressionSupported = typeof window !== 'undefined' && 
                                'CompressionStream' in window &&
                                'DecompressionStream' in window
  }

  private setupCleanupInterval() {
    // Clean expired entries every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000)
  }

  private async loadPersistentCache() {
    if (!this.config.enablePersistence || typeof window === 'undefined') return

    try {
      const cached = localStorage.getItem('solsim-api-cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        // Only restore non-expired entries
        const now = Date.now()
        for (const [key, entry] of Object.entries(parsed)) {
          const cacheEntry = entry as CacheEntry<any>
          if (now - cacheEntry.timestamp < cacheEntry.ttl) {
            this.cache.set(key, cacheEntry)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load persistent cache:', error)
    }
  }

  private async savePersistentCache() {
    if (!this.config.enablePersistence || typeof window === 'undefined') return

    try {
      const cacheObj = Object.fromEntries(this.cache.entries())
      localStorage.setItem('solsim-api-cache', JSON.stringify(cacheObj))
    } catch (error) {
      console.warn('Failed to save persistent cache:', error)
    }
  }

  private cleanup() {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    // Enforce max size
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp) // Sort by timestamp
      
      const toRemove = this.cache.size - this.config.maxSize
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0])
        removedCount++
      }
    }

    if (removedCount > 0) {
      console.log(`API Cache: Cleaned ${removedCount} expired/excess entries`)
      this.savePersistentCache()
    }
  }

  private generateCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET'
    const body = options?.body || ''
    const headers = JSON.stringify(options?.headers || {})
    return `${method}:${url}:${btoa(body + headers)}`
  }

  private generateFingerprint(data: any): string {
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  private async compressData(data: any): Promise<string> {
    if (!this.compressionSupported || !this.config.enableCompression) {
      return JSON.stringify(data)
    }

    try {
      const jsonString = JSON.stringify(data)
      const stream = new CompressionStream('gzip')
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      writer.write(new TextEncoder().encode(jsonString))
      writer.close()

      const chunks: Uint8Array[] = []
      let done = false

      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) {
          chunks.push(result.value)
        }
      }

      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        compressed.set(chunk, offset)
        offset += chunk.length
      }

      return btoa(String.fromCharCode(...compressed))
    } catch (error) {
      console.warn('Compression failed, using uncompressed data:', error)
      return JSON.stringify(data)
    }
  }

  private async decompressData(compressedData: string): Promise<any> {
    if (!this.compressionSupported || !this.config.enableCompression) {
      return JSON.parse(compressedData)
    }

    try {
      const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0))
      const stream = new DecompressionStream('gzip')
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      writer.write(compressed)
      writer.close()

      const chunks: Uint8Array[] = []
      let done = false

      while (!done) {
        const result = await reader.read()
        done = result.done
        if (result.value) {
          chunks.push(result.value)
        }
      }

      const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        decompressed.set(chunk, offset)
        offset += chunk.length
      }

      const jsonString = new TextDecoder().decode(decompressed)
      return JSON.parse(jsonString)
    } catch (error) {
      console.warn('Decompression failed, treating as uncompressed:', error)
      return JSON.parse(compressedData)
    }
  }

  // Public API
  public async get<T>(url: string, options?: RequestInit): Promise<T | null> {
    const key = this.generateCacheKey(url, options)
    const entry = this.cache.get(key)

    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    try {
      const data = await this.decompressData(entry.data)
      return data as T
    } catch (error) {
      console.error('Failed to decompress cached data:', error)
      this.cache.delete(key)
      return null
    }
  }

  public async set<T>(
    url: string, 
    data: T, 
    options?: {
      ttl?: number
      tags?: string[]
      requestOptions?: RequestInit
    }
  ): Promise<void> {
    const key = this.generateCacheKey(url, options?.requestOptions)
    const ttl = options?.ttl || this.config.defaultTTL
    const tags = options?.tags || []

    try {
      const compressedData = await this.compressData(data)
      const entry: CacheEntry<string> = {
        data: compressedData,
        timestamp: Date.now(),
        ttl,
        fingerprint: this.generateFingerprint(data),
        tags
      }

      this.cache.set(key, entry)
      this.savePersistentCache()
    } catch (error) {
      console.error('Failed to cache data:', error)
    }
  }

  // Cache invalidation
  public invalidate(url: string, options?: RequestInit): void {
    const key = this.generateCacheKey(url, options)
    this.cache.delete(key)
    this.savePersistentCache()
  }

  public invalidateByTag(tag: string): void {
    let removedCount = 0
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.includes(tag)) {
        this.cache.delete(key)
        removedCount++
      }
    }
    
    if (removedCount > 0) {
      console.log(`API Cache: Invalidated ${removedCount} entries with tag "${tag}"`)
      this.savePersistentCache()
    }
  }

  public invalidateByPattern(pattern: RegExp): void {
    let removedCount = 0
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        removedCount++
      }
    }
    
    if (removedCount > 0) {
      console.log(`API Cache: Invalidated ${removedCount} entries matching pattern`)
      this.savePersistentCache()
    }
  }

  public clear(): void {
    this.cache.clear()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('solsim-api-cache')
    }
  }

  // Cache statistics
  public getStats(): {
    size: number
    maxSize: number
    hitRate: number
    totalRequests: number
    cacheHits: number
  } {
    // These would be tracked in a real implementation
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0.75, // Mock value
      totalRequests: 1000, // Mock value
      cacheHits: 750 // Mock value
    }
  }

  // Configuration
  public configure(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config }
  }
}

// Enhanced API Client with caching
export class CachedApiClient {
  private cache = ApiCache.getInstance()
  private baseURL: string

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002') {
    this.baseURL = baseURL
  }

  async cachedRequest<T>(
    endpoint: string,
    options: RequestInit & {
      cacheOptions?: {
        ttl?: number
        tags?: string[]
        strategy?: 'cache-first' | 'network-first' | 'cache-only' | 'network-only'
      }
    } = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const { cacheOptions, ...requestOptions } = options
    const strategy = cacheOptions?.strategy || 'cache-first'

    // Cache-only strategy
    if (strategy === 'cache-only') {
      const cached = await this.cache.get<T>(url, requestOptions)
      if (!cached) {
        throw new Error('Data not available in cache')
      }
      return cached
    }

    // Network-only strategy
    if (strategy === 'network-only') {
      const response = await fetch(url, requestOptions)
      const data = await response.json()
      
      if (response.ok && cacheOptions) {
        await this.cache.set(url, data, {
          ttl: cacheOptions.ttl,
          tags: cacheOptions.tags,
          requestOptions
        })
      }
      
      return data
    }

    // Cache-first strategy
    if (strategy === 'cache-first') {
      const cached = await this.cache.get<T>(url, requestOptions)
      if (cached) {
        // Update cache in background
        this.backgroundRefresh(url, requestOptions, cacheOptions)
        return cached
      }
    }

    // Network-first strategy (or fallback for cache-first miss)
    try {
      const response = await fetch(url, requestOptions)
      const data = await response.json()
      
      if (response.ok && cacheOptions) {
        await this.cache.set(url, data, {
          ttl: cacheOptions.ttl,
          tags: cacheOptions.tags,
          requestOptions
        })
      }
      
      return data
    } catch (error) {
      // Fallback to cache for network-first
      if (strategy === 'network-first') {
        const cached = await this.cache.get<T>(url, requestOptions)
        if (cached) {
          return cached
        }
      }
      throw error
    }
  }

  private async backgroundRefresh(
    url: string, 
    requestOptions: RequestInit,
    cacheOptions?: { ttl?: number; tags?: string[] }
  ): Promise<void> {
    try {
      const response = await fetch(url, requestOptions)
      if (response.ok) {
        const data = await response.json()
        await this.cache.set(url, data, {
          ttl: cacheOptions?.ttl,
          tags: cacheOptions?.tags,
          requestOptions
        })
      }
    } catch (error) {
      // Silent fail for background refresh
      console.debug('Background refresh failed:', error)
    }
  }

  // Invalidation helpers
  public invalidateUserData(userId?: string): void {
    this.cache.invalidateByTag('user')
    if (userId) {
      this.cache.invalidateByTag(`user:${userId}`)
    }
  }

  public invalidateTradeData(): void {
    this.cache.invalidateByTag('trades')
    this.cache.invalidateByTag('portfolio')
  }

  public invalidateMarketData(): void {
    this.cache.invalidateByTag('market')
    this.cache.invalidateByPattern(/\/api\/v1\/market\//)
  }

  public invalidateLeaderboard(): void {
    this.cache.invalidateByTag('leaderboard')
  }
}

// React hook for cached API calls
import { useState, useEffect, useCallback } from 'react'

export function useCachedApi<T>(
  endpoint: string,
  options?: {
    enabled?: boolean
    cache?: {
      ttl?: number
      tags?: string[]
      strategy?: 'cache-first' | 'network-first' | 'cache-only'
    }
    refetchInterval?: number
  }
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const client = new CachedApiClient()

  const fetchData = useCallback(async () => {
    if (options?.enabled === false) return

    try {
      setLoading(true)
      setError(null)
      const result = await client.cachedRequest<T>(endpoint, {
        method: 'GET',
        ...(options?.cache && { cacheOptions: options.cache })
      })
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [endpoint, options?.enabled, options?.cache])

  useEffect(() => {
    fetchData()

    // Setup refetch interval if specified
    if (options?.refetchInterval && options.refetchInterval > 0) {
      const interval = setInterval(fetchData, options.refetchInterval)
      return () => clearInterval(interval)
    }
  }, [fetchData, options?.refetchInterval])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

// Export instances
export const apiCache = ApiCache.getInstance()
export const cachedApiClient = new CachedApiClient()