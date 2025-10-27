'use client';

import { useEffect } from 'react';

export default function PortfolioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Portfolio page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl shadow-2xl border-4 border-yellow-400 p-6">
          {/* Error icon */}
          <div className="mb-4 flex justify-center">
            <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center border-4 border-red-500 shadow-lg">
              <span className="text-5xl">💼</span>
            </div>
          </div>

          {/* Error title */}
          <h2 className="text-2xl font-bold text-yellow-300 mb-3 text-center drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
            PORTFOLIO ERROR!
          </h2>

          {/* Error message */}
          <div className="bg-black/40 rounded-lg p-4 mb-4">
            <p className="text-white text-sm mb-2">
              Failed to load portfolio data
            </p>
            <p className="text-red-300 text-xs font-mono break-words">
              {error.message || 'An unexpected error occurred'}
            </p>
            {error.digest && (
              <p className="text-[var(--outline-black)]/50 text-xs mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg border-4 border-green-800 shadow-lg transform hover:scale-105 transition-all duration-200 active:scale-95"
            >
              🔄 RETRY
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg border-4 border-blue-800 shadow-lg transform hover:scale-105 transition-all duration-200 active:scale-95"
            >
              🏠 GO HOME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
