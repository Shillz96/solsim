"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, CheckCheck, Trash2, TrendingUp, Wallet, DollarSign, AlertCircle, Trophy, Star, Eye } from "lucide-react"
import { useNotifications, type Notification } from "@/hooks/use-notifications"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'trade':
      return <TrendingUp className="h-4 w-4 text-green-500" />
    case 'portfolio':
      return <Wallet className="h-4 w-4 text-blue-500" />
    case 'price':
      return <DollarSign className="h-4 w-4 text-yellow-500" />
    case 'leaderboard':
      return <Trophy className="h-4 w-4 text-purple-500" />
    case 'rewards':
      return <Star className="h-4 w-4 text-amber-500" />
    case 'wallet_tracker':
      return <Eye className="h-4 w-4 text-cyan-500" />
    case 'achievement':
      return <Trophy className="h-4 w-4 text-orange-500" />
    case 'system':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Bell className="h-4 w-4" />
  }
}

export function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications()

  const [open, setOpen] = useState(false)

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    markAsRead(id)
  }

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeNotification(id)
  }

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Keep dropdown open while marking all as read
    markAllAsRead()
    // Don't close the dropdown
    return false
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative p-2 hover:bg-muted/50 rounded-lg">
          <img src="/icons/mario/bell.png" alt="Notifications" className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-mario-red-500 border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              className="h-6 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer",
                  !notification.read && "bg-primary/5"
                )}
                onSelect={() => {
                  if (!notification.read) {
                    markAsRead(notification.id)
                  }
                }}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      !notification.read && "font-semibold"
                    )}>
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {notification.message}
                  </p>

                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                    </span>

                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleMarkAsRead(notification.id, e)}
                          className="h-5 w-5 p-0"
                          title="Mark as read"
                        >
                          <CheckCheck className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleRemove(notification.id, e)}
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
