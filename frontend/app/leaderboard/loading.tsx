export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen p-4 animate-pulse">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6 text-center">
          <div className="h-12 w-80 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border-2 border-yellow-500/30 mx-auto mb-4" />
          <div className="h-6 w-64 bg-yellow-400/20 rounded mx-auto" />
        </div>

        {/* Filter tabs skeleton */}
        <div className="flex gap-2 mb-6 justify-center">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-32 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg border-2 border-blue-500/30"
            />
          ))}
        </div>

        {/* Top 3 podium skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* 2nd place */}
          <div className="md:order-1 md:mt-8">
            <div className="bg-gradient-to-br from-gray-400/20 to-gray-600/20 rounded-xl p-6 border-4 border-gray-500/30 text-center">
              <div className="mb-4 flex justify-center">
                <div className="w-20 h-20 bg-gray-400/30 rounded-full" />
              </div>
              <div className="h-8 w-8 bg-gray-400/30 rounded-full mx-auto mb-3" />
              <div className="h-6 w-32 bg-gray-400/30 rounded mx-auto mb-2" />
              <div className="h-8 w-40 bg-gray-400/30 rounded mx-auto" />
            </div>
          </div>

          {/* 1st place */}
          <div className="md:order-2">
            <div className="bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 rounded-xl p-8 border-4 border-yellow-500/40 text-center">
              <div className="mb-4 flex justify-center">
                <div className="w-24 h-24 bg-yellow-400/30 rounded-full" />
              </div>
              <div className="h-10 w-10 bg-yellow-400/30 rounded-full mx-auto mb-3" />
              <div className="h-7 w-40 bg-yellow-400/30 rounded mx-auto mb-2" />
              <div className="h-10 w-48 bg-yellow-400/30 rounded mx-auto" />
            </div>
          </div>

          {/* 3rd place */}
          <div className="md:order-3 md:mt-8">
            <div className="bg-gradient-to-br from-orange-400/20 to-orange-600/20 rounded-xl p-6 border-4 border-orange-500/30 text-center">
              <div className="mb-4 flex justify-center">
                <div className="w-20 h-20 bg-orange-400/30 rounded-full" />
              </div>
              <div className="h-8 w-8 bg-orange-400/30 rounded-full mx-auto mb-3" />
              <div className="h-6 w-32 bg-orange-400/30 rounded mx-auto mb-2" />
              <div className="h-8 w-40 bg-orange-400/30 rounded mx-auto" />
            </div>
          </div>
        </div>

        {/* Leaderboard table skeleton */}
        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 border-4 border-purple-500/30">
          <div className="h-8 w-48 bg-purple-400/30 rounded mb-4" />

          {/* Table header */}
          <div className="grid grid-cols-5 gap-4 pb-3 mb-3 border-b-2 border-purple-500/30">
            {['Rank', 'Player', 'Level', 'Profit', 'Trades'].map((label, i) => (
              <div key={i} className="h-5 bg-purple-400/30 rounded" />
            ))}
          </div>

          {/* Table rows */}
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="grid grid-cols-5 gap-4 py-3 px-4 bg-black/40 rounded-lg border border-purple-500/30"
              >
                <div className="h-6 bg-purple-400/30 rounded" />
                <div className="h-6 bg-purple-400/30 rounded" />
                <div className="h-6 bg-purple-400/30 rounded" />
                <div className="h-6 bg-green-400/30 rounded" />
                <div className="h-6 bg-purple-400/30 rounded" />
              </div>
            ))}
          </div>

          {/* Pagination skeleton */}
          <div className="flex justify-center items-center gap-2 mt-6">
            <div className="h-10 w-10 bg-purple-500/30 rounded-lg border-2 border-purple-600/30" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 w-10 bg-purple-500/30 rounded-lg border-2 border-purple-600/30" />
            ))}
            <div className="h-10 w-10 bg-purple-500/30 rounded-lg border-2 border-purple-600/30" />
          </div>
        </div>

        {/* Loading message */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border-2 border-yellow-500/30">
            <span className="text-2xl animate-bounce">🏆</span>
            <span className="text-yellow-300 font-bold">Loading Leaderboard...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
