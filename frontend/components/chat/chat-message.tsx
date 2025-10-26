'use client'

/**
 * Chat Message Item Component
 * 
 * Individual message with:
 * - User info (avatar, name, badges, tier)
 * - Message content with emojis
 * - Timestamp
 * - Inline moderation actions (hover menu for mods)
 */

import { useState } from 'react'
import { cn, marioStyles, createSafeImageProps } from '@/lib/utils'
import Image from 'next/image'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { MoreVertical, Trash2, UserX, AlertCircle, Shield } from 'lucide-react'
import { useModeration } from '@/hooks/use-moderation'
import { useAuth } from '@/hooks/use-auth'

// Helper function to parse message content and render emojis as images
function renderMessageContent(content: string) {
  // Decode any HTML entities that might have been encoded
  let decodedContent = content
  if (typeof window !== 'undefined') {
    const textarea = document.createElement('textarea')
    textarea.innerHTML = content
    decodedContent = textarea.value
  }
  
  // Regex to match /emojis/filename.png or /emojis/filename.gif
  const emojiRegex = /\/emojis\/[a-zA-Z0-9_-]+\.(png|gif)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  
  // Use matchAll for cleaner iteration
  const matches = Array.from(decodedContent.matchAll(emojiRegex))
  
  matches.forEach((match, idx) => {
    const matchIndex = match.index!
    
    // Add text before the emoji
    if (matchIndex > lastIndex) {
      const textBefore = decodedContent.slice(lastIndex, matchIndex)
      if (textBefore) {
        parts.push(
          <span key={`text-${lastIndex}-${idx}`}>{textBefore}</span>
        )
      }
    }
    
    // Add the emoji image
    const emojiPath = match[0]
    parts.push(
      <Image 
        key={`emoji-${matchIndex}-${idx}`}
        src={emojiPath}
        alt="emoji" 
        width={20} 
        height={20}
        className="inline-block object-contain mx-0.5 align-middle"
        unoptimized // Use unoptimized for emoji images for faster loading
        onError={(e) => {
          // Fallback if image fails to load
          console.error('Failed to load emoji:', emojiPath)
          e.currentTarget.style.display = 'none'
        }}
      />
    )
    
    lastIndex = matchIndex + match[0].length
  })
  
  // Add remaining text after the last emoji
  if (lastIndex < decodedContent.length) {
    const textAfter = decodedContent.slice(lastIndex)
    if (textAfter) {
      parts.push(
        <span key={`text-end-${lastIndex}`}>{textAfter}</span>
      )
    }
  }
  
  // Always return a fragment to maintain consistent return type
  return <>{parts.length > 0 ? parts : decodedContent}</>
}

interface ChatMessageProps {
  message: {
    id: string
    content: string
    createdAt: string | Date
    userId: string
    user: {
      id: string
      handle: string
      displayName?: string | null
      avatarUrl?: string | null
      userTier: string
      userBadges?: Array<{
        id: string
        badge: {
          displayName: string
          iconUrl?: string | null
        }
      }>
    }
  }
  onUserClick?: (userId: string) => void
}

