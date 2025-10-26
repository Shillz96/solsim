'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  enhanced?: boolean
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  className?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Unified Error Boundary with configurable features
 * Combines basic and enhanced error handling capabilities
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Basic error logging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Enhanced error handling if enabled
    if (this.props.enhanced) {
      this.handleEnhancedError(error, errorInfo)
    }
    
    // Custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    this.setState({
      hasError: true,
      error,
      errorInfo
    })
  }

  handleEnhancedError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      // Try to import and use error logger
      const { errorLogger } = await import('@/lib/error-logger')
      errorLogger.error('Enhanced Error Boundary caught an error', {
        error,
        errorInfo,
        action: 'enhanced_error_boundary_triggered',
        metadata: { componentStack: errorInfo.componentStack }
      })
    } catch (importError) {
      // Fallback if error logger is not available
      console.error('Error logger not available:', importError)
    }
    
    // Production error reporting
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, { extra: errorInfo })
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className={`min-h-screen flex items-center justify-center p-4 ${this.props.className || ''}`}>
          <Card className="max-w-md w-full border-4 border-outline shadow-[8px_8px_0_var(--outline-black)]">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-mario rounded-full border-4 border-outline flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-mario text-outline">
                Oops! Something went wrong!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Don't worry, even Mario hits a pipe sometimes! 
                Try refreshing the page or contact support if the problem persists.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 p-3 bg-muted rounded-lg">
                  <summary className="cursor-pointer font-mario text-sm">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs text-muted-foreground overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.handleReset}
                  className="flex-1 bg-star hover:bg-star/90 text-outline border-2 border-outline font-mario"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1 border-2 border-outline font-mario"
                >
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Convenience exports for different use cases
export const GlobalErrorBoundary = (props: Omit<ErrorBoundaryProps, 'enhanced'>) => (
  <ErrorBoundary {...props} enhanced={true} />
)

export const BasicErrorBoundary = (props: Omit<ErrorBoundaryProps, 'enhanced'>) => (
  <ErrorBoundary {...props} enhanced={false} />
)
