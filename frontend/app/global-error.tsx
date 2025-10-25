'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900">
          <div className="max-w-2xl mx-auto p-8">
            <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl shadow-2xl border-4 border-yellow-400 p-8 text-center">
              {/* Mario-style error icon */}
              <div className="mb-6 flex justify-center">
                <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center border-4 border-red-500 shadow-lg">
                  <span className="text-6xl">💀</span>
                </div>
              </div>

              {/* Error title */}
              <h1 className="text-4xl font-bold text-yellow-300 mb-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] font-['Press_Start_2P',_monospace]">
                GAME OVER
              </h1>

              {/* Error message */}
              <div className="bg-black/40 rounded-lg p-4 mb-6">
                <p className="text-white text-lg mb-2">
                  Mamma mia! Something went terribly wrong!
                </p>
                <p className="text-red-300 text-sm font-mono">
                  {error.message || 'An unexpected error occurred'}
                </p>
                {error.digest && (
                  <p className="text-gray-400 text-xs mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={reset}
                  className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg border-4 border-green-800 shadow-lg transform hover:scale-105 transition-all duration-200 active:scale-95"
                >
                  🔄 TRY AGAIN
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg border-4 border-blue-800 shadow-lg transform hover:scale-105 transition-all duration-200 active:scale-95"
                >
                  🏠 GO HOME
                </button>
              </div>

              {/* Help text */}
              <p className="text-yellow-200 text-sm mt-6">
                If this problem persists, please contact support
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
