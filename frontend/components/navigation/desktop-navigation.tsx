"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn, marioStyles } from "@/lib/utils"

// Navigation items configuration
const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    iconSrc: "/Home-10-24-2025.png",
    description: "Overview of your trading activity"
  },
  {
    name: "Trade",
    href: "/warp-pipes",
    iconSrc: "/Trade-10-24-2025.png",
    description: "Buy and sell tokens"
  },
  {
    name: "Pipe Network",
    href: "/pipe-network",
    iconSrc: "/Pipe-Network-10-24-2025.png",
    description: "Community hub and learning center"
  },
  {
    name: "Portfolio",
    href: "/portfolio",
    iconSrc: "/Portfolio-10-24-2025.png",
    description: "Track your positions and P&L"
  },
  {
    name: "Trending",
    href: "/trending",
    iconSrc: "/Trending-10-24-2025.png",
    description: "Discover popular tokens"
  }
]

// Icon mapping utility
const getIconSrc = (itemName: string, iconSrc: string) => {
  const iconMap: Record<string, string> = {
    'Trade': '/icons/mario/trade.png',
    'Portfolio': '/icons/mario/wallet.png',
    'Trending': '/icons/mario/trending.png',
    'Dashboard': '/icons/mario/home.png',
    'Pipe Network': '/icons/mario/chat.png',
  }
  return iconMap[itemName] || iconSrc
}

const getTextImageSrc = (itemName: string, iconSrc: string) => {
  const textMap: Record<string, string> = {
    'Trade': '/Trade-10-24-2025.png',
    'Portfolio': '/Portfolio-10-24-2025.png',
    'Trending': '/Trending-10-24-2025.png',
    'Dashboard': '/Home-10-24-2025.png',
    'Pipe Network': '/Pipe-Network-10-24-2025.png',
  }
  return textMap[itemName] || iconSrc
}

export function DesktopNavigation() {
  const pathname = usePathname()

  return (
    <nav className="hidden lg:flex items-center gap-2 flex-1 justify-center">
      {navigationItems.slice(0, 6).map((item) => {
        const isActive = pathname === item.href
        const iconSrc = getIconSrc(item.name, item.iconSrc)
        const textImageSrc = getTextImageSrc(item.name, item.iconSrc)

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              className={cn(
                "flex items-center gap-2 px-3 py-2 transition-all duration-200 font-mario text-xs h-10 w-auto",
                isActive && "bg-primary/10 text-primary"
              )}
            >
              <Image 
                src={iconSrc}
                alt={item.name} 
                width={16} 
                height={16} 
                className="object-contain hover:scale-105 transition-transform duration-200" 
              />
              <Image 
                src={textImageSrc}
                alt={item.name} 
                width={80} 
                height={20} 
                className="h-[20px] w-auto object-contain hover:scale-105 transition-transform duration-200" 
              />
            </Button>
          </Link>
        )
      })}
    </nav>
  )
}
