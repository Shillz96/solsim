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
    "border-4 border-[var(--outline-black)]",
    "shadow-[4px_4px_0_var(--outline-black)]",
    "rounded-[12px] md:rounded-[14px]",
    "transition-transform hover:-translate-y-[1px]"
  )

  const dims = size === "sm"
    ? "h-9 px-3 gap-3"
    : "h-11 px-3.5 gap-4"

  const inner = layout === "col"
    ? "grid grid-rows-[auto_auto] items-center leading-none -space-y-0.5"
    : "flex items-center leading-none"

  const Value = (
    <span className={cn(
      "tabular-nums font-extrabold",
      size === "sm" ? "text-[14px]" : "text-[16px]"
    )}>
      {value}
    </span>
  )

  const Label = label ? (
    <span className={cn(
      "uppercase font-black text-foreground/80",
      size === "sm" ? "text-[10px]" : "text-[11px]"
    )}>
      {label}
    </span>
  ) : null

  const Badge = badgeText ? (
    <div
      className={cn(
        "ml-auto grid place-items-center",
        size === "sm" ? "h-7 w-7 rounded-[10px]" : "h-8 w-8 rounded-[12px]",
        "text-white",
        "border-4 border-[var(--outline-black)]"
      )}
      style={{ backgroundColor: badgeColor }}
    >
      <span className={cn("font-extrabold", size === "sm" ? "text-[11px]" : "text-[12px]")}>
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
            {Label && <span className="text-[10px] font-black uppercase text-foreground/80">{label}</span>}
            <span className="font-extrabold text-[15px] md:text-[16px]">{value}</span>
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
