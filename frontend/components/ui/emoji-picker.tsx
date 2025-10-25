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

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
      '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐',
    ]
  },
  {
    name: 'Symbols',
    icon: '🔥',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
      '🔥', '⭐', '✨', '💫', '⚡', '💥', '💢', '💯',
      '✅', '❌', '⭕', '🚫', '⚠️', '❓', '❗', '💤',
    ]
  },
  {
    name: 'Objects',
    icon: '🎮',
    emojis: [
      '🎮', '🕹️', '🎯', '🎲', '🎰', '🎪', '🎨', '🖼️',
      '💰', '💵', '💴', '💶', '💷', '💸', '💳', '🪙',
      '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '👑', '💎',
      '🚀', '🛸', '🌟', '⚽', '🏀', '🎾', '🏈', '⚾',
    ]
  },
  {
    name: 'Activities',
    icon: '🎨',
    emojis: [
      '🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🍰', '🧁',
      '🍕', '🍔', '🍟', '🌭', '🍿', '🧃', '🥤', '🍻',
      '🍀', '🌈', '☀️', '⛅', '🌙', '⭐', '💫', '✨',
      '🎵', '🎶', '🎤', '🎧', '🎸', '🎹', '🎺', '🎻',
    ]
  },
  {
    name: 'Travel',
    icon: '🚀',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑',
      '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵',
      '🚲', '🛴', '🛹', '🛼', '🚁', '🛩️', '✈️', '🚀',
      '🛸', '🚂', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝',
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
        emoji.includes(searchQuery)
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
          'border-4 border-[var(--pipe-green)] bg-white shadow-[8px_8px_0_rgba(0,0,0,0.2)]'
        )}
        align="end"
        side={position === 'auto' ? 'top' : position}
      >
        <div className="flex flex-col h-[400px]">
          {/* Header with Search */}
          <div className={cn(
            'p-3 border-b-4 border-[var(--outline-black)]',
            'bg-gradient-to-r from-[var(--pipe-green)]/10 to-[var(--luigi-green)]/10'
          )}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--outline-black)]/50" />
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
            <div className="p-2 border-b-4 border-[var(--outline-black)] bg-[var(--sky-blue)]/5">
              <div className={cn(marioStyles.bodyText('bold'), 'text-xs mb-2 px-1')}>
                Recently Used
              </div>
              <div className="grid grid-cols-8 gap-1">
                {recentEmojis.slice(0, 16).map((emoji, idx) => (
                  <button
                    key={`recent-${idx}`}
                    onClick={() => handleEmojiClick(emoji)}
                    className={cn(
                      'text-2xl p-1 rounded hover:bg-[var(--star-yellow)]/30',
                      'transition-colors duration-150',
                      'active:scale-95 transform'
                    )}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Tabs */}
          {!searchQuery && (
            <div className="flex gap-1 p-2 border-b-4 border-[var(--outline-black)] bg-[var(--pipe-green)]/5">
              {EMOJI_CATEGORIES.map((category, idx) => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(idx)}
                  className={cn(
                    'flex-1 text-xl p-2 rounded transition-colors',
                    selectedCategory === idx
                      ? 'bg-[var(--star-yellow)] shadow-[0_4px_0_rgba(0,0,0,0.1)]'
                      : 'hover:bg-[var(--pipe-green)]/20'
                  )}
                  title={category.name}
                >
                  {category.icon}
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
                    'text-2xl p-2 rounded hover:bg-[var(--star-yellow)]/30',
                    'transition-colors duration-150',
                    'active:scale-95 transform'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            {filteredEmojis.length === 0 && (
              <div className="text-center py-8 text-[var(--outline-black)]/50">
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
