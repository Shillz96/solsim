/**
 * Mario-Themed Pill-Style Tabs Component
 * Matches the aesthetic from the reference design (Overview/Coins/Stats style)
 */

"use client"

import { ReactNode, useState, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

interface MarioTabsProps {
  defaultValue: string
  value?: string
  onValueChange?: (value: string) => void
  children: ReactNode
  className?: string
}

export function MarioTabs({ defaultValue, value: controlledValue, onValueChange, children, className }: MarioTabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const value = controlledValue ?? internalValue
  
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn("flex flex-col", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface MarioTabsListProps {
  children: ReactNode
  className?: string
}

export function MarioTabsList({ children, className }: MarioTabsListProps) {
  return (
    <div 
      className={cn(
        "flex gap-2 p-1.5",
        "bg-white/40 rounded-xl",
        "border-[3px] border-[var(--outline-black)]",
        className
      )}
    >
      {children}
    </div>
  )
}

interface MarioTabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function MarioTabsTrigger({ value, children, className, disabled }: MarioTabsTriggerProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('MarioTabsTrigger must be used within MarioTabs')
  
  const isActive = context.value === value
  
  return (
    <button
      onClick={() => !disabled && context.onValueChange(value)}
      disabled={disabled}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 sm:gap-2",
        "px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg",
        "font-bold text-xs sm:text-sm uppercase tracking-wide",
        "border-[2px] border-[var(--outline-black)]",
        "transition-all duration-200",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        isActive ? [
          "bg-[var(--coin-gold)]",
          "text-[var(--outline-black)]",
          "shadow-[2px_2px_0_var(--outline-black)]",
          "translate-y-[1px]"
        ] : [
          "bg-white",
          "text-[var(--outline-black)]/70",
          "hover:bg-white/80 hover:text-[var(--outline-black)]",
          "active:translate-y-[1px]"
        ],
        className
      )}
    >
      {children}
    </button>
  )
}

interface MarioTabsContentProps {
  value: string
  children: ReactNode
  className?: string
}

export function MarioTabsContent({ value, children, className }: MarioTabsContentProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('MarioTabsContent must be used within MarioTabs')
  
  if (context.value !== value) return null
  
  return (
    <div className={cn("flex-1", className)}>
      {children}
    </div>
  )
}
