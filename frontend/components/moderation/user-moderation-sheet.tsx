'use client'

/**
 * User Moderation Sheet
 * 
 * Quick moderation panel that slides in when clicking a user
 * Shows user info and moderation actions
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, UserX, Shield, AlertCircle, Trash2, Crown } from 'lucide-react'
import { cn, marioStyles } from '@/lib/utils'
import { useModeration } from '@/hooks/use-moderation'
import * as moderationApi from '@/lib/api/moderation'

interface UserModerationSheetProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UserModerationSheet({ userId, open, onOpenChange }: UserModerationSheetProps) {
  const { isAdmin, muteUser, unmuteUser, banUser, unbanUser, addStrike, clearStrikes, upgradeTier, isLoading } =
    useModeration()

  const [muteReason, setMuteReason] = useState('')
  const [muteDuration, setMuteDuration] = useState('10')
  const [selectedTier, setSelectedTier] = useState('')

  // Fetch user moderation status
  const { data: moderationStatus, isLoading: loadingStatus } = useQuery({
    queryKey: ['moderation-status', userId],
    queryFn: () => (userId ? moderationApi.getUserModerationStatus(userId) : null),
    enabled: !!userId && open,
  })

  // Fetch moderation history
  const { data: moderationHistory } = useQuery({
    queryKey: ['moderation-history', userId],
    queryFn: () => (userId ? moderationApi.getModerationHistory(userId, 10) : null),
    enabled: !!userId && open,
  })

  if (!userId) return null

  const handleMute = () => {
    muteUser({ userId, duration: parseInt(muteDuration), reason: muteReason || 'Moderator action' })
    setMuteReason('')
  }

  const handleUnmute = () => {
    unmuteUser(userId)
  }

  const handleBan = () => {
    if (confirm('Ban this user from chat?')) {
      banUser({ userId, reason: muteReason || 'Banned by moderator' })
    }
  }

  const handleUnban = () => {
    unbanUser(userId)
  }

  const handleAddStrike = () => {
    addStrike({ userId, reason: muteReason || 'Moderator action' })
    setMuteReason('')
  }

  const handleClearStrikes = () => {
    if (confirm('Clear all strikes for this user?')) {
      clearStrikes(userId)
    }
  }

  const handleUpgradeTier = () => {
    if (selectedTier && confirm(`Upgrade user to ${selectedTier}?`)) {
      upgradeTier({ userId, newTier: selectedTier as any })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'w-[400px] sm:w-[500px]',
          marioStyles.border('lg'),
          'border-l-4 border-[var(--outline-black)] bg-gradient-to-br from-white to-[var(--pipe-green)]/5'
        )}
      >
        <SheetHeader>
          <SheetTitle className={marioStyles.heading(3)}>User Moderation</SheetTitle>
          <SheetDescription className={marioStyles.bodyText('medium')}>
            Manage user permissions and chat status
          </SheetDescription>
        </SheetHeader>

        {loadingStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--luigi-green)]" />
          </div>
        ) : moderationStatus ? (
          <div className="mt-6 space-y-6">
            {/* Current Status */}
            <div className={cn(marioStyles.card(true), 'space-y-2')}>
              <div className={cn(marioStyles.bodyText('bold'), 'text-sm mb-2')}>Current Status</div>
              <div className="flex gap-2 flex-wrap">
                {moderationStatus.isMuted && (
                  <Badge variant="destructive">
                    <UserX className="h-3 w-3 mr-1" />
                    Muted
                  </Badge>
                )}
                {moderationStatus.isBanned && (
                  <Badge variant="destructive">
                    <Shield className="h-3 w-3 mr-1" />
                    Banned
                  </Badge>
                )}
                {moderationStatus.strikes > 0 && (
                  <Badge variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {moderationStatus.strikes} Strike{moderationStatus.strikes > 1 ? 's' : ''}
                  </Badge>
                )}
                {!moderationStatus.isMuted && !moderationStatus.isBanned && moderationStatus.strikes === 0 && (
                  <Badge variant="outline" className="bg-[var(--luigi-green)]/10">
                    Clean Record
                  </Badge>
                )}
              </div>
              {moderationStatus.mutedUntil && (
                <div className={cn(marioStyles.bodyText('medium'), 'text-xs text-[var(--mario-red)]')}>
                  Muted until: {new Date(moderationStatus.mutedUntil).toLocaleString()}
                </div>
              )}
            </div>

            {/* Mute Actions */}
            <div className="space-y-3">
              <Label className={marioStyles.bodyText('bold')}>Mute User</Label>
              <div className="flex gap-2">
                <Select value={muteDuration} onValueChange={setMuteDuration}>
                  <SelectTrigger className={marioStyles.input()}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                    <SelectItem value="10080">7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Reason (optional)"
                value={muteReason}
                onChange={(e) => setMuteReason(e.target.value)}
                className={marioStyles.input()}
              />
              <div className="flex gap-2">
                {!moderationStatus.isMuted ? (
                  <Button
                    onClick={handleMute}
                    disabled={isLoading}
                    className={marioStyles.button('danger', 'sm')}
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Mute User
                  </Button>
                ) : (
                  <Button
                    onClick={handleUnmute}
                    disabled={isLoading}
                    className={marioStyles.button('success', 'sm')}
                  >
                    Unmute User
                  </Button>
                )}
              </div>
            </div>

            {/* Ban Actions */}
            <div className="space-y-3">
              <Label className={marioStyles.bodyText('bold')}>Ban User</Label>
              <div className="flex gap-2">
                {!moderationStatus.isBanned ? (
                  <Button
                    onClick={handleBan}
                    disabled={isLoading}
                    className={marioStyles.button('danger', 'sm')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Ban from Chat
                  </Button>
                ) : (
                  <Button
                    onClick={handleUnban}
                    disabled={isLoading}
                    className={marioStyles.button('success', 'sm')}
                  >
                    Unban User
                  </Button>
                )}
              </div>
            </div>

            {/* Strike Actions */}
            <div className="space-y-3">
              <Label className={marioStyles.bodyText('bold')}>Strikes</Label>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddStrike}
                  disabled={isLoading}
                  className={marioStyles.button('secondary', 'sm')}
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Add Strike
                </Button>
                {moderationStatus.strikes > 0 && (
                  <Button
                    onClick={handleClearStrikes}
                    disabled={isLoading}
                    className={marioStyles.button('outline', 'sm')}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Strikes
                  </Button>
                )}
              </div>
            </div>

            {/* Tier Upgrade (Admin Only) */}
            {isAdmin && (
              <div className="space-y-3">
                <Label className={marioStyles.bodyText('bold')}>Upgrade Tier (Admin Only)</Label>
                <Select value={selectedTier} onValueChange={setSelectedTier}>
                  <SelectTrigger className={marioStyles.input()}>
                    <SelectValue placeholder="Select new tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMAIL_USER">Email User</SelectItem>
                    <SelectItem value="WALLET_USER">Wallet User</SelectItem>
                    <SelectItem value="VSOL_HOLDER">VSOL Holder</SelectItem>
                    <SelectItem value="MODERATOR">Moderator</SelectItem>
                    <SelectItem value="ADMINISTRATOR">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleUpgradeTier}
                  disabled={!selectedTier || isLoading}
                  className={marioStyles.button('primary', 'sm')}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Tier
                </Button>
              </div>
            )}

            {/* Recent Actions */}
            {moderationHistory && moderationHistory.length > 0 && (
              <div className="space-y-2">
                <Label className={marioStyles.bodyText('bold')}>Recent Actions</Label>
                <div className={cn(marioStyles.card(true), 'max-h-[200px] overflow-y-auto space-y-2')}>
                  {moderationHistory.map((action) => (
                    <div
                      key={action.id}
                      className="text-xs p-2 bg-[var(--pipe-green)]/5 rounded border border-[var(--outline-black)]/10"
                    >
                      <div className="font-bold">{action.action}</div>
                      {action.reason && <div className="text-[var(--outline-black)]/70">{action.reason}</div>}
                      <div className="text-[var(--outline-black)]/50">
                        {new Date(action.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-[var(--outline-black)]/50">
            <div className={marioStyles.bodyText('medium')}>Unable to load user data</div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
