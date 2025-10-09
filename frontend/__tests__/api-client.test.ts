// Test suite for API Client
import apiClient, { ApiError } from '@/lib/api'

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    localStorage.clear()
  })

  describe('Authentication', () => {
    it('should set and clear auth tokens correctly', () => {
      const token = 'test-token-123'
      
      apiClient.setAuthToken(token)
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', token)
      
      apiClient.clearAuth()
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token')
    })

    it('should include Authorization header when token is set', async () => {
      const token = 'test-token-123'
      apiClient.setAuthToken(token)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } })
      } as Response)

      await apiClient.get('/test-endpoint')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4002/test-endpoint',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token-123'
          })
        })
      )
    })
  })

  describe('Token Refresh', () => {
    it('should attempt token refresh on 401 response', async () => {
      const oldToken = 'old-token'
      const newToken = 'new-token'
      
      apiClient.setAuthToken(oldToken)

      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ success: false, error: 'Unauthorized' })
        } as Response)
        // Refresh call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { token: newToken } })
        } as Response)
        // Retry original call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: { test: 'data' } })
        } as Response)

      const result = await apiClient.get('/test-endpoint')

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', newToken)
      expect(result).toEqual({ test: 'data' })
    })

    it('should clear auth on failed token refresh', async () => {
      const oldToken = 'old-token'
      apiClient.setAuthToken(oldToken)

      // First call returns 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ success: false, error: 'Unauthorized' })
        } as Response)
        // Refresh call fails
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: async () => ({ success: false, error: 'Refresh failed' })
        } as Response)

      await expect(apiClient.get('/test-endpoint')).rejects.toThrow()
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token')
    })
  })

  describe('Error Handling', () => {
    it('should throw ApiError for failed responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ success: false, error: 'Bad Request' })
      } as Response)

      await expect(apiClient.get('/test-endpoint')).rejects.toThrow(ApiError)
      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('Bad Request')
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(apiClient.get('/test-endpoint')).rejects.toThrow(ApiError)
      await expect(apiClient.get('/test-endpoint')).rejects.toThrow('Network error')
    })
  })

  describe('HTTP Methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: { test: 'data' } })
      } as Response)
    })

    it('should make GET requests correctly', async () => {
      await apiClient.get('/test-endpoint')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4002/test-endpoint',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('should make POST requests correctly', async () => {
      const testData = { test: 'data' }
      await apiClient.post('/test-endpoint', testData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4002/test-endpoint',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(testData)
        })
      )
    })

    it('should make PUT requests correctly', async () => {
      const testData = { test: 'data' }
      await apiClient.put('/test-endpoint', testData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4002/test-endpoint',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(testData)
        })
      )
    })

    it('should make DELETE requests correctly', async () => {
      await apiClient.delete('/test-endpoint')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4002/test-endpoint',
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('File Upload', () => {
    it('should handle file uploads correctly', async () => {
      const formData = new FormData()
      formData.append('file', new Blob(['test'], { type: 'text/plain' }))

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { fileUrl: 'http://example.com/file.txt' } })
      } as Response)

      const result = await apiClient.upload('/upload-endpoint', formData)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4002/upload-endpoint',
        expect.objectContaining({
          method: 'POST',
          body: formData
        })
      )
      expect(result).toEqual({ fileUrl: 'http://example.com/file.txt' })
    })
  })
})