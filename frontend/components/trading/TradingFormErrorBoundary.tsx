'use client';

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary specifically for trading forms
 * Catches React errors during trade execution and provides recovery UI
 */
export class TradingFormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('Trading Form Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Send to error logging service if available
    if (typeof window !== 'undefined') {
      import('@/lib/error-logger').then(({ errorLogger }) => {
        errorLogger.error('Trading form crashed', {
          error,
          action: 'trading_form_error_boundary',
          metadata: {
            componentStack: errorInfo.componentStack,
            errorMessage: error.message,
            errorStack: error.stack,
          },
        });
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Trading Form Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {this.props.fallbackMessage || 
                  'An unexpected error occurred in the trading form. Please try again.'}
              </AlertDescription>
            </Alert>

            {isDevelopment && this.state.error && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">Error Details (Development Only):</div>
                <pre className="text-xs p-3 bg-muted rounded-md overflow-auto max-h-40 text-foreground">
                  {this.state.error.message}
                </pre>
                {this.state.errorInfo && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                      Component Stack
                    </summary>
                    <pre className="mt-2 p-3 bg-muted rounded-md overflow-auto max-h-60 text-foreground">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={this.handleReset}
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button 
                onClick={this.handleReload}
                variant="default"
                className="flex-1"
              >
                Reload Page
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              If the problem persists, please contact support or try refreshing the page.
            </p>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
