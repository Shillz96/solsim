// Structured Error Logging Service
// Provides centralized error logging with context and reporting

export interface LogLevel {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical'
}

export interface LogContext {
  userId?: string
  sessionId?: string
  userAgent?: string
  url?: string
  timestamp?: number
  component?: string
  action?: string
  error?: Error
  errorInfo?: any
  message?: string
  filename?: string
  lineno?: number
  colno?: number
  stack?: string
  fingerprint?: string
  metadata?: Record<string, any>
}

export interface ErrorLog extends LogContext {
  level: LogLevel['level']
  message: string
  error?: Error
  stack?: string
  fingerprint?: string
}

export class ErrorLogger {
  private static instance: ErrorLogger
  private logs: ErrorLog[] = []
  private sessionId: string
  private userId?: string
  private maxLogs: number = 1000
  private batchSize: number = 50
  private flushInterval: number = 30000 // 30 seconds
  private flushTimer?: NodeJS.Timeout
  private monitoringEndpointAvailable: boolean = true
  // Throttling for development logging
  private logThrottle: Map<string, number> = new Map()
  private throttleInterval = 2000 // 2 seconds

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  private constructor() {
    this.sessionId = this.generateSessionId()
    this.setupErrorHandlers()
    this.startFlushTimer()
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private setupErrorHandlers() {
    if (typeof window === 'undefined') return

    // Global error handler
    window.addEventListener('error', (event) => {
      this.error('Global Error', {
        error: event.error,
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        component: 'window'
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        error: event.reason,
        component: 'promise'
      })
    })

    // React error boundary integration
    window.addEventListener('react-error', ((event: CustomEvent) => {
      this.error('React Error', {
        error: event.detail.error,
        errorInfo: event.detail.errorInfo,
        component: event.detail.component
      })
    }) as EventListener)
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.flushInterval)
  }

  public setUser(userId: string) {
    this.userId = userId
  }

  public setContext(context: Partial<LogContext>) {
    // Apply context to future logs
    Object.assign(this.getBaseContext(), context)
  }

