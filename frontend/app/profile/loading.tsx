export default function ProfileLoading() {
  return (
    <div className="min-h-screen p-4 animate-pulse">
      <div className="max-w-5xl mx-auto">
        {/* Profile header skeleton */}
        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-8 border-4 border-blue-500/30 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar skeleton */}
            <div className="w-32 h-32 bg-blue-400/30 rounded-full" />

            {/* Profile info skeleton */}
            <div className="flex-1 space-y-3 text-center md:text-left">
              <div className="h-10 w-64 bg-blue-400/30 rounded mx-auto md:mx-0" />
              <div className="h-6 w-48 bg-blue-400/30 rounded mx-auto md:mx-0" />
              <div className="flex gap-4 justify-center md:justify-start">
                <div className="h-8 w-24 bg-blue-400/30 rounded" />
                <div className="h-8 w-24 bg-blue-400/30 rounded" />
                <div className="h-8 w-24 bg-blue-400/30 rounded" />
              </div>
            </div>

            {/* Edit button skeleton */}
            <div className="h-12 w-32 bg-luigi/30 rounded-lg border-2 border-green-600/30" />
          </div>
        </div>

        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 border-2 border-purple-500/30 text-center"
            >
              <div className="h-6 w-20 bg-purple-400/30 rounded mx-auto mb-3" />
              <div className="h-8 w-32 bg-purple-400/30 rounded mx-auto mb-2" />
              <div className="h-4 w-24 bg-purple-400/30 rounded mx-auto" />
            </div>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 mb-6 border-b-2 border-gray-500/30 pb-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-10 w-32 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-t-lg border-2 border-b-0 border-blue-500/30"
            />
          ))}
        </div>

        {/* Content area skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Recent activity */}
          <div className="bg-gradient-to-br from-green-600/20 to-yellow-600/20 rounded-xl p-6 border-4 border-yellow-500/30">
            <div className="h-8 w-48 bg-yellow-400/30 rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-yellow-500/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-400/30 rounded-full" />
                    <div className="space-y-2">
                      <div className="h-5 w-32 bg-yellow-400/30 rounded" />
                      <div className="h-4 w-24 bg-yellow-400/30 rounded" />
                    </div>
                  </div>
                  <div className="h-6 w-20 bg-green-400/30 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Right column - Achievements/Badges */}
          <div className="bg-gradient-to-br from-pink-600/20 to-red-600/20 rounded-xl p-6 border-4 border-pink-500/30">
            <div className="h-8 w-40 bg-pink-400/30 rounded mb-4" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-2 p-4 bg-black/40 rounded-lg border border-pink-500/30"
                >
                  <div className="w-16 h-16 bg-pink-400/30 rounded-full" />
                  <div className="h-4 w-20 bg-pink-400/30 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading message */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full border-2 border-blue-500/30">
            <span className="text-2xl animate-bounce">👤</span>
            <span className="text-blue-300 font-bold">Loading Profile...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
