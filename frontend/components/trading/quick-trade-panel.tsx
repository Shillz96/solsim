"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Zap, TrendingUp, TrendingDown, X, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { formatTokenQuantity } from "@/lib/format"
import { motion, AnimatePresence } from "framer-motion"

interface QuickTradePanelProps {
  tokenSymbol: string
  currentPrice: number
  solPrice: number
  balance: number
  tokenBalance: number
  onBuy: (amount: number) => void
  onSell: (percentage: number) => void
  isTrading: boolean
}

export function QuickTradePanel({
  tokenSymbol,
  currentPrice,
  solPrice,
  balance,
  tokenBalance,
  onBuy,
  onSell,
  isTrading
}: QuickTradePanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [buyAmount, setBuyAmount] = useState("")
  const [sellPercent, setSellPercent] = useState("")
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('quick-trade-position')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setPosition(parsed)
      } catch (e) {
        // Invalid saved position, use default
      }
    }
  }, [])

  // Save position to localStorage
  const savePosition = (newPosition: { x: number; y: number }) => {
    setPosition(newPosition)
    localStorage.setItem('quick-trade-position', JSON.stringify(newPosition))
  }

  const handleBuy = () => {
    const amount = parseFloat(buyAmount)
    if (!isNaN(amount) && amount > 0 && amount <= balance) {
      onBuy(amount)
      setBuyAmount("")
    }
  }

  const handleSell = () => {
    const percent = parseFloat(sellPercent)
    if (!isNaN(percent) && percent > 0 && percent <= 100) {
      onSell(percent)
      setSellPercent("")
    }
  }

  const quickBuyPresets = [1, 5, 10]
  const quickSellPresets = [25, 50, 100]

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-sticky"
          >
            <Button
              size="lg"
              onClick={() => setIsOpen(true)}
              className={cn(
                "h-14 w-14 md:h-14 md:w-14 rounded-full p-0",
                "bg-star hover:bg-star/90",
                "border-[3px] md:border-4 border-outline",
                "shadow-[4px_4px_0_var(--outline-black)] md:shadow-[6px_6px_0_var(--outline-black)]",
                "hover:shadow-[6px_6px_0_var(--outline-black)] md:hover:shadow-[8px_8px_0_var(--outline-black)]",
                "hover:-translate-y-[2px]",
                "transition-all",
                "touch-manipulation"
              )}
              title="Quick Trade"
            >
              <Zap className="h-6 w-6 text-outline" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Trade Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-popover md:hidden"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              ref={panelRef}
              initial={{ scale: 0.8, opacity: 0, y: window.innerWidth < 768 ? 100 : 0 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: window.innerWidth < 768 ? 100 : 0 }}
              drag={window.innerWidth >= 768 ? true : false}
              dragMomentum={false}
              onDragEnd={(e, info) => {
                if (window.innerWidth >= 768) {
                  savePosition({ x: info.offset.x, y: info.offset.y })
                }
              }}
              style={window.innerWidth >= 768 ? { x: position.x, y: position.y } : {}}
              className={cn(
                "fixed z-popover",
                // Mobile: full screen bottom sheet
                "inset-x-0 bottom-0 rounded-t-2xl max-h-[85vh]",
                // Desktop: floating panel
                "md:inset-auto md:bottom-6 md:right-6 md:rounded-xl md:max-h-none",
                "w-full md:w-80",
                "p-5 md:p-4",
                "bg-card",
                "border-[3px] md:border-4 border-outline border-b-0 md:border-b-[3px]",
                "shadow-[0_-4px_0_var(--outline-black)] md:shadow-[8px_8px_0_var(--outline-black)]",
                "md:cursor-move",
                "overflow-y-auto"
              )}
            >
            {/* Header with drag handle */}
            <div className="flex items-center justify-between mb-4 md:cursor-grab md:active:cursor-grabbing">
              <div className="flex items-center gap-2">
                <GripVertical className="hidden md:block h-4 w-4 text-outline/40" />
                <h3 className="font-mario text-[16px] md:text-[14px] text-outline">
                  ⚡ QUICK TRADE
                </h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 md:h-6 md:w-6 p-0 touch-manipulation"
                aria-label="Close"
              >
                <X className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </div>

            {/* Price display */}
            <div className="mb-4 p-2 bg-background/50 border-2 border-outline/20 rounded">
              <div className="text-[10px] text-outline/70 uppercase font-bold mb-1">
                {tokenSymbol} Price
              </div>
              <AnimatedNumber
                value={currentPrice}
                prefix="$"
                decimals={8}
                className="font-mono text-[16px] font-bold"
                colorize={false}
                glowOnChange={true}
              />
            </div>

            {/* Buy Section */}
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3 w-3 text-luigi" />
                <span className="text-[11px] font-bold uppercase text-outline">
                  Quick Buy (SOL)
                </span>
              </div>

              <div className="flex gap-2 mb-2">
                {quickBuyPresets.map((amount) => (
                  <Button
                    key={amount}
                    size="sm"
                    onClick={() => {
                      setBuyAmount(amount.toString())
                      setTimeout(handleBuy, 100)
                    }}
                    disabled={isTrading || amount > balance}
                    className={cn(
                      "flex-1 h-10 md:h-8 text-[13px] md:text-[11px] font-bold",
                      "bg-luigi hover:bg-luigi/90",
                      "border-2 border-outline",
                      "touch-manipulation",
                      amount > balance && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {amount}
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Custom"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="flex-1 h-10 md:h-8 text-[16px] md:text-xs touch-manipulation"
                  step="0.1"
                  max={balance}
                />
                <Button
                  size="sm"
                  onClick={handleBuy}
                  disabled={isTrading || !buyAmount || parseFloat(buyAmount) > balance}
                  className="h-10 md:h-8 px-4 bg-luigi hover:bg-luigi/90 touch-manipulation"
                >
                  Buy
                </Button>
              </div>
            </div>

            {/* Sell Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-3 w-3 text-mario" />
                <span className="text-[11px] font-bold uppercase text-outline">
                  Quick Sell (%)
                </span>
              </div>

              <div className="flex gap-2 mb-2">
                {quickSellPresets.map((percent) => (
                  <Button
                    key={percent}
                    size="sm"
                    onClick={() => {
                      setSellPercent(percent.toString())
                      setTimeout(handleSell, 100)
                    }}
                    disabled={isTrading || tokenBalance <= 0}
                    className={cn(
                      "flex-1 h-10 md:h-8 text-[13px] md:text-[11px] font-bold",
                      "bg-mario hover:bg-mario/90",
                      "border-2 border-outline",
                      "touch-manipulation",
                      tokenBalance <= 0 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {percent}%
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="Custom %"
                  value={sellPercent}
                  onChange={(e) => setSellPercent(e.target.value)}
                  className="flex-1 h-10 md:h-8 text-[16px] md:text-xs touch-manipulation"
                  step="1"
                  min="1"
                  max="100"
                />
                <Button
                  size="sm"
                  onClick={handleSell}
                  disabled={isTrading || !sellPercent || tokenBalance <= 0}
                  className="h-10 md:h-8 px-4 bg-mario hover:bg-mario/90 touch-manipulation"
                >
                  Sell
                </Button>
              </div>
            </div>

            {/* Balance info */}
            <div className="mt-3 pt-3 border-t border-outline/20 text-[9px] md:text-[9px] text-outline/60 space-y-1">
              <div className="flex justify-between">
                <span>SOL Balance:</span>
                <span className="font-mono font-bold">{balance.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{tokenSymbol} Holdings:</span>
                <span className="font-mono font-bold">{formatTokenQuantity(tokenBalance)}</span>
              </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
