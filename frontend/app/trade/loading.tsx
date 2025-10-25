export default function TradeLoading() {
  return (
    <div className="min-h-screen p-4 animate-pulse">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6 flex items-center justify-between">
          <div className="h-10 w-48 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border-2 border-blue-500/30" />
          <div className="h-10 w-32 bg-gradient-to-r from-green-500/20 to-yellow-500/20 rounded-lg border-2 border-green-500/30" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Token search and info - Left side */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search box skeleton */}
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-4 border-2 border-blue-500/30">
              <div className="h-6 w-32 bg-blue-400/30 rounded mb-3" />
              <div className="h-12 bg-black/40 rounded-lg border-2 border-blue-500/30" />
            </div>

            {/* Token info skeleton */}
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-4 border-2 border-purple-500/30 space-y-3">
              <div className="h-8 w-40 bg-purple-400/30 rounded" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 w-24 bg-purple-400/30 rounded" />
                    <div className="h-4 w-32 bg-purple-400/30 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trading panel - Center */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-green-600/20 to-yellow-600/20 rounded-xl p-6 border-4 border-yellow-500/30 space-y-4">
              {/* Title */}
              <div className="h-8 w-48 bg-yellow-400/30 rounded mx-auto" />

              {/* Trade type toggle */}
              <div className="flex gap-2">
                <div className="h-12 flex-1 bg-green-500/30 rounded-lg border-2 border-green-600/30" />
                <div className="h-12 flex-1 bg-red-500/30 rounded-lg border-2 border-red-600/30" />
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <div className="h-5 w-24 bg-yellow-400/30 rounded" />
                <div className="h-16 bg-black/40 rounded-lg border-2 border-yellow-500/30" />
              </div>

              {/* Quick amount buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-blue-500/30 rounded-lg border-2 border-blue-600/30" />
                ))}
              </div>

              {/* Trade button */}
              <div className="h-14 bg-green-500/30 rounded-lg border-4 border-green-600/30" />

              {/* Stats */}
              <div className="space-y-2 pt-4 border-t-2 border-yellow-500/30">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-28 bg-yellow-400/30 rounded" />
                    <div className="h-4 w-24 bg-yellow-400/30 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chart and history - Right side */}
          <div className="lg:col-span-1 space-y-4">
            {/* Chart skeleton */}
            <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/20 rounded-xl p-4 border-2 border-indigo-500/30">
              <div className="h-6 w-32 bg-indigo-400/30 rounded mb-3" />
              <div className="h-64 bg-black/40 rounded-lg border-2 border-indigo-500/30" />
            </div>

            {/* Recent trades skeleton */}
            <div className="bg-gradient-to-br from-pink-600/20 to-red-600/20 rounded-xl p-4 border-2 border-pink-500/30">
              <div className="h-6 w-40 bg-pink-400/30 rounded mb-3" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-black/40 rounded-lg border border-pink-500/30" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading message */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border-2 border-yellow-500/30">
            <span className="text-2xl animate-bounce">🍄</span>
            <span className="text-yellow-300 font-bold">Loading Trading Portal...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
