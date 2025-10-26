import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t-4 border-star bg-gradient-to-br from-[var(--super-blue)] via-[var(--mario-red)] to-[var(--luigi-green)] text-white relative overflow-hidden">
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
              <span className="font-mario text-3xl tracking-tight group-hover:scale-110 transition-transform duration-200 text-star" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                1UP SOL
              </span>
            </Link>
            <p className="text-sm text-white font-semibold leading-relaxed" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>
              Level up your trading game! Practice Solana trading with real market data. Zero risk, maximum XP. 🎮
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-white text-lg" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>Product 🎮</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/warp-pipes" className="text-white font-semibold hover:text-star transition-colors hover:translate-x-1 inline-block" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}>
                  → Trade
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="text-white font-semibold hover:text-star transition-colors hover:translate-x-1 inline-block" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}>
                  → Portfolio
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-white font-semibold hover:text-star transition-colors hover:translate-x-1 inline-block" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}>
                  → Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-white text-lg" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>Resources 📚</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs" className="text-white font-semibold hover:text-star transition-colors hover:translate-x-1 inline-block" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}>
                  → Documentation
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-white font-semibold hover:text-star transition-colors hover:translate-x-1 inline-block" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}>
                  → About
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-white text-lg" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>Community 🌟</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://x.com/1upsol_fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white font-semibold hover:text-star transition-colors hover:translate-x-1 inline-block"
                  style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}
                >
                  → X (Twitter)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t-2 border-white/30 text-center">
          <p className="text-sm text-white font-bold" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.9)' }}>© 2025 1UP SOL. All rights reserved. 🎮</p>
          <p className="mt-2 text-xs text-white font-semibold max-w-2xl mx-auto leading-relaxed" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.9)' }}>
            <strong className="text-star">Disclaimer:</strong> 1UP SOL is a trading simulator game. No real financial risk is involved. Level up responsibly! 🍄
          </p>
        </div>
      </div>
    </footer>
  )
}
