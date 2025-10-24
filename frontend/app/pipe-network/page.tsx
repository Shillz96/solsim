'use client'

/**
 * Pipe Network Page - Community Hub
 *
 * Features:
 * - Large community chat (main focus, centered)
 * - Feature highlights sidebar
 * - FAQ section
 * - Social media & documentation links
 * - Mario-themed styling matching portfolio/trending pages
 */

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChatRoom } from '@/components/chat/chat-room'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { 
  Rocket, 
  TrendingUp, 
  Wallet, 
  Twitter, 
  MessageCircle,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Trophy,
  Zap,
  Home
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function PipeNetworkPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const features = [
    {
      icon: '🚀',
      title: 'Warp Pipes',
      description: 'Discover new tokens',
      link: '/warp-pipes',
      color: 'from-[var(--luigi-green)] to-emerald-500'
    },
    {
      icon: '📈',
      title: 'Trading',
      description: 'Practice strategies',
      link: '/trade',
      color: 'from-[var(--star-yellow)] to-amber-400'
    },
    {
      icon: '💼',
      title: 'Portfolio',
      description: 'Track positions',
      link: '/portfolio',
      color: 'from-[var(--coin-gold)] to-[var(--coin-yellow)]'
    },
    {
      icon: '🏆',
      title: 'Leaderboard',
      description: 'Compete & earn',
      link: '/leaderboard',
      color: 'from-[var(--mario-red)] to-red-500'
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
      question: 'Can I trade real tokens?',
      answer: 'SolSim is currently a paper trading platform. Real trading features are coming soon! For now, use it to practice and develop winning strategies.'
    }
  ]

  const quickLinks = [
    { href: '/', icon: Home, label: 'Home', color: 'bg-[var(--sky-blue)]' },
    { href: '/warp-pipes', icon: Rocket, label: 'Trade', color: 'bg-[var(--luigi-green)]' },
    { href: '/portfolio', icon: Wallet, label: 'Portfolio', color: 'bg-[var(--coin-gold)]' },
    { href: '/leaderboard', icon: Trophy, label: 'Ranks', color: 'bg-[var(--mario-red)]' },
  ]

  const socialLinks = [
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/solsim', iconSrc: '/icons/mario/star.png' },
    { name: 'Discord', icon: MessageCircle, href: 'https://discord.gg/solsim', iconSrc: '/icons/mario/mushroom.png' },
    { name: 'Docs', icon: FileText, href: '/docs', iconSrc: '/icons/mario/game.png' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <main className="container mx-auto px-4 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-[var(--luigi-green)]/20 to-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl p-6 shadow-[8px_8px_0_var(--outline-black)] relative overflow-hidden">
            <div className="absolute top-2 right-2 flex gap-2">
              <Image src="/icons/mario/star.png" alt="Star" width={24} height={24} className="animate-pulse" />
              <Image src="/icons/mario/mushroom.png" alt="Mushroom" width={24} height={24} />
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-[var(--luigi-green)] p-3 rounded-lg border-4 border-[var(--outline-black)] shadow-[4px_4px_0_var(--outline-black)]">
                <Image src="/Pipe-Network-10-24-2025.png" alt="Pipe Network" width={32} height={32} />
              </div>
              <div>
                <h1 className="text-3xl font-mario font-bold text-[var(--outline-black)]">PIPE NETWORK</h1>
                <p className="text-sm text-muted-foreground font-bold mt-1">Connect with the community & learn!</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Sidebar - Quick Links & Features */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* Quick Navigation */}
            <div className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Image src="/icons/mario/star.png" alt="Star" width={20} height={20} />
                <h3 className="text-sm font-mario font-bold text-[var(--outline-black)]">QUICK JUMP</h3>
              </div>
              <div className="space-y-2">
                {quickLinks.map((link, idx) => (
                  <Link
                    key={idx}
                    href={link.href}
                    className="flex items-center gap-2 p-2 rounded-lg border-2 border-[var(--outline-black)] bg-white hover:shadow-[3px_3px_0_var(--outline-black)] transition-all"
                  >
                    <div className={cn("h-6 w-6 rounded border-2 border-[var(--outline-black)] flex items-center justify-center", link.color)}>
                      <link.icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-xs font-mario font-bold">{link.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="bg-[var(--star-yellow)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-[var(--star-yellow)]" />
                <h3 className="text-sm font-mario font-bold text-[var(--outline-black)]">FEATURES</h3>
              </div>
              <div className="space-y-2">
                {features.map((feature, idx) => (
                  <Link
                    key={idx}
                    href={feature.link}
                    className="block p-3 rounded-lg border-3 border-[var(--outline-black)] bg-white hover:shadow-[3px_3px_0_var(--outline-black)] transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{feature.icon}</span>
                      <span className="text-xs font-mario font-bold">{feature.title}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{feature.description}</p>
                  </Link>
                ))}
              </div>
            </div>

            {/* Social Links */}
            <div className="bg-[var(--mario-red)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Image src="/icons/mario/fire.png" alt="Fire" width={20} height={20} />
                <h3 className="text-sm font-mario font-bold text-[var(--outline-black)]">CONNECT</h3>
              </div>
              <div className="space-y-2">
                {socialLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : '_self'}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="flex items-center gap-2 p-2 rounded-lg border-2 border-[var(--outline-black)] bg-white hover:shadow-[3px_3px_0_var(--outline-black)] transition-all"
                  >
                    <Image src={link.iconSrc} alt={link.name} width={20} height={20} />
                    <span className="text-xs font-mario font-bold">{link.name}</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                ))}
              </div>
            </div>
          </motion.aside>

          {/* Center - Large Chat */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-6"
          >
            <div className="bg-[var(--luigi-green)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[8px_8px_0_var(--outline-black)] overflow-hidden h-[calc(100vh-200px)] min-h-[600px]">
              <div className="bg-gradient-to-r from-[var(--luigi-green)] to-emerald-500 p-4 border-b-4 border-[var(--outline-black)]">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white border-3 border-[var(--outline-black)] flex items-center justify-center shadow-[3px_3px_0_var(--outline-black)]">
                    💬
                  </div>
                  <div>
                    <h2 className="font-mario font-bold text-xl text-white">COMMUNITY CHAT</h2>
                    <p className="text-white/90 text-xs">Connect with traders & get help</p>
                  </div>
                </div>
              </div>
              <div className="h-[calc(100%-76px)]">
                <ChatRoom tokenMint="community" className="h-full" />
              </div>
            </div>
          </motion.div>

          {/* Right Sidebar - FAQ & Tips */}
          <motion.aside
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-3 space-y-4"
          >
            {/* FAQ */}
            <div className="bg-[var(--coin-gold)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-[var(--star-yellow)]" />
                <h3 className="text-sm font-mario font-bold text-[var(--outline-black)]">FAQ</h3>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="border-3 border-[var(--outline-black)] rounded-lg bg-white overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      className="w-full p-2 flex items-center justify-between hover:bg-[var(--pipe-100)] transition-colors"
                    >
                      <span className="font-mario font-bold text-[10px] text-left">{faq.question}</span>
                      {expandedFaq === idx ? (
                        <ChevronUp className="h-3 w-3 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-3 w-3 flex-shrink-0" />
                      )}
                    </button>
                    {expandedFaq === idx && (
                      <div className="px-2 pb-2 pt-0 border-t-2 border-[var(--outline-black)] bg-[var(--pipe-100)]/30">
                        <p className="text-[10px] text-muted-foreground mt-2">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-gradient-to-br from-[var(--star-yellow)]/20 to-amber-50/50 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Image src="/icons/mario/trophy.png" alt="Trophy" width={20} height={20} />
                <h3 className="text-sm font-mario font-bold text-[var(--outline-black)]">PRO TIPS</h3>
              </div>
              <ul className="space-y-2 text-[10px]">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--luigi-green)] font-bold">•</span>
                  <span>Start small to learn the platform</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--luigi-green)] font-bold">•</span>
                  <span>Use filters to find quality tokens</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--luigi-green)] font-bold">•</span>
                  <span>Track performance in Portfolio</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--luigi-green)] font-bold">•</span>
                  <span>Join chat to learn from others</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--luigi-green)] font-bold">•</span>
                  <span>Compete on leaderboards</span>
                </li>
              </ul>
            </div>
          </motion.aside>

        </div>
      </main>
    </div>
  )
}
