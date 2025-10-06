// API Client for SolSim Frontend
// Provides typed, error-handled communication with backend

import type { ApiResponse, ApiError as IApiError } from './types/api-types'
import { errorLogger } from './error-logger'

export class ApiError extends Error implements IApiError {
  public status: number
  public code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

class ApiClient {
  private baseURL: string
  private authToken: string | null = null
  private refreshPromise: Promise<string> | null = null

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4002') {
    this.baseURL = baseURL
    
    // Try to get token from localStorage on client side
    if (typeof window !== 'undefined') {
      this.authToken = localStorage.getItem('auth_token')
    }
  }

  // Set authentication token
  setAuthToken(token: string) {
    this.authToken = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  // Clear authentication
  clearAuth() {
    this.authToken = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  // Generic API request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...options.headers,
    })

    // Development mode: Add dev headers instead of auth token
    const isDevelopment = process.env.NEXT_PUBLIC_ENV === 'development'
    if (isDevelopment) {
      headers.set('x-dev-user-id', 'dev-user-1')
      headers.set('x-dev-email', 'dev-user-1@dev.local')
    } else if (this.authToken) {
      // Production mode: Add auth token if available
      headers.set('Authorization', `Bearer ${this.authToken}`)
    }

    try {
      const startTime = Date.now()
      const response = await fetch(url, {
        ...options,
        headers,
      })
      const duration = Date.now() - startTime

      // Log API performance
      errorLogger.performance(`API ${options.method || 'GET'} ${endpoint}`, duration, {
        metadata: { statusCode: response.status }
      })

      // Handle 401 Unauthorized - attempt token refresh (only in production)
      if (response.status === 401 && !isDevelopment && this.authToken && endpoint !== '/api/v1/auth/refresh') {
        errorLogger.warn('Token expired, attempting refresh', { 
          action: 'token_refresh_attempt',
          metadata: { endpoint }
        })
        
        try {
          // Prevent multiple simultaneous refresh attempts
          if (!this.refreshPromise) {
            this.refreshPromise = this.refreshToken()
          }
          
          const newToken = await this.refreshPromise
          
          // Retry original request with new token
          headers.set('Authorization', `Bearer ${newToken}`)
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          })
          
          const retryData: ApiResponse<T> = await retryResponse.json()
          if (retryResponse.ok && retryData.success) {
            errorLogger.info('Token refresh successful', {
              action: 'token_refresh_success',
              metadata: { endpoint }
            })
            return retryData.data as T
          }
        } catch (refreshError) {
          // Refresh failed, clear auth and throw original error
          this.clearAuth()
          errorLogger.apiError('token-refresh', refreshError instanceof Error ? refreshError : new Error('Unknown refresh error'), {
            action: 'token_refresh_failed',
            metadata: { endpoint }
          })
          
          // Dispatch custom event for components to handle auth failure
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:token-expired'))
          }
        } finally {
          this.refreshPromise = null
        }
      }

      const data: ApiResponse<T> = await response.json()

      if (!response.ok) {
        const apiError = new ApiError(
          data.error || `HTTP ${response.status}`,
          response.status,
          data.error
        )
        
        // Log API error
        errorLogger.apiError(endpoint, apiError, {
          metadata: { 
            statusCode: response.status,
            method: options.method || 'GET'
          }
        })
        
        throw apiError
      }

      if (!data.success) {
        const apiError = new ApiError(
          data.error || 'Request failed',
          response.status,
          data.error
        )
        
        errorLogger.apiError(endpoint, apiError, {
          metadata: { 
            statusCode: response.status,
            method: options.method || 'GET'
          }
        })
        
        throw apiError
      }

      // Log successful API call
      errorLogger.apiSuccess(endpoint, Date.now() - startTime, {
        metadata: {
          statusCode: response.status,
          method: options.method || 'GET'
        }
      })

      return data.data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Network or parsing error
      const networkError = new ApiError(
        error instanceof Error ? error.message : 'Network error',
        0
      )
      
      errorLogger.apiError(endpoint, networkError, {
        metadata: {
          errorType: 'network_error',
          method: options.method || 'GET'
        }
      })
      
      throw networkError
    }
  }

  // Private method to handle token refresh
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

  // GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // File upload request
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const headers = new Headers()

    // Add auth token if available (don't set Content-Type for FormData)
    if (this.authToken) {
      headers.set('Authorization', `Bearer ${this.authToken}`)
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      })

      const data: ApiResponse<T> = await response.json()

      if (!response.ok) {
        throw new ApiError(
          data.error || `HTTP ${response.status}`,
          response.status,
          data.error
        )
      }

      if (!data.success) {
        throw new ApiError(
          data.error || 'Upload failed',
          response.status,
          data.error
        )
      }

      return data.data as T
    } catch (error) {
      if (error instanceof ApiError) {
        throw error
      }
      
      // Network or parsing error
      throw new ApiError(
        error instanceof Error ? error.message : 'Upload error',
        0
      )
    }
  }
}

// Create singleton instance
const apiClient = new ApiClient()

// Export default instance
export default apiClient