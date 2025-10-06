// Test suite for Security Utils
import { InputSanitizer, ClientRateLimiter } from '@/lib/security-utils'

describe('InputSanitizer', () => {
  describe('sanitizeHtml', () => {
    it('should escape HTML entities', () => {
      const maliciousInput = '<script>alert("xss")</script>'
      const sanitized = InputSanitizer.sanitizeHtml(maliciousInput)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('&lt;script&gt;')
    })
  })

  describe('sanitizeSearchQuery', () => {
    it('should remove script tags', () => {
      const maliciousQuery = 'search<script>alert("xss")</script>term'
      const sanitized = InputSanitizer.sanitizeSearchQuery(maliciousQuery)
      expect(sanitized).toBe('searchterm')
    })

    it('should remove angle brackets', () => {
      const input = 'search<term>test'
      const sanitized = InputSanitizer.sanitizeSearchQuery(input)
      expect(sanitized).toBe('searchtermtest')
    })

    it('should limit length to 100 characters', () => {
      const longInput = 'a'.repeat(150)
      const sanitized = InputSanitizer.sanitizeSearchQuery(longInput)
      expect(sanitized).toHaveLength(100)
    })

    it('should trim whitespace', () => {
      const input = '  search term  '
      const sanitized = InputSanitizer.sanitizeSearchQuery(input)
      expect(sanitized).toBe('search term')
    })
  })

  describe('sanitizeTokenAddress', () => {
    it('should accept valid Solana addresses', () => {
      const validAddress = '11111111111111111111111111111111111111111'
      expect(() => InputSanitizer.sanitizeTokenAddress(validAddress)).not.toThrow()
    })

    it('should reject invalid addresses', () => {
      const invalidAddress = 'invalid-address'
      expect(() => InputSanitizer.sanitizeTokenAddress(invalidAddress)).toThrow('Invalid token address format')
    })

    it('should reject addresses with invalid characters', () => {
      const invalidAddress = '1111111111111111111111111111111111111110' // Contains '0'
      expect(() => InputSanitizer.sanitizeTokenAddress(invalidAddress)).toThrow('Invalid token address format')
    })

    it('should trim whitespace', () => {
      const validAddress = '  11111111111111111111111111111111111111111  '
      const result = InputSanitizer.sanitizeTokenAddress(validAddress)
      expect(result).toBe('11111111111111111111111111111111111111111')
    })
  })

  describe('sanitizeProfileInput', () => {
    it('should remove script tags', () => {
      const maliciousInput = 'Profile<script>alert("xss")</script>Name'
      const sanitized = InputSanitizer.sanitizeProfileInput(maliciousInput)
      expect(sanitized).toBe('ProfileName')
    })

    it('should limit length to specified max', () => {
      const longInput = 'a'.repeat(300)
      const sanitized = InputSanitizer.sanitizeProfileInput(longInput, 50)
      expect(sanitized).toHaveLength(50)
    })

    it('should use default max length of 200', () => {
      const longInput = 'a'.repeat(300)
      const sanitized = InputSanitizer.sanitizeProfileInput(longInput)
      expect(sanitized).toHaveLength(200)
    })
  })

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org'
      ]
      
      validEmails.forEach(email => {
        expect(InputSanitizer.validateEmail(email)).toBe(true)
      })
    })

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        ''
      ]
      
      invalidEmails.forEach(email => {
        expect(InputSanitizer.validateEmail(email)).toBe(false)
      })
    })

    it('should reject emails longer than 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com'
      expect(InputSanitizer.validateEmail(longEmail)).toBe(false)
    })
  })

  describe('validateUsername', () => {
    it('should accept valid usernames', () => {
      const validUsernames = [
        'test123',
        'user_name',
        'test-user',
        'TestUser123'
      ]
      
      validUsernames.forEach(username => {
        expect(InputSanitizer.validateUsername(username)).toBe(true)
      })
    })

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        'ab', // too short
        'a'.repeat(25), // too long
        'user@name', // invalid characters
        'user name', // spaces
        'user.name' // dots
      ]
      
      invalidUsernames.forEach(username => {
        expect(InputSanitizer.validateUsername(username)).toBe(false)
      })
    })
  })

  describe('sanitizeNumericInput', () => {
    it('should accept valid numbers', () => {
      expect(InputSanitizer.sanitizeNumericInput(123.45)).toBe(123.45)
      expect(InputSanitizer.sanitizeNumericInput('123.45')).toBe(123.45)
      expect(InputSanitizer.sanitizeNumericInput(0)).toBe(0)
      expect(InputSanitizer.sanitizeNumericInput(-123)).toBe(-123)
    })

    it('should reject invalid numeric inputs', () => {
      expect(() => InputSanitizer.sanitizeNumericInput('invalid')).toThrow('Invalid numeric input')
      expect(() => InputSanitizer.sanitizeNumericInput(NaN)).toThrow('Invalid numeric input')
      expect(() => InputSanitizer.sanitizeNumericInput(Infinity)).toThrow('Invalid numeric input')
    })

    it('should reject extremely large numbers', () => {
      expect(() => InputSanitizer.sanitizeNumericInput(Number.MAX_SAFE_INTEGER + 1)).toThrow('Number too large')
    })
  })
})

