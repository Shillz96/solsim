// Optimized API Client for SolSim Frontend
// Streamlined for high-volume traffic with unified rate limiting

import type { ApiResponse, ApiError as IApiError } from './types/api-types'
import { errorLogger } from './error-logger'
import { rateLimitManager } from './unified-rate-limit-manager'
import { performanceMonitor } from './performance-monitor'

export class ApiError extends Error implements IApiError {
  public status: number
  public code?: string
  public retryAfter?: number

  constructor(message: string, status: number, code?: string, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

class ApiClient {
  private baseURL: string
  private authToken: string | null = null
  private refreshPromise: Promise<string> | null = null

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002') {
    this.baseURL = baseURL
    
    // Load token on client side only
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('auth_token')
    }
  }

  setAuthToken(token: string) {
    this.authToken = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  clearAuth() {
    this.authToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Check unified rate limit manager FIRST
    if (!rateLimitManager.isRequestAllowed(endpoint)) {
      const delay = rateLimitManager.getRetryDelay(endpoint)
      throw new ApiError(
        `Endpoint temporarily unavailable. Please retry in ${Math.ceil(delay / 1000)} seconds.`,
        429,
        'RATE_LIMIT_BLOCKED',
        Math.ceil(delay / 1000)
      )
    }

    const url = `${this.baseURL}${endpoint}`
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...options.headers,
    })

    // Development mode: Add dev headers instead of auth token
    const isDevBypass = process.env.NEXT_PUBLIC_DEV_BYPASS === 'true'
    if (isDevBypass) {
      headers.set('x-dev-user-id', 'dev-user-1')
      headers.set('x-dev-email', 'dev-user-1@dev.local')
    } else if (this.authToken) {
      headers.set('Authorization', `Bearer ${this.authToken}`)
    }

    const startTime = Date.now()

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })
      
      const duration = Date.now() - startTime

      // Handle 401 Unauthorized - attempt token refresh (only in production)
      if (response.status === 401 && !isDevBypass && this.authToken && endpoint !== '/api/v1/auth/refresh') {
        try {
          if (!this.refreshPromise) {
            this.refreshPromise = this.refreshToken()
          }
          
          const newToken = await this.refreshPromise
          
          // Retry with new token
          headers.set('Authorization', `Bearer ${newToken}`)
          const retryResponse = await fetch(url, { ...options, headers })
          const retryData: ApiResponse<T> = await retryResponse.json()
          
          if (retryResponse.ok && retryData.success) {
            return retryData.data as T
          }
        } catch (refreshError) {
          this.clearAuth()
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:token-expired'))
          }
        } finally {
          this.refreshPromise = null
        }
      }

      const data: ApiResponse<T> = await response.json()

      if (!response.ok) {
        // Extract retry information for 429 errors
        const retryAfter = response.headers.get('Retry-After') || 
                          response.headers.get('RateLimit-Reset') ||
                          (data as any).retryAfter
        
        const apiError = new ApiError(
          data.error || `HTTP ${response.status}`,
          response.status,
          data.error,
          retryAfter ? parseInt(retryAfter.toString()) : undefined
        )
        
        // Record in unified rate limit manager
        if (response.status === 429) {
          rateLimitManager.recordRateLimitError(endpoint, apiError.retryAfter)
          performanceMonitor.recordApiCall(endpoint, duration, false, response.status)
          
          errorLogger.apiError(endpoint, apiError, {
            metadata: { 
              statusCode: response.status,
              retryAfter: apiError.retryAfter,
              blockedEndpoints: rateLimitManager.getBlockedEndpoints()
            }
          })
        } else {
          errorLogger.apiError(endpoint, apiError, {
            metadata: { statusCode: response.status }
          })
          performanceMonitor.recordApiCall(endpoint, duration, false, response.status)
        }
        
        throw apiError
      }

      if (!data.success) {
        const apiError = new ApiError(
          data.error || 'Request failed',
          response.status,
          data.error
        )
        
        errorLogger.apiError(endpoint, apiError, {
          metadata: { statusCode: response.status }
        })
        performanceMonitor.recordApiCall(endpoint, duration, false, response.status)
        throw apiError
      }

      // Success - reset rate limit state
      rateLimitManager.recordSuccess(endpoint)
      performanceMonitor.recordApiCall(endpoint, duration, true, response.status)
      
      return data.data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Network error
      const networkError = new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      )
      
      errorLogger.apiError(endpoint, networkError, {
        metadata: { errorType: 'network_error' }
      })
      performanceMonitor.recordApiCall(endpoint, 0, false, 0)
      performanceMonitor.recordError('network')
      
      throw networkError
    }
  }

  private async refreshToken(): Promise<string> {
    if (!this.authToken) {
      throw new Error('No token to refresh')
    }

    const refreshResponse = await fetch(`${this.baseURL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!refreshResponse.ok) {
      throw new Error('Token refresh failed')
    }
    
    const refreshData = await refreshResponse.json()
    
    if (!refreshData.success || !refreshData.data?.token) {
      throw new Error('Invalid refresh response')
    }
    
    const newToken = refreshData.data.token
    this.setAuthToken(newToken)
    return newToken
  }

  // HTTP methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    // Check unified rate limit manager FIRST
    if (!rateLimitManager.isRequestAllowed(endpoint)) {
      const delay = rateLimitManager.getRetryDelay(endpoint)
      throw new ApiError(
        `Endpoint temporarily unavailable. Please retry in ${Math.ceil(delay / 1000)} seconds.`,
        429,
        'RATE_LIMIT_BLOCKED',
        Math.ceil(delay / 1000)
      )
    }

    const url = `${this.baseURL}${endpoint}`
    const headers = new Headers()

    // Reuse authentication logic
    const isDevBypass = process.env.NEXT_PUBLIC_DEV_BYPASS === 'true'
    if (isDevBypass) {
      headers.set('x-dev-user-id', 'dev-user-1')
      headers.set('x-dev-email', 'dev-user-1@dev.local')
    } else if (this.authToken) {
      headers.set('Authorization', `Bearer ${this.authToken}`)
    }

    const startTime = Date.now()

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      })
      
      const duration = Date.now() - startTime
      const data: ApiResponse<T> = await response.json()

      if (!response.ok) {
        const apiError = new ApiError(
          data.error || `HTTP ${response.status}`,
          response.status,
          data.error
        )
        
        errorLogger.apiError(endpoint, apiError, {
          metadata: { statusCode: response.status }
        })
        performanceMonitor.recordApiCall(endpoint, duration, false, response.status)
        throw apiError
      }

      if (!data.success) {
        const apiError = new ApiError(
          data.error || 'Upload failed',
          response.status,
          data.error
        )
        
        errorLogger.apiError(endpoint, apiError, {
          metadata: { statusCode: response.status }
        })
        performanceMonitor.recordApiCall(endpoint, duration, false, response.status)
        throw apiError
      }

      // Success - reset rate limit state
      rateLimitManager.recordSuccess(endpoint)
      performanceMonitor.recordApiCall(endpoint, duration, true, response.status)
      
      return data.data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      const networkError = new ApiError(
        error instanceof Error ? error.message : 'Upload error',
        0
      )
      
      errorLogger.apiError(endpoint, networkError, {
        metadata: { errorType: 'network_error' }
      })
      performanceMonitor.recordApiCall(endpoint, 0, false, 0)
      performanceMonitor.recordError('network')
      
      throw networkError
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient()

export default apiClient

