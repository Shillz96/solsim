/**
 * Social Hover Card Component - Reusable social link hover card
 *
 * Displays social platform information in a consistent Mario-themed hover card
 */

import Image from "next/image"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

interface SocialHoverCardProps {
  platform: 'twitter' | 'telegram' | 'website'
  url: string
  tokenName?: string
  tokenSymbol?: string
  description?: string
  className?: string
}

const PLATFORM_CONFIG = {
  twitter: {
    icon: "/x-logo/logo.svg",
    alt: "X/Twitter",
    emoji: "🐦",
    bgColor: "var(--sky-blue)",
    urlPrefix: "https://twitter.com/",
    label: "view on X"
  },
  telegram: {
    icon: "/icons/social/telegram-icon.svg",
    alt: "Telegram",
    emoji: "✈️",
    bgColor: "var(--luigi-green)",
    urlPrefix: "https://t.me/",
    label: "join Telegram"
  },
  website: {
    icon: "/icons/social/globe-icon.svg",
    alt: "Website",
    emoji: "🌐",
    bgColor: "var(--star-yellow)",
    urlPrefix: "https://",
    label: "visit website"
  }
}

export function SocialHoverCard({
  platform,
  url,
  tokenName,
  tokenSymbol,
  description,
  className
}: SocialHoverCardProps) {
  const config = PLATFORM_CONFIG[platform]
  const fullUrl = url.startsWith('http') ? url : `${config.urlPrefix}${url}`
  const displayValue = platform === 'twitter' ? `@${url}` : url

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`hover:scale-110 transition-transform ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Image 
            src={config.icon}
            alt={config.alt}
            width={14}
            height={14}
            className={platform === 'twitter' ? 'inline-block filter brightness-0' : 'inline-block'}
          />
        </a>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-80 p-4 bg-white border-4 border-[var(--outline-black)] rounded-xl shadow-[6px_6px_0_var(--outline-black)] z-popover"
        side="top"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl border-3 border-[var(--outline-black)] shadow-[3px_3px_0_var(--outline-black)] ${platform === 'twitter' ? 'font-bold' : ''}`}
              style={{ backgroundColor: config.bgColor }}
            >
              {platform === 'twitter' ? (tokenSymbol?.[0] || '?') : config.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-base truncate text-[var(--outline-black)]">
                {tokenName || tokenSymbol}
              </div>
              <div className="text-sm text-[var(--outline-black)] opacity-60 truncate break-all font-bold">
                {displayValue}
              </div>
            </div>
          </div>
          {description && (
            <p className="text-sm line-clamp-3 text-[var(--outline-black)] opacity-80 font-medium leading-relaxed">
              {description}
            </p>
          )}
          <div className="pt-1 border-t-2 border-[var(--outline-black)] border-opacity-20">
            <span className="text-xs text-[var(--outline-black)] opacity-60 font-bold">
              Click to {config.label} →
            </span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
