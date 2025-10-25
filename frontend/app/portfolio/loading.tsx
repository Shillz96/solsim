export default function PortfolioLoading() {
  return (
    <div className="min-h-screen p-4 animate-pulse">
      <div className="max-w-7xl mx-auto">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-10 w-64 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border-2 border-purple-500/30 mb-4" />
          <div className="h-6 w-48 bg-purple-400/20 rounded" />
        </div>

        {/* Portfolio stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-6 border-2 border-blue-500/30"
            >
              <div className="h-5 w-32 bg-blue-400/30 rounded mb-3" />
              <div className="h-8 w-40 bg-blue-400/30 rounded mb-2" />
              <div className="h-4 w-24 bg-blue-400/30 rounded" />
            </div>
          ))}
        </div>

        {/* Holdings section */}
        <div className="bg-gradient-to-br from-green-600/20 to-yellow-600/20 rounded-xl p-6 border-4 border-yellow-500/30 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 w-48 bg-yellow-400/30 rounded" />
            <div className="h-10 w-32 bg-green-500/30 rounded-lg border-2 border-green-600/30" />
          </div>

          {/* Holdings table skeleton */}
          <div className="space-y-3">
            {/* Table header */}
            <div className="grid grid-cols-5 gap-4 pb-3 border-b-2 border-yellow-500/30">
              {['Token', 'Amount', 'Value', 'P/L', 'Actions'].map((label, i) => (
                <div key={i} className="h-5 bg-yellow-400/30 rounded" />
              ))}
            </div>

            {/* Table rows */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-5 gap-4 py-3 border-b border-yellow-500/20">
                <div className="h-6 bg-yellow-400/30 rounded" />
                <div className="h-6 bg-yellow-400/30 rounded" />
                <div className="h-6 bg-yellow-400/30 rounded" />
                <div className="h-6 bg-green-400/30 rounded" />
                <div className="h-8 w-20 bg-blue-500/30 rounded-lg border-2 border-blue-600/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        <div className="bg-gradient-to-br from-pink-600/20 to-red-600/20 rounded-xl p-6 border-2 border-pink-500/30">
          <div className="h-8 w-56 bg-pink-400/30 rounded mb-4" />

          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-pink-500/30"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-pink-400/30 rounded-full" />
                  <div className="space-y-2">
                    <div className="h-5 w-32 bg-pink-400/30 rounded" />
                    <div className="h-4 w-24 bg-pink-400/30 rounded" />
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <div className="h-5 w-24 bg-pink-400/30 rounded ml-auto" />
                  <div className="h-4 w-20 bg-pink-400/30 rounded ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loading message */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full border-2 border-purple-500/30">
            <span className="text-2xl animate-bounce">💰</span>
            <span className="text-purple-300 font-bold">Loading Portfolio...</span>
          </div>
        </div>
      </div>
    </div>
  );
}
