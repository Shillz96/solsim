"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Coins, TrendingUp, Trophy, Users, Rocket } from "lucide-react"
import Image from "next/image"

interface WelcomeModalProps {
  open: boolean
  onClose: () => void
  onStartTour: () => void
}

export function WelcomeModal({ open, onClose, onStartTour }: WelcomeModalProps) {
  const features = [
    {
      icon: <Coins className="h-6 w-6" />,
      title: "Risk-Free Trading",
      description: "Practice with virtual SOL—no real money required",
    },
    {
      icon: <TrendingUp className="h-6 w-6" />,
      title: "Real Market Data",
      description: "Live prices from Solana DEXs powered by Helius",
    },
    {
      icon: <Trophy className="h-6 w-6" />,
      title: "Compete & Level Up",
      description: "Earn XP, climb leaderboards, unlock rewards",
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Learn from the Best",
      description: "Track top traders and copy winning strategies",
    },
  ]

  const handleStartTour = () => {
    onStartTour()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="w-[90vw] max-w-2xl mx-auto bg-card border-4 border-outline shadow-[8px_8px_0_var(--outline-black)] rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        aria-describedby="welcome-description"
      >
        <DialogHeader className="space-y-4">
          {/* Logo */}
          <div className="flex items-center justify-center mb-2">
            <DialogTitle className="sr-only">Welcome to 1UP SOL!</DialogTitle>
            <Image
              src="/navbarlogo.svg"
              alt="1UP SOL"
              width={240}
              height={72}
              priority
              className="h-auto w-auto max-w-[240px]"
            />
          </div>

          {/* Hero Message */}
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-mario text-outline drop-shadow-[2px_2px_0_var(--star-yellow)]">
              Level Up Your Trading Skills! 🎮
            </h2>
            <p
              id="welcome-description"
              className="text-base sm:text-lg text-[var(--pipe-600)] font-bold max-w-xl mx-auto"
            >
              Welcome to 1UP SOL—your risk-free training ground for mastering Solana trading!
            </p>
          </div>
        </DialogHeader>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex gap-3 p-4 bg-sky-50 rounded-xl border-3 border-outline shadow-[3px_3px_0_var(--outline-black)] hover:shadow-[4px_4px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all"
            >
              <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-star border-3 border-outline flex items-center justify-center text-outline shadow-[2px_2px_0_var(--outline-black)]">
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-outline mb-1">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--pipe-600)] font-semibold">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action Message */}
        <div className="bg-gradient-to-r from-[var(--luigi-green)]/10 to-[var(--star-yellow)]/10 rounded-xl border-3 border-outline p-4 mb-6">
          <p className="text-center text-sm sm:text-base text-outline font-bold">
            🚀 Ready to explore? Let's take a quick tour of the platform!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleStartTour}
            className="h-12 px-6 sm:px-8 text-base border-3 border-outline bg-luigi text-white hover:bg-luigi/90 shadow-[4px_4px_0_var(--outline-black)] hover:shadow-[5px_5px_0_var(--outline-black)] hover:-translate-y-0.5 transition-all font-mario rounded-lg"
          >
            <Rocket className="mr-2 h-5 w-5" />
            Start Tour
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="h-12 px-6 sm:px-8 text-base text-[var(--pipe-600)] hover:text-outline font-bold underline"
          >
            Skip for now
          </Button>
        </div>

        {/* Fine Print */}
        <p className="text-xs text-center text-[var(--pipe-500)] mt-4 font-semibold">
          You can replay this tour anytime from the help menu
        </p>
      </DialogContent>
    </Dialog>
  )
}
