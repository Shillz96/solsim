"use client"

/**
 * Launch Token Info Card Component
 * 
 * Mario-themed info card displayed above the launch form
 * Shows key information about token creation on Pump.fun
 */

import { cn } from "@/lib/utils"
import { Coins, Zap, CheckCircle, ArrowRight } from "lucide-react"

export function LaunchTokenCard() {
  return (
    <div className="mario-card bg-[var(--star-yellow)] border-4 border-[var(--outline-black)] shadow-[6px_6px_0_var(--outline-black)] rounded-xl p-6 mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[var(--mario-red)] border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg flex items-center justify-center">
          <Coins className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-mario text-xl text-[var(--outline-black)] font-black">
            Launch Your Token
          </h2>
          <p className="text-sm text-[var(--outline-black)]/80 font-semibold">
            Create tokens on Pump.fun bonding curve
          </p>
        </div>
      </div>

      {/* Features List */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[var(--luigi-green)] border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-[var(--outline-black)]">
            Create tokens on Pump.fun bonding curve
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[var(--luigi-green)] border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-[var(--outline-black)]">
            ~0.02 SOL creation fee
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[var(--luigi-green)] border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-[var(--outline-black)]">
            Token automatically listed
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[var(--luigi-green)] border-2 border-[var(--outline-black)] shadow-[2px_2px_0_var(--outline-black)] rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-[var(--outline-black)]">
            Trade immediately after launch
          </span>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-6 p-4 bg-white border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] rounded-lg">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--outline-black)]">
          <Zap className="w-4 h-4 text-[var(--star-yellow)]" />
          <span>Ready to launch? Fill out the form below!</span>
          <ArrowRight className="w-4 h-4 text-[var(--mario-red)] ml-auto" />
        </div>
      </div>
    </div>
  )
}
