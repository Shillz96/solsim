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
      import('./error-logger').then(({ errorLogger }) => {
        errorLogger.warn('Failed to load persistent cache', {
          error: error as Error,
          action: 'persistent_cache_load_failed',
          metadata: { component: 'ApiCache' }
        })
      })
    }
  }

  private async savePersistentCache() {
    if (!this.config.enablePersistence || typeof window === 'undefined') return

    try {
      const cacheObj = Object.fromEntries(this.cache.entries())
      localStorage.setItem('solsim-api-cache', JSON.stringify(cacheObj))
    } catch (error) {
      import('./error-logger').then(({ errorLogger }) => {
        errorLogger.warn('Failed to save persistent cache', {
          error: error as Error,
          action: 'persistent_cache_save_failed',
          metadata: { component: 'ApiCache' }
        })
      })
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
      import('./error-logger').then(({ errorLogger }) => {
        errorLogger.info('API Cache cleaned expired entries', {
          action: 'cache_cleanup',
          metadata: { removedCount, component: 'ApiCache' }
        })
      })
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
      import('./error-logger').then(({ errorLogger }) => {
        errorLogger.warn('Compression failed, using uncompressed data', {
          error: error as Error,
          action: 'cache_compression_failed',
          metadata: { component: 'ApiCache' }
        })
      })
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
      import('./error-logger').then(({ errorLogger }) => {
        errorLogger.warn('Decompression failed, treating as uncompressed', {
          error: error as Error,
          action: 'cache_decompression_failed',
          metadata: { component: 'ApiCache' }
        })
      })
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
      import('./error-logger').then(({ errorLogger }) => {
        errorLogger.error('Failed to decompress cached data', {
          error: error as Error,
          action: 'cache_decompression_error',
          metadata: { key, component: 'ApiCache' }
        })
      })
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
      import('./error-logger').then(({ errorLogger }) => {
        errorLogger.error('Failed to cache data', {
          error: error as Error,
          action: 'cache_set_failed',
          metadata: { key, component: 'ApiCache' }
        })
      })
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
      import('./error-logger').then(({ errorLogger }) => {
        errorLogger.info('API Cache invalidated entries by tag', {
          action: 'cache_invalidated_by_tag',
          metadata: { tag, removedCount, component: 'ApiCache' }
        })
      })
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
      import('./error-logger').then(({ errorLogger }) => {
        errorLogger.info('API Cache invalidated entries by pattern', {
          action: 'cache_invalidated_by_pattern',
          metadata: { pattern: pattern.toString(), removedCount, component: 'ApiCache' }
        })
      })
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

// Note: CachedApiClient and useCachedApi removed - React Query now handles all caching needs
// with superior performance, deduplication, background updates, and error handling

// Export singleton instance for basic caching needs
export const apiCache = ApiCache.getInstance()