// Input Sanitization Utilities for Security
export class InputSanitizer {
  // Extract common XSS sanitization patterns
  private static removeScriptTags(input: string): string {
    return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }

  private static removeHtmlTags(input: string): string {
    return input.replace(/[<>]/g, '')
  }

  private static sanitizeString(input: string, maxLength: number): string {
    return this.removeHtmlTags(this.removeScriptTags(input))
      .trim()
      .substring(0, maxLength)
  }

  // Sanitize HTML to prevent XSS
  static sanitizeHtml(input: string): string {
    if (typeof window === 'undefined') return input
    
    const tempDiv = document.createElement('div')
    tempDiv.textContent = input
    return tempDiv.innerHTML
  }

  // Clean user input for search queries
  static sanitizeSearchQuery(query: string): string {
    return this.sanitizeString(query, 100)
  }

  // Validate and sanitize token addresses
  static sanitizeTokenAddress(address: string): string {
    // Basic Solana address validation (44 characters, base58)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/
    
    if (!base58Regex.test(address)) {
      throw new Error('Invalid token address format')
    }
    
    return address.trim()
  }

  // Sanitize user profile inputs
  static sanitizeProfileInput(input: string, maxLength = 200): string {
    return this.sanitizeString(input, maxLength)
  }

  // Validate email format
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 255
  }

  // Validate username format
  static validateUsername(username: string): boolean {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
    return usernameRegex.test(username)
  }

  // Sanitize numeric inputs for trading
  static sanitizeNumericInput(value: string | number): number {
    const num = typeof value === 'string' ? parseFloat(value) : value
    
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid numeric input')
    }
    
    // Prevent extremely large numbers that could cause issues
    if (Math.abs(num) > Number.MAX_SAFE_INTEGER) {
      throw new Error('Number too large')
    }
    
    return num
  }
}

// Rate limiting for client-side API calls
export class ClientRateLimiter {
  private static requestCounts = new Map<string, { count: number; resetTime: number }>()
  
  static checkRateLimit(endpoint: string, maxRequests = 10, windowMs = 60000): boolean {
    const now = Date.now()
    const key = endpoint
    
    const current = this.requestCounts.get(key)
    
    if (!current || now > current.resetTime) {
      this.requestCounts.set(key, { count: 1, resetTime: now + windowMs })
      return true
    }
    
    if (current.count >= maxRequests) {
      return false
    }
    
    current.count++
    return true
  }
}