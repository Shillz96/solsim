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
    gradient: "from-blue-400 to-blue-600",
    urlPrefix: "https://twitter.com/",
    label: "view on X"
  },
  telegram: {
    icon: "/icons/social/telegram-icon.svg",
    alt: "Telegram",
    emoji: "✈️",
    gradient: "from-blue-500 to-cyan-500",
    urlPrefix: "https://t.me/",
    label: "join Telegram"
  },
  website: {
    icon: "/icons/social/globe-icon.svg",
    alt: "Website",
    emoji: "🌐",
    gradient: "from-purple-500 to-pink-500",
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
        className="w-80 p-4 bg-card border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] z-50"
        side="top"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white text-2xl border-3 border-outline ${platform === 'twitter' ? 'font-bold' : ''}`}>
              {platform === 'twitter' ? (tokenSymbol?.[0] || '?') : config.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-base truncate text-outline">
                {tokenName || tokenSymbol}
              </div>
              <div className="text-sm text-pipe-600 truncate break-all">
                {displayValue}
              </div>
            </div>
          </div>
          <p className="text-sm line-clamp-3 text-outline">
            {description || `Click to ${config.label} →`}
          </p>
          <div className="flex gap-4 text-xs text-pipe-600 font-bold">
            <span>Click to {config.label} →</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
