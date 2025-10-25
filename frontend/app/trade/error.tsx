'use client'

/**
 * Trade Page Error Boundary - 1UP SOL
 *
 * Catches errors on the /trade page and provides recovery options.
 * Uses Mario theme design system for consistent styling.
 */

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function TradeError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Trade page error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-[16px] p-6 text-center space-y-5">
        {/* Mario-themed error icon */}
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full flex items-center justify-center bg-[var(--mario-red)] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
            <AlertTriangle className="h-10 w-10 text-white" strokeWidth={3} />
          </div>
        </div>

        {/* Error message */}
        <div className="space-y-2">
          <h2 className="font-mario text-[20px] md:text-[24px] text-[var(--mario-red)] drop-shadow-[2px_2px_0_var(--outline-black)]">
            TRADING ERROR!
          </h2>
          <p className="text-[13px] md:text-[14px] text-[var(--outline-black)]/80">
            Failed to load the trading interface
          </p>

          {/* Error details (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-3 p-3 bg-[var(--outline-black)]/5 rounded-lg border-2 border-[var(--outline-black)]/20 text-left">
              <p className="font-mono text-[10px] text-[var(--mario-red)] break-all">
                {error.message || 'An unexpected error occurred'}
              </p>
              {error.digest && (
                <p className="font-mono text-[9px] text-[var(--outline-black)]/60 mt-1">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Recovery actions - Mario-themed buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          <button
            onClick={reset}
            className="h-11 px-5 bg-[var(--luigi-green)] text-white font-bold text-[14px] rounded-[14px] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-[2px] transition-all inline-flex items-center justify-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="h-11 px-5 bg-white text-[var(--outline-black)] font-bold text-[14px] rounded-[14px] border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-[2px] transition-all inline-flex items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" />
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}
