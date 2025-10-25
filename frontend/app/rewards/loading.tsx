export default function RewardsLoading() {
  return (
    <div className="min-h-screen p-4 animate-pulse">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6 text-center">
          <div className="h-12 w-80 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border-2 border-yellow-500/30 mx-auto mb-4" />
          <div className="h-6 w-64 bg-yellow-400/20 rounded mx-auto" />
        </div>

        {/* Daily reward claim card skeleton */}
        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 rounded-xl p-8 border-4 border-yellow-500/40 mb-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-yellow-400/30 rounded-full" />
            <div className="h-8 w-56 bg-yellow-400/30 rounded" />
            <div className="h-6 w-40 bg-yellow-400/30 rounded" />
            <div className="h-14 w-48 bg-green-500/30 rounded-lg border-4 border-green-600/30" />
          </div>
        </div>

        {/* Rewards sections grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Active missions skeleton */}
          <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-6 border-4 border-blue-500/30">
            <div className="h-8 w-48 bg-blue-400/30 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-black/40 rounded-lg p-4 border border-blue-500/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-6 w-40 bg-blue-400/30 rounded" />
                    <div className="h-8 w-20 bg-yellow-400/30 rounded-full" />
                  </div>
                  <div className="h-4 w-full bg-blue-400/30 rounded mb-2" />
                  <div className="h-3 w-32 bg-blue-400/30 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Achievements skeleton */}
          <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 border-4 border-purple-500/30">
            <div className="h-8 w-48 bg-purple-400/30 rounded mb-4" />
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 p-3 bg-black/40 rounded-lg border border-purple-500/30"
                >
                  <div className="w-16 h-16 bg-purple-400/30 rounded-full" />
                  <div className="h-3 w-16 bg-purple-400/30 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leaderboard rewards skeleton */}
        <div className="bg-gradient-to-br from-green-600/20 to-yellow-600/20 rounded-xl p-6 border-4 border-yellow-500/30 mb-6">
          <div className="h-8 w-56 bg-yellow-400/30 rounded mb-4" />

          {/* Top rewards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-black/40 rounded-lg p-6 border-2 border-yellow-500/30 text-center"
              >
                <div className="h-10 w-10 bg-yellow-400/30 rounded-full mx-auto mb-3" />
                <div className="h-6 w-32 bg-yellow-400/30 rounded mx-auto mb-2" />
                <div className="h-8 w-40 bg-green-400/30 rounded mx-auto" />
              </div>
            ))}
          </div>

          {/* Other ranks skeleton */}
          <div className="space-y-2">
            {[4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-yellow-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="h-6 w-12 bg-yellow-400/30 rounded" />
                  <div className="h-5 w-32 bg-yellow-400/30 rounded" />
                </div>
                <div className="h-6 w-24 bg-green-400/30 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Rewards history skeleton */}
        <div className="bg-gradient-to-br from-pink-600/20 to-red-600/20 rounded-xl p-6 border-2 border-pink-500/30">
          <div className="h-8 w-48 bg-pink-400/30 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-pink-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-400/30 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-pink-400/30 rounded" />
                    <div className="h-4 w-32 bg-pink-400/30 rounded" />
                  </div>
                </div>
                <div className="h-6 w-20 bg-yellow-400/30 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Loading message */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border-2 border-yellow-500/30">
            <span className="text-2xl animate-bounce">🎁</span>
            <span className="text-yellow-300 font-bold">Loading Rewards...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