describe('ClientRateLimiter', () => {
  beforeEach(() => {
    // Reset rate limiter state
    ClientRateLimiter['requestCounts'].clear()
  })

  it('should allow requests within rate limit', () => {
    const endpoint = '/test-endpoint'
    
    for (let i = 0; i < 5; i++) {
      expect(ClientRateLimiter.checkRateLimit(endpoint, 10, 60000)).toBe(true)
    }
  })

  it('should block requests that exceed rate limit', () => {
    const endpoint = '/test-endpoint'
    const maxRequests = 3
    
    // Make requests up to the limit
    for (let i = 0; i < maxRequests; i++) {
      expect(ClientRateLimiter.checkRateLimit(endpoint, maxRequests, 60000)).toBe(true)
    }
    
    // Next request should be blocked
    expect(ClientRateLimiter.checkRateLimit(endpoint, maxRequests, 60000)).toBe(false)
  })

  it('should reset rate limit after time window', () => {
    const endpoint = '/test-endpoint'
    const maxRequests = 2
    const windowMs = 100 // Very short window for testing
    
    // Fill up the rate limit
    expect(ClientRateLimiter.checkRateLimit(endpoint, maxRequests, windowMs)).toBe(true)
    expect(ClientRateLimiter.checkRateLimit(endpoint, maxRequests, windowMs)).toBe(true)
    expect(ClientRateLimiter.checkRateLimit(endpoint, maxRequests, windowMs)).toBe(false)
    
    // Wait for window to expire
    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(ClientRateLimiter.checkRateLimit(endpoint, maxRequests, windowMs)).toBe(true)
        resolve()
      }, windowMs + 10)
    })
  })

  it('should handle different endpoints separately', () => {
    const endpoint1 = '/endpoint1'
    const endpoint2 = '/endpoint2'
    const maxRequests = 2
    
    // Fill up rate limit for endpoint1
    expect(ClientRateLimiter.checkRateLimit(endpoint1, maxRequests, 60000)).toBe(true)
    expect(ClientRateLimiter.checkRateLimit(endpoint1, maxRequests, 60000)).toBe(true)
    expect(ClientRateLimiter.checkRateLimit(endpoint1, maxRequests, 60000)).toBe(false)
    
    // endpoint2 should still be available
    expect(ClientRateLimiter.checkRateLimit(endpoint2, maxRequests, 60000)).toBe(true)
    expect(ClientRateLimiter.checkRateLimit(endpoint2, maxRequests, 60000)).toBe(true)
  })
})