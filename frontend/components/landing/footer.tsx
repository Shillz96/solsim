import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t-4 border-mario-yellow bg-gradient-to-br from-mario-blue via-mario-red to-mario-green text-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-4 left-4 text-6xl">🍄</div>
        <div className="absolute top-4 right-4 text-6xl">⭐</div>
        <div className="absolute bottom-4 left-1/4 text-5xl">🪙</div>
        <div className="absolute bottom-4 right-1/4 text-5xl">🏆</div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-3 group">
              <span className="font-mario text-3xl tracking-tight group-hover:scale-110 transition-transform duration-200 text-mario-yellow" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                1UP SOL
              </span>
            </Link>
            <p className="text-sm text-white/80 leading-relaxed">
              Level up your trading game! Practice Solana trading with real market data. Zero risk, maximum XP. 🎮
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-white text-lg">Product 🎮</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/trade" className="text-white/70 hover:text-white transition-colors hover:translate-x-1 inline-block">
                  → Trade
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="text-white/70 hover:text-white transition-colors hover:translate-x-1 inline-block">
                  → Portfolio
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-white/70 hover:text-white transition-colors hover:translate-x-1 inline-block">
                  → Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-white text-lg">Resources 📚</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs" className="text-white/70 hover:text-white transition-colors hover:translate-x-1 inline-block">
                  → Documentation
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white/70 hover:text-white transition-colors hover:translate-x-1 inline-block">
                  → About
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-white text-lg">Community 🌟</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://x.com/virtualsol_fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white transition-colors hover:translate-x-1 inline-block"
                >
                  → Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t-2 border-white/30 text-center">
          <p className="text-sm text-white/80 font-medium">© 2025 1UP SOL. All rights reserved. 🎮</p>
          <p className="mt-2 text-xs text-white/60 max-w-2xl mx-auto leading-relaxed">
            <strong className="text-white">Disclaimer:</strong> 1UP SOL is a trading simulator game. No real financial risk is involved. Level up responsibly! 🍄
          </p>
        </div>
      </div>
    </footer>
  )
}
