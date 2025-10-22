import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center group">
              <span className="mario-font text-2xl tracking-tight group-hover:scale-105 transition-transform duration-200 text-star">
                1UP SOL
              </span>
            </Link>
            <p className="text-sm text-background/60">
              Level up your trading game! Practice Solana trading with real market data. Zero risk, maximum XP.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/trade" className="text-background/60 hover:text-background transition-colors">
                  Trade
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="text-background/60 hover:text-background transition-colors">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-background/60 hover:text-background transition-colors">
                  Leaderboard
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/docs" className="text-background/60 hover:text-background transition-colors">
                  Documentation
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-background/60 hover:text-background transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Community</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://x.com/virtualsol_fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-background/60 hover:text-background transition-colors"
                >
                  Twitter
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-sm text-background/60">© 2025 1UP SOL. All rights reserved.</p>
          <p className="mt-2 text-xs text-background/40">
            <strong>Disclaimer:</strong> 1UP SOL is a trading simulator game. No real financial risk is involved. Level up responsibly!
          </p>
        </div>
      </div>
    </footer>
  )
}