  private getBaseContext(): LogContext {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      timestamp: Date.now()
    }
  }

  private createFingerprint(message: string, error?: Error): string {
    const errorString = error ? `${error.name}:${error.message}` : ''
    const combined = `${message}:${errorString}`
    
    // Simple hash function for fingerprinting
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36)
  }

  private log(level: LogLevel['level'], message: string, context: Partial<LogContext> = {}) {
    const logEntry: ErrorLog = {
      ...this.getBaseContext(),
      ...context,
      level,
      message,
      fingerprint: this.createFingerprint(message, context.error)
    }

    // Add stack trace for errors
    if (context.error instanceof Error) {
      logEntry.stack = context.error.stack
    }

    // Add to logs
    this.logs.push(logEntry)

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Console output in development with throttling
    if (process.env.NODE_ENV === 'development') {
      const logKey = `${level}:${message.substring(0, 50)}`
      const now = Date.now()
      const lastLogged = this.logThrottle.get(logKey) || 0
      
      // Only log if enough time has passed since last identical log (except errors)
      if (level === 'error' || level === 'critical' || now - lastLogged > this.throttleInterval) {
        const consoleMethod = level === 'error' || level === 'critical' ? 'error' :
                             level === 'warn' ? 'warn' : 'log'
        console[consoleMethod](`[${level.toUpperCase()}] ${message}`, context)
        this.logThrottle.set(logKey, now)
        
        // Clean old throttle entries to prevent memory leak
        if (this.logThrottle.size > 100) {
          const cutoff = now - this.throttleInterval * 2
          for (const [key, timestamp] of this.logThrottle.entries()) {
            if (timestamp < cutoff) {
              this.logThrottle.delete(key)
            }
          }
        }
      }
    }

    // Immediate flush for critical errors
    if (level === 'critical') {
      this.flush()
    }
  }

  // Public logging methods
  public debug(message: string, context: Partial<LogContext> = {}) {
    this.log('debug', message, context)
  }

  public info(message: string, context: Partial<LogContext> = {}) {
    this.log('info', message, context)
  }

  public warn(message: string, context: Partial<LogContext> = {}) {
    this.log('warn', message, context)
  }

  public error(message: string, context: Partial<LogContext> = {}) {
    this.log('error', message, context)
  }

  public critical(message: string, context: Partial<LogContext> = {}) {
    this.log('critical', message, context)
  }

  // API operation logging
  public apiError(endpoint: string, error: Error, context: Partial<LogContext> = {}) {
    this.error(`API Error: ${endpoint}`, {
      ...context,
      error,
      action: 'api_call',
      metadata: {
        endpoint,
        errorType: error.constructor.name
      }
    })
  }

  public apiSuccess(endpoint: string, duration: number, context: Partial<LogContext> = {}) {
    this.info(`API Success: ${endpoint}`, {
      ...context,
      action: 'api_call',
      metadata: {
        endpoint,
        duration,
        status: 'success'
      }
    })
  }

  // User action logging
  public userAction(action: string, context: Partial<LogContext> = {}) {
    this.info(`User Action: ${action}`, {
      ...context,
      action: 'user_action',
      metadata: {
        action
      }
    })
  }

  // Performance logging
  public performance(operation: string, duration: number, context: Partial<LogContext> = {}) {
    const level = duration > 5000 ? 'warn' : 'info'
    this.log(level, `Performance: ${operation}`, {
      ...context,
      action: 'performance',
      metadata: {
        operation,
        duration,
        slowOperation: duration > 5000
      }
    })
  }

  // Trading specific logging
  public tradeAttempt(tokenAddress: string, action: 'buy' | 'sell', amount: number, context: Partial<LogContext> = {}) {
    this.info(`Trade Attempt: ${action}`, {
      ...context,
      action: 'trade_attempt',
      metadata: {
        tokenAddress,
        tradeAction: action,
        amount
      }
    })
  }

  public tradeSuccess(transactionId: string, tokenAddress: string, action: 'buy' | 'sell', context: Partial<LogContext> = {}) {
    this.info(`Trade Success: ${action}`, {
      ...context,
      action: 'trade_success',
      metadata: {
        transactionId,
        tokenAddress,
        tradeAction: action
      }
    })
  }

  public tradeError(tokenAddress: string, action: 'buy' | 'sell', error: Error, context: Partial<LogContext> = {}) {
    this.error(`Trade Error: ${action}`, {
      ...context,
      error,
      action: 'trade_error',
      metadata: {
        tokenAddress,
        tradeAction: action,
        errorType: error.constructor.name
      }
    })
  }

  // Get logs for debugging
  public getLogs(): ErrorLog[] {
    return [...this.logs]
  }

  public getLogsByLevel(level: LogLevel['level']): ErrorLog[] {
    return this.logs.filter(log => log.level === level)
  }

  public getLogsByFingerprint(fingerprint: string): ErrorLog[] {
    return this.logs.filter(log => log.fingerprint === fingerprint)
  }

  // Export logs for debugging
  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  // Clear logs
  public clearLogs() {
    this.logs = []
  }

  // Flush logs to server
  public async flush(): Promise<void> {
    if (this.logs.length === 0) return

    const logsToFlush = this.logs.splice(0, this.batchSize)
    
    // Send to monitoring endpoint if available
    try {
      if (typeof window !== 'undefined' && navigator.onLine && this.monitoringEndpointAvailable) {
        const response = await fetch('/api/v1/monitoring/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            logs: logsToFlush,
            sessionId: this.sessionId,
            timestamp: Date.now()
          })
        })
        
        // Handle 405 Method Not Allowed - endpoint doesn't exist
        if (response.status === 405) {
          console.debug('Monitoring logs endpoint not available (405), disabling log flushing')
          this.monitoringEndpointAvailable = false
          // Clear any existing logs and stop trying
          this.logs = []
          this.destroy()
          return
        }
        
        // Handle other non-success responses
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
      }
    } catch (error) {
      // Check if this is a 405 error or network error
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        // Network error - re-add logs for retry
        this.logs.unshift(...logsToFlush)
        console.debug('Network error flushing logs, will retry later')
      } else if (error.message.includes('405')) {
        // 405 Method Not Allowed - disable logging
        console.debug('Monitoring logs endpoint not supported, disabling error logging')
        this.monitoringEndpointAvailable = false
        this.logs = []
        this.destroy()
      } else {
        // Other errors - re-add logs for retry but log the error
        this.logs.unshift(...logsToFlush)
        console.warn('Failed to flush logs:', error.message)
      }
    }
  }

  // Cleanup
  public destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush() // Final flush
  }
}

// React hook for error logging
import { useEffect, useCallback } from 'react'

export function useErrorLogger(component?: string) {
  const logger = ErrorLogger.getInstance()

  useEffect(() => {
    if (component) {
      logger.setContext({ component })
    }
  }, [logger, component])

  const logError = useCallback((message: string, error?: Error, context?: Partial<LogContext>) => {
    logger.error(message, { ...context, error, component })
  }, [logger, component])

  const logWarning = useCallback((message: string, context?: Partial<LogContext>) => {
    logger.warn(message, { ...context, component })
  }, [logger, component])

  const logInfo = useCallback((message: string, context?: Partial<LogContext>) => {
    logger.info(message, { ...context, component })
  }, [logger, component])

  const logUserAction = useCallback((action: string, context?: Partial<LogContext>) => {
    logger.userAction(action, { ...context, component })
  }, [logger, component])

  const logApiError = useCallback((endpoint: string, error: Error, context?: Partial<LogContext>) => {
    logger.apiError(endpoint, error, { ...context, component })
  }, [logger, component])

  const logTradeAttempt = useCallback((tokenAddress: string, action: 'buy' | 'sell', amount: number) => {
    logger.tradeAttempt(tokenAddress, action, amount, { component })
  }, [logger, component])

  const logTradeSuccess = useCallback((transactionId: string, tokenAddress: string, action: 'buy' | 'sell') => {
    logger.tradeSuccess(transactionId, tokenAddress, action, { component })
  }, [logger, component])

  const logTradeError = useCallback((tokenAddress: string, action: 'buy' | 'sell', error: Error) => {
    logger.tradeError(tokenAddress, action, error, { component })
  }, [logger, component])

  return {
    logError,
    logWarning,
    logInfo,
    logUserAction,
    logApiError,
    logTradeAttempt,
    logTradeSuccess,
    logTradeError
  }
}

// Export singleton instance
export const errorLogger = ErrorLogger.getInstance()