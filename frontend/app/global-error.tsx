'use client'

/**
 * Global Error Handler - 1UP SOL
 *
 * Next.js App Router global error boundary that catches unhandled errors
 * at the root level. Uses Mario theme design system for consistent styling.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error#global-errortsx
 */

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console
    console.error('Global error:', error)

    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white border-4 border-outline shadow-[6px_6px_0_var(--outline-black)] rounded-xl p-8 text-center space-y-6">
            {/* Mario-themed error icon */}
            <div className="flex justify-center">
              <div className="h-24 w-24 rounded-full flex items-center justify-center bg-mario border-4 border-outline shadow-[6px_6px_0_var(--outline-black)]">
                <AlertTriangle className="h-12 w-12 text-white" strokeWidth={3} />
              </div>
            </div>

            {/* Error message */}
            <div className="space-y-3">
              <h1 className="font-mario text-[28px] md:text-[32px] text-mario drop-shadow-[3px_3px_0_var(--outline-black)]">
                GAME OVER!
              </h1>
              <p className="text-[14px] md:text-[16px] text-outline/80">
                Mamma mia! Something went terribly wrong!
              </p>
              <p className="text-[12px] md:text-[14px] text-outline/60">
                Don't worry - your data is safe. Try refreshing or go home.
              </p>

              {/* Error details (development only) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="text-[12px] font-bold cursor-pointer text-outline/60 hover:text-outline">
                    Error Details (Dev Only)
                  </summary>
                  <div className="mt-2 p-4 bg-[var(--outline-black)]/5 rounded-lg border-2 border-outline/20">
                    <p className="font-mono text-[11px] text-mario break-all">
                      {error.message || 'An unexpected error occurred'}
                    </p>
                    {error.digest && (
                      <p className="font-mono text-[10px] text-outline/60 mt-2">
                        Digest: {error.digest}
                      </p>
                    )}
                  </div>
                </details>
              )}
            </div>

            {/* Recovery actions - Mario-themed buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={reset}
                className="h-11 px-6 bg-luigi text-white font-bold text-[14px] rounded-lg border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-[2px] transition-all inline-flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="h-11 px-6 bg-white text-outline font-bold text-[14px] rounded-lg border-4 border-outline shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-[2px] transition-all inline-flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </button>
            </div>

            {/* Help text */}
            <p className="text-[12px] text-outline/60">
              If this problem persists, please{' '}
              <a
                href="https://github.com/anthropics/claude-code/issues"
                className="text-mario hover:underline font-bold"
                target="_blank"
                rel="noopener noreferrer"
              >
                report an issue
              </a>
              .
            </p>
          </div>
        </div>
      </body>
    </html>
  )
}
