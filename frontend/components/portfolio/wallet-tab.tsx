"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { WalletManagementPanel } from "./wallet-management-panel"

/**
 * Wallet Tab - Dedicated Wallet Management
 * Full-width wallet management with room for expansion
 */
export function WalletTab() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--sky-blue)]/20 border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] p-6"
      >
        <div className="flex items-center gap-3">
          <Image src="/icons/mario/money-bag.png" alt="Wallet" width={48} height={48} />
          <div>
            <h2 className="text-2xl font-mario font-bold text-[var(--outline-black)]">WALLET MANAGER</h2>
            <p className="text-sm text-muted-foreground font-bold mt-1">
              Manage your wallets and track your balance
            </p>
          </div>
        </div>
      </motion.div>

      {/* Wallet Management Panel - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <WalletManagementPanel />
      </motion.div>

      {/* Future Expansion Areas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Placeholder for future features */}
        <div className="bg-[var(--card)]/50 border-3 border-dashed border-gray-400 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🔜</div>
          <h3 className="text-lg font-mario font-bold text-[var(--outline-black)] mb-2">TRANSACTION HISTORY</h3>
          <p className="text-sm text-muted-foreground font-bold">Coming soon!</p>
        </div>

        <div className="bg-[var(--card)]/50 border-3 border-dashed border-gray-400 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🔜</div>
          <h3 className="text-lg font-mario font-bold text-[var(--outline-black)] mb-2">WALLET ANALYTICS</h3>
          <p className="text-sm text-muted-foreground font-bold">Coming soon!</p>
        </div>
      </motion.div>
    </div>
  )
}
