'use client'

/**
 * Mario-Themed Emoji Picker
 * 
 * Features:
 * - Adaptive positioning (top/bottom/modal)
 * - Category-based organization
 * - Search functionality
 * - Frequently used emojis
 * - Mario theme colors
 */

import { useState, useRef, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Smile, Search } from 'lucide-react'
import { cn, marioStyles } from '@/lib/utils'
import Image from 'next/image'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  position?: 'top' | 'bottom' | 'auto'
  className?: string
}

interface EmojiCategory {
  name: string
  icon: string
  emojis: string[]
}

// Custom emoji images from /public/emojis
const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Reactions',
    icon: '/emojis/1263-pepecrypto.png',
    emojis: [
      '/emojis/1263-pepecrypto.png',
      '/emojis/9266-pepecrypto.png',
      '/emojis/2452-peeponotstonks.png',
      '/emojis/3264-peepostonks.png',
      '/emojis/2884-pou-sob.png',
      '/emojis/1560_Panik.png',
      '/emojis/5852_hodl.png',
      '/emojis/7727-kiisu-crypto.png',
    ]
  },
  {
    name: 'Stonks',
    icon: '/emojis/37710-stonks.png',
    emojis: [
      '/emojis/37710-stonks.png',
      '/emojis/9861-caostonks.png',
      '/emojis/7554-notstonks.png',
      '/emojis/8052-caonotstonks.png',
      '/emojis/9274-stonkz.gif',
      '/emojis/5279-cryptopathetic.png',
    ]
  },
  {
    name: 'Crypto',
    icon: '/emojis/1425-bitcoin.png',
    emojis: [
      '/emojis/1425-bitcoin.png',
      '/emojis/23493-bitcoin.gif',
      '/emojis/19845-solana.png',
      '/emojis/3031-ethereum.png',
      '/emojis/6121-tether.png',
      '/emojis/41342-trxcrypto.png',
      '/emojis/45166-avalanche.png',
      '/emojis/47311-ltc.png',
      '/emojis/8488-cryptoinstitute.png',
    ]
  },
  {
    name: 'Special',
    icon: '/emojis/18998-crown.gif',
    emojis: [
      '/emojis/18998-crown.gif',
      '/emojis/16985-fire.gif',
      '/emojis/92152-diamond.gif',
      '/emojis/91872-money.gif',
      '/emojis/98603-verified.gif',
      '/emojis/30489-pioneer.gif',
      '/emojis/4328-3d-whale-emoji.png',
      '/emojis/41304-kittyspin.gif',
    ]
  },
  {
    name: 'Tools',
    icon: '/emojis/4224-phantom-wallet.png',
    emojis: [
      '/emojis/4224-phantom-wallet.png',
      '/emojis/6190-phantom-solana.png',
      '/emojis/6833-poocoin.png',
      '/emojis/37700-sellix-logo.png',
      '/emojis/51662-matrix.gif',
      '/emojis/80206-hacker.gif',
      '/emojis/91118-caw2.png',
    ]
  },
]

export function EmojiPicker({ onEmojiSelect, position = 'auto', className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentEmojis, setRecentEmojis] = useState<string[]>([])

  // Load recent emojis from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recentEmojis')
      if (saved) {
        try {
          setRecentEmojis(JSON.parse(saved))
        } catch (e) {
          console.error('Failed to parse recent emojis:', e)
        }
      }
    }
  }, [])

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji)
    
    // Update recent emojis
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 24)
    setRecentEmojis(updated)
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('recentEmojis', JSON.stringify(updated))
    }
    
    setOpen(false)
  }

  const filteredEmojis = searchQuery
    ? EMOJI_CATEGORIES.flatMap(cat => cat.emojis).filter(emoji =>
        emoji.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : EMOJI_CATEGORIES[selectedCategory].emojis

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            marioStyles.button('outline'),
            'h-10 w-10',
            className
          )}
          title="Add emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          'w-[320px] p-0',
          marioStyles.border('lg'),
          'border-4 border-pipe bg-white shadow-[8px_8px_0_rgba(0,0,0,0.2)]'
        )}
        align="end"
        side={position === 'auto' ? 'top' : position}
      >
        <div className="flex flex-col h-[400px]">
          {/* Header with Search */}
          <div className={cn(
            'p-3 border-b-4 border-outline',
            'bg-gradient-to-r from-[var(--pipe-green)]/10 to-[var(--luigi-green)]/10'
          )}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-outline/50" />
              <Input
                placeholder="Search emojis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  marioStyles.input(),
                  'pl-9 h-9'
                )}
              />
            </div>
          </div>

          {/* Recent Emojis */}
          {!searchQuery && recentEmojis.length > 0 && (
            <div className="p-2 border-b-4 border-outline bg-sky/5">
              <div className={cn(marioStyles.bodyText('bold'), 'text-xs mb-2 px-1')}>
                Recently Used
              </div>
              <div className="grid grid-cols-8 gap-1">
                {recentEmojis.slice(0, 16).map((emoji, idx) => (
                  <button
                    key={`recent-${idx}`}
                    onClick={() => handleEmojiClick(emoji)}
                    className={cn(
                      'p-1 rounded hover:bg-star/30',
                      'transition-colors duration-150',
                      'active:scale-95 transform',
                      'w-10 h-10 flex items-center justify-center'
                    )}
                  >
                    <Image 
                      src={emoji} 
                      alt="emoji" 
                      width={32} 
                      height={32}
                      className="object-contain"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Tabs */}
          {!searchQuery && (
            <div className="flex gap-1 p-2 border-b-4 border-outline bg-pipe/5">
              {EMOJI_CATEGORIES.map((category, idx) => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(idx)}
                  className={cn(
                    'flex-1 p-2 rounded transition-colors',
                    'w-10 h-10 flex items-center justify-center',
                    selectedCategory === idx
                      ? 'bg-star shadow-[0_4px_0_rgba(0,0,0,0.1)]'
                      : 'hover:bg-pipe/20'
                  )}
                  title={category.name}
                >
                  <Image 
                    src={category.icon} 
                    alt={category.name} 
                    width={24} 
                    height={24}
                    className="object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Emoji Grid */}
          <ScrollArea className="flex-1 p-3">
            <div className="grid grid-cols-8 gap-1">
              {filteredEmojis.map((emoji, idx) => (
                <button
                  key={`emoji-${idx}`}
                  onClick={() => handleEmojiClick(emoji)}
                  className={cn(
                    'p-2 rounded hover:bg-star/30',
                    'transition-colors duration-150',
                    'active:scale-95 transform',
                    'w-10 h-10 flex items-center justify-center'
                  )}
                >
                  <Image 
                    src={emoji} 
                    alt="emoji" 
                    width={32} 
                    height={32}
                    className="object-contain"
                  />
                </button>
              ))}
            </div>
            {filteredEmojis.length === 0 && (
              <div className="text-center py-8 text-outline/50">
                <div className="text-3xl mb-2">🤷</div>
                <div className={marioStyles.bodyText('medium')}>No emojis found</div>
              </div>
            )}
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  )
}
