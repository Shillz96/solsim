"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

type As = "button" | "a" | "div" | "link"
type Props = {
  className?: string
  label?: string       // small top/bottom label
  value?: string       // big text
  badgeText?: string   // red square text e.g. "TO", "P", "L"
  href?: string
  onClick?: () => void
  layout?: "row" | "col"  // row = value + badge, col = stacked label/value
  size?: "sm" | "md"
  bgColor?: string     // custom background color (CSS variable)
  badgeColor?: string  // custom badge color (CSS variable)
}

export function CartridgePill({
  className,
  label,
  value,
  badgeText,
  href,
  onClick,
  layout = "row",
  size = "md",
  bgColor = "var(--star-yellow)",
  badgeColor = "var(--mario-red)",
}: Props) {
  const base = cn(
    "relative grid items-center",
    "border-3 md:border-4 border-[var(--outline-black)]",
    "shadow-[3px_3px_0_var(--outline-black)] md:shadow-[4px_4px_0_var(--outline-black)]",
    "rounded-[10px] md:rounded-[14px]",
    "transition-transform hover:-translate-y-[1px]"
  )

  const dims = size === "sm"
    ? "h-8 md:h-9 px-2.5 md:px-3 gap-2 md:gap-3"
    : "h-9 md:h-11 px-3 md:px-3.5 gap-3 md:gap-4"

  const inner = layout === "col"
    ? "grid grid-rows-[auto_auto] items-center leading-none -space-y-0.5"
    : "flex items-center leading-none"

  const Value = (
    <span className={cn(
      "tabular-nums font-extrabold truncate max-w-[120px] sm:max-w-[180px] md:max-w-none",
      size === "sm" ? "text-[12px] md:text-[14px]" : "text-[14px] md:text-[16px]"
    )}>
      {value}
    </span>
  )

  const Label = label ? (
    <span className={cn(
      "uppercase font-black text-foreground/80 truncate",
      size === "sm" ? "text-[9px] md:text-[10px]" : "text-[10px] md:text-[11px]"
    )}>
      {label}
    </span>
  ) : null

  const Badge = badgeText ? (
    <div
      className={cn(
        "ml-auto grid place-items-center flex-shrink-0",
        size === "sm" ? "h-6 w-6 md:h-7 md:w-7 rounded-[8px] md:rounded-[10px]" : "h-7 w-7 md:h-8 md:w-8 rounded-[10px] md:rounded-[12px]",
        "text-white",
        "border-3 md:border-4 border-[var(--outline-black)]"
      )}
      style={{ backgroundColor: badgeColor }}
    >
      <span className={cn("font-extrabold", size === "sm" ? "text-[10px] md:text-[11px]" : "text-[11px] md:text-[12px]")}>
        {badgeText}
      </span>
    </div>
  ) : null

  const Content = (
    <motion.div
      whileHover={{ y: -1 }}
      className={cn(base, dims, className)}
      style={{ backgroundColor: bgColor }}
    >
      <div className={inner}>
        {layout === "col" ? (
          <>
            {Value}
            {Label}
          </>
        ) : (
          <>
            {Label && <span className="text-[9px] md:text-[10px] font-black uppercase text-foreground/80 truncate">{label}</span>}
            <span className="font-extrabold text-[13px] md:text-[16px] truncate">{value}</span>
          </>
        )}
      </div>
      {Badge}
    </motion.div>
  )

  if (href) {
    return (
      <Link href={href} className="inline-block" onClick={onClick}>
        {Content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className="inline-block">
      {Content}
    </button>
  )
}
