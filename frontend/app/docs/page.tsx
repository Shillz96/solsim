"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, BookOpen, TrendingUp, Wallet, BarChart3, HelpCircle, ChevronRight, ArrowUp } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeSection, setActiveSection] = useState("")
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const sections = [
    {
      id: "getting-started",
      icon: BookOpen,
      title: "Getting Started",
      description: "Learn the basics of paper trading on Solana",
      content: {
        intro:
          "Sol Sim is a risk-free Solana trading simulator that lets you practice trading strategies with virtual SOL.",
        subsections: [
          {
            title: "What is Paper Trading?",
            content:
              "Paper trading allows you to simulate real trades without risking actual money. Perfect for learning and testing strategies.",
          },
          {
            title: "Creating Your Account",
            content: "Sign up with email to get started. You'll receive 100 virtual SOL to begin trading immediately.",
          },
          {
            title: "Understanding Virtual SOL",
            content:
              "Virtual SOL mimics real SOL but has no monetary value. Use it to practice trading without financial risk.",
          },
        ],
      },
    },
    {
      id: "trading",
      icon: TrendingUp,
      title: "Trading Guide",
      description: "Master the trading interface and strategies",
      content: {
        intro: "Learn how to execute trades, read charts, and manage your positions effectively.",
        subsections: [
          {
            title: "Placing Your First Trade",
            content: "Navigate to the Trade page, select a token, choose buy/sell, enter amount, and confirm.",
          },
          {
            title: "Reading the Chart",
            content: "Charts show price movements over time. Green candles = price up, red candles = price down.",
          },
          {
            title: "Managing Positions",
            content: "View your open positions in the Portfolio page. Track entry price, current price, and PnL.",
          },
        ],
      },
    },
    {
      id: "portfolio",
      icon: Wallet,
      title: "Portfolio Management",
      description: "Track and optimize your performance",
      content: {
        intro: "Monitor your trading performance, analyze trade history, and optimize your strategy.",
        subsections: [
          {
            title: "Understanding PnL",
            content: "Profit and Loss (PnL) shows how much you've gained or lost on your trades.",
          },
          {
            title: "Trade History",
            content: "Review all past trades to identify patterns and improve your strategy.",
          },
          {
            title: "Performance Metrics",
            content: "Track ROI, win rate, and total trades to measure your trading success.",
          },
        ],
      },
    },
    {
      id: "leaderboard",
      icon: BarChart3,
      title: "Leaderboard & Competition",
      description: "Compete with other traders",
      content: {
        intro: "Climb the leaderboard by achieving the highest ROI and completing successful trades.",
        subsections: [
          {
            title: "How Rankings Work",
            content: "Rankings are based on ROI percentage. Higher returns = higher rank.",
          },
          {
            title: "Time Filters",
            content: "View leaderboards for 24h, 7 days, or all-time to see different perspectives.",
          },
        ],
      },
    },
    {
      id: "faq",
      icon: HelpCircle,
      title: "FAQ",
      description: "Frequently asked questions",
      content: {
        intro: "Common questions and answers about Sol Sim.",
        subsections: [
          {
            title: "Are the prices real-time?",
            content: "Yes! We use live data from DexScreener and Birdeye APIs for accurate market prices.",
          },
          {
            title: "Can I reset my portfolio?",
            content: "Yes, you can reset your portfolio from the Profile settings page.",
          },
          {
            title: "How is PnL calculated?",
            content: "PnL = (Current Price - Entry Price) × Quantity. Displayed as both SOL and percentage.",
          },
        ],
      },
    },
  ]

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-16">
      <div className="mx-auto px-2 py-8 max-w-[2400px]">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Left Sidebar: TOC */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4">
              <div className="mb-6">
                <h2 className="font-space-grotesk text-2xl font-bold gradient-text mb-2">Documentation</h2>
                <p className="text-sm text-muted-foreground">Everything you need to know</p>
              </div>

              {/* Search */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-card border-border"
                />
              </div>

              {/* TOC */}
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon
                  const isActive = activeSection === section.id
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/10 text-primary border-l-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-card",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {section.title}
                    </a>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="space-y-12">
            {/* Mobile Header */}
            <div className="lg:hidden mb-8">
              <h1 className="mb-4 font-space-grotesk text-4xl font-bold gradient-text">Documentation</h1>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 bg-card border-border"
                />
              </div>
            </div>

            {/* Content Sections */}
            {sections.map((section) => {
              const Icon = section.icon
              return (
                <section key={section.id} id={section.id} className="scroll-mt-20">
                  <Card className="p-6 md:p-8 border-border bg-card">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary glow-primary">
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-space-grotesk text-2xl font-bold gradient-text">{section.title}</h2>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                    </div>

                    <p className="mb-6 text-foreground leading-relaxed">{section.content.intro}</p>

                    <div className="space-y-6">
                      {section.content.subsections.map((subsection, idx) => (
                        <div key={idx} className="border-l-2 border-secondary pl-4">
                          <h3 className="mb-2 font-semibold text-foreground flex items-center gap-2">
                            <ChevronRight className="h-4 w-4 text-secondary" />
                            {subsection.title}
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{subsection.content}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>
              )
            })}

            <Card className="p-8 border-primary/50 bg-gradient-to-br from-primary/5 to-secondary/5 text-center">
              <h2 className="mb-4 font-space-grotesk text-3xl font-bold gradient-text">Ready to trade without risk?</h2>
              <p className="mb-6 text-muted-foreground">
                Start practicing your trading strategies with 100 virtual SOL
              </p>
              <Link href="/trade">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                  Start Trading Now
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </Card>
          </main>
        </div>
      </div>

      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-20 right-6 md:bottom-20 z-50 rounded-full bg-primary text-primary-foreground shadow-lg glow-primary"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}
