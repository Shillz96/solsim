'use client'

/**
 * Pipe Network Page - Community Hub
 *
 * Features:
 * - Large community chat (main focus)
 * - Feature highlights (Warp Pipes, Trading, Portfolio)
 * - FAQ section
 * - Social media & documentation links
 * - Mario-themed styling
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChatRoom } from '@/components/chat/chat-room'
import { Button } from '@/components/ui/button'
import { 
  Rocket, 
  TrendingUp, 
  Wallet, 
  Search, 
  Twitter, 
  MessageCircle,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy,
  Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PipeNetworkPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const features = [
    {
      icon: Rocket,
      title: 'Warp Pipes',
      description: 'Discover new tokens across three stages: New Pairs, About to Graduate, and Bonded. Filter by health, volume, and more.',
      link: '/warp-pipes',
      gradient: 'from-[var(--luigi-green)] to-emerald-500',
      emoji: '🚀'
    },
    {
      icon: TrendingUp,
      title: 'Paper Trading',
      description: 'Practice trading with virtual SOL. Test strategies, learn the platform, and compete on leaderboards risk-free.',
      link: '/trade',
      gradient: 'from-[var(--star-yellow)] to-amber-400',
      emoji: '📈'
    },
    {
      icon: Wallet,
      title: 'Portfolio Tracking',
      description: 'Track all your positions with real-time P&L, FIFO accounting, and detailed trade history. See your gains at a glance.',
      link: '/portfolio',
      gradient: 'from-[var(--coin-gold)] to-[var(--coin-yellow)]',
      emoji: '💼'
    },
    {
      icon: Trophy,
      title: 'Leaderboards',
      description: 'Compete against other traders! Rank by total P&L, win rate, or portfolio value. Earn badges and recognition.',
      link: '/leaderboard',
      gradient: 'from-[var(--mario-red)] to-red-500',
      emoji: '🏆'
    }
  ]

  const faqs = [
    {
      question: 'What is SolSim?',
      answer: 'SolSim is a paper trading platform for Solana tokens. Practice trading strategies with virtual SOL, discover new tokens, and learn without risking real money.'
    },
    {
      question: 'How do I get started?',
      answer: 'Sign up with your email or connect a Solana wallet. You\'ll get virtual SOL to start trading immediately. Head to Warp Pipes to discover tokens or use the search bar to find specific tokens.'
    },
    {
      question: 'What are Warp Pipes?',
      answer: 'Warp Pipes is our token discovery hub with three columns: New Pairs (recently launched), About to Graduate (gaining traction), and Bonded (established tokens). Each column has advanced filters to find gems.'
    },
    {
      question: 'Is my virtual balance saved?',
      answer: 'Yes! Your balance, trades, and portfolio are saved to your account. You can access them from any device by logging in.'
    },
    {
      question: 'Can I trade real tokens?',
      answer: 'SolSim is currently a paper trading platform. Real trading features are coming soon! For now, use it to practice and develop winning strategies.'
    },
    {
      question: 'How do leaderboards work?',
      answer: 'Leaderboards rank traders by various metrics: Total P&L, Win Rate, Portfolio Value, and more. Compete for top spots and earn special badges!'
    }
  ]

  const socialLinks = [
    {
      name: 'Twitter',
      icon: Twitter,
      href: 'https://twitter.com/solsim',
      color: 'from-sky-400 to-blue-500'
    },
    {
      name: 'Discord',
      icon: MessageCircle,
      href: 'https://discord.gg/solsim',
      color: 'from-indigo-400 to-purple-500'
    },
    {
      name: 'Docs',
      icon: FileText,
      href: '/docs',
      color: 'from-[var(--star-yellow)] to-amber-400'
    }
  ]

  return (
    <div 
      className="flex flex-col bg-[var(--background)] overflow-hidden"
      style={{ 
        height: 'calc(100dvh - var(--navbar-height, 56px) - var(--trending-ticker-height, 60px) - var(--bottom-nav-height, 64px))',
        maxHeight: 'calc(100dvh - var(--navbar-height, 56px) - var(--trending-ticker-height, 60px) - var(--bottom-nav-height, 64px))'
      }}
    >
      {/* Header with Logo */}
      <div className="border-b-4 border-[var(--outline-black)] bg-gradient-to-r from-[var(--pipe-100)] to-white p-4 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="relative w-full max-w-2xl mx-auto">
            <Image
              src="/Pipe-Network-10-24-2025.png"
              alt="Pipe Network"
              width={800}
              height={120}
              className="w-full h-auto object-contain drop-shadow-lg"
              priority
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-3 font-mario">
            Welcome to the Pipe Network! Learn, chat, and explore everything SolSim has to offer.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          
          {/* Community Chat - Main Focus */}
          <section className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] bg-white overflow-hidden">
            <div className="bg-gradient-to-r from-[var(--luigi-green)] to-emerald-500 p-4 border-b-4 border-[var(--outline-black)]">
              <h2 className="font-mario font-bold text-xl text-white flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                💬 Community Chat
              </h2>
              <p className="text-white/90 text-sm mt-1">Connect with other traders, share insights, and get help</p>
            </div>
            <div style={{ height: '500px' }}>
              <ChatRoom tokenMint="community" className="h-full" />
            </div>
          </section>

          {/* Feature Highlights */}
          <section>
            <h2 className="font-mario font-bold text-2xl mb-4 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-[var(--star-yellow)]" />
              ✨ Platform Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, idx) => (
                <Link
                  key={idx}
                  href={feature.link}
                  className="group border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-1 transition-all bg-white overflow-hidden"
                >
                  <div className={cn(
                    "p-4 bg-gradient-to-br text-white border-b-4 border-[var(--outline-black)]",
                    feature.gradient
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm border-3 border-white/40 flex items-center justify-center text-2xl">
                        {feature.emoji}
                      </div>
                      <div>
                        <h3 className="font-mario font-bold text-lg">{feature.title}</h3>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-muted-foreground mb-3">{feature.description}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-3 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] hover:shadow-[3px_3px_0_var(--outline-black)] transition-all w-full font-bold"
                    >
                      Explore <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ Section */}
          <section>
            <h2 className="font-mario font-bold text-2xl mb-4 flex items-center gap-2">
              <Zap className="h-6 w-6 text-[var(--star-yellow)]" />
              ❓ Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] bg-white overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full p-4 flex items-center justify-between hover:bg-[var(--pipe-100)] transition-colors"
                  >
                    <h3 className="font-mario font-bold text-left">{faq.question}</h3>
                    {expandedFaq === idx ? (
                      <ChevronUp className="h-5 w-5 flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-5 w-5 flex-shrink-0 ml-2" />
                    )}
                  </button>
                  {expandedFaq === idx && (
                    <div className="px-4 pb-4 pt-0 border-t-4 border-[var(--outline-black)] bg-gradient-to-b from-[var(--pipe-100)]/30 to-white">
                      <p className="text-sm text-muted-foreground mt-3">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Social Links & Resources */}
          <section>
            <h2 className="font-mario font-bold text-2xl mb-4 flex items-center gap-2">
              <ExternalLink className="h-6 w-6 text-[var(--star-yellow)]" />
              🔗 Connect & Learn
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {socialLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : '_self'}
                  rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="group border-4 border-[var(--outline-black)] rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[6px_6px_0_var(--outline-black)] hover:-translate-y-1 transition-all bg-white overflow-hidden"
                >
                  <div className={cn(
                    "p-6 bg-gradient-to-br text-white flex flex-col items-center text-center gap-3",
                    link.color
                  )}>
                    <link.icon className="h-8 w-8" />
                    <h3 className="font-mario font-bold text-lg">{link.name}</h3>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Quick Tips */}
          <section className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] bg-gradient-to-br from-[var(--star-yellow)]/20 to-amber-50/50 p-6">
            <h3 className="font-mario font-bold text-xl mb-3 flex items-center gap-2">
              💡 Pro Tips
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-[var(--luigi-green)] font-bold">•</span>
                <span>Start with small trades to learn how the platform works</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--luigi-green)] font-bold">•</span>
                <span>Use Warp Pipes filters to find tokens that match your strategy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--luigi-green)] font-bold">•</span>
                <span>Check the Portfolio tab to track your performance over time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--luigi-green)] font-bold">•</span>
                <span>Join the community chat to learn from experienced traders</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--luigi-green)] font-bold">•</span>
                <span>Compete on leaderboards to test your skills against others</span>
              </li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  )
}
