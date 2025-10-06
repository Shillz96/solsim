// Global Error Boundary
// Catches and displays API errors and component errors

"use client"

import React, { Component } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })

    // Log error to monitoring service
    if (typeof window !== 'undefined') {
      try {
        // Import error logger dynamically to avoid SSR issues
        import('@/lib/error-logger').then(({ errorLogger }) => {
          errorLogger.error('React Error Boundary', {
            error,
            errorInfo,
            component: errorInfo.componentStack || undefined,
            action: 'component_render_error'
          })
        })

        // Dispatch custom event for global error handling
        window.dispatchEvent(new CustomEvent('react-error', {
          detail: { error, errorInfo, component: 'ErrorBoundary' }
        }))
      } catch (logError) {
        console.error('Failed to log error:', logError)
      }
    }
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} retry={this.retry} />
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="p-8 w-full max-w-md text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. Please try refreshing the page or contact support if the problem persists.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium mb-2">Error Details</summary>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={this.retry} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button asChild>
                <Link href="/">
                  <Home className="h-4 w-4 mr-2" />
                  Go Home
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

// Simple error fallback for API errors
export function ApiErrorFallback({ 
  error, 
  retry, 
  message = "Failed to load data" 
}: { 
  error: Error
  retry: () => void
  message?: string 
}) {
  return (
    <Card className="p-6 text-center">
      <div className="flex items-center justify-center mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
      </div>
      <h3 className="font-semibold mb-2">{message}</h3>
      <p className="text-sm text-muted-foreground mb-4">
        {error.message || "Please try again later"}
      </p>
      <Button onClick={retry} size="sm">
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </Card>
  )
}