export function ChatMessage({ message, onUserClick }: ChatMessageProps) {
  const { user: currentUser } = useAuth()
  const { canModerate, deleteMessage, muteUser, banUser, addStrike } = useModeration()
  const [showActions, setShowActions] = useState(false)

  const isOwnMessage = message.userId === currentUser?.id
  const timestamp = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleDeleteMessage = () => {
    if (confirm('Delete this message?')) {
      deleteMessage(message.id)
    }
  }

  const handleMuteUser = (duration: number) => {
    muteUser({ userId: message.userId, duration, reason: 'Chat violation' })
  }

  const handleBanUser = () => {
    if (confirm(`Ban @${message.user.handle} from chat?`)) {
      banUser({ userId: message.userId, reason: 'Banned by moderator' })
    }
  }

  const handleAddStrike = () => {
    if (confirm(`Add strike to @${message.user.handle}?`)) {
      addStrike({ userId: message.userId, reason: 'Moderator action' })
    }
  }

  return (
    <div
      className={cn(
        'group relative',
        marioStyles.card(true),
        isOwnMessage && 'bg-gradient-to-br from-[var(--sky-blue)]/30 to-[var(--sky-blue)]/10 border-[var(--sky-blue)]'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {/* Avatar (clickable for mod actions) */}
        <button
          onClick={() => onUserClick?.(message.userId)}
          className={cn(
            marioStyles.avatar('sm'),
            'cursor-pointer'
          )}
        >
          <img
            {...createSafeImageProps(
              message.user.avatarUrl,
              isOwnMessage ? '/icons/mario/money-bag.png' : '/icons/mario/user.png',
              message.user.displayName || message.user.handle
            )}
            className="h-full w-full object-cover"
          />
        </button>

        {/* Username */}
        <button
          onClick={() => onUserClick?.(message.userId)}
          className={cn(marioStyles.bodyText('bold'), 'text-sm cursor-pointer')}
        >
          {message.user.displayName || `@${message.user.handle}`}
        </button>

        {/* User Badges */}
        {message.user.userBadges && message.user.userBadges.length > 0 && (
          <div className="flex items-center gap-1">
            {message.user.userBadges.slice(0, 2).map((userBadge) => (
              <div
                key={userBadge.id}
                title={userBadge.badge.displayName}
                className={marioStyles.badge}
              >
                {userBadge.badge.iconUrl ? (() => {
                  const safeProps = createSafeImageProps(
                    userBadge.badge.iconUrl,
                    '/icons/mario/coin.png', // Use a fallback image
                    userBadge.badge.displayName
                  );
                  return (
                    <img
                      {...safeProps}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Replace with emoji span if both image and fallback fail
                        const target = e.currentTarget;
                        const emojiSpan = document.createElement('span');
                        emojiSpan.className = 'text-[8px]';
                        emojiSpan.textContent = '🏆';
                        target.parentNode?.replaceChild(emojiSpan, target);
                      }}
                    />
                  );
                })() : (
                  <span className="text-[8px]">🏆</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tier Badge */}
        {message.user.userTier === 'ADMINISTRATOR' && (
          <div className={marioStyles.badgeLg('admin')}>ADMIN</div>
        )}
        {message.user.userTier === 'MODERATOR' && (
          <div className={cn(
            marioStyles.badgeLg('admin'),
            'bg-[var(--luigi-green)] border-[var(--luigi-green)]'
          )}>
            MOD
          </div>
        )}

        {/* Timestamp */}
        <div className={cn(marioStyles.bodyText('medium'), 'text-[11px] opacity-60 ml-auto')}>
          {timestamp}
        </div>

        {/* Mod Actions Menu (shown on hover for moderators) */}
        {canModerate && !isOwnMessage && (
          <div className={cn('transition-opacity', showActions ? 'opacity-100' : 'opacity-0')}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className={cn(
                  marioStyles.border('md'),
                  'border-2 border-[var(--outline-black)] bg-white shadow-[4px_4px_0_rgba(0,0,0,0.2)]'
                )}
              >
                <DropdownMenuItem onClick={handleDeleteMessage} className="cursor-pointer">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Message
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMuteUser(10)} className="cursor-pointer">
                  <UserX className="h-4 w-4 mr-2" />
                  Mute 10 min
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMuteUser(60)} className="cursor-pointer">
                  <UserX className="h-4 w-4 mr-2" />
                  Mute 1 hour
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMuteUser(1440)} className="cursor-pointer">
                  <UserX className="h-4 w-4 mr-2" />
                  Mute 24 hours
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAddStrike} className="cursor-pointer">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Add Strike
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleBanUser}
                  className="cursor-pointer text-[var(--mario-red)]"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Ban User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          marioStyles.bodyText('medium'),
          'text-sm whitespace-pre-wrap break-words leading-relaxed'
        )}
      >
        {renderMessageContent(message.content)}
      </div>
    </div>
  )
}
