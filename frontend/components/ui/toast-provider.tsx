"use client"

import { useEffect } from 'react'
import { toast } from '../ui/use-toast'

export function GlobalToastProvider() {
  useEffect(() => {
    // Listen for global error events from error handler
    const handleUserMessage = (event: CustomEvent) => {
      const { message, type = 'error' } = event.detail
      
      switch (type) {
        case 'warning':
          toast({
            title: 'Notice',
            description: message,
            variant: 'destructive',
          })
          break
        case 'error':
          toast({
            title: 'Error',
            description: message,
            variant: 'destructive',
          })
          break
        case 'info':
          toast({
            description: message,
          })
          break
        default:
          toast({
            description: message,
          })
      }
    }

    window.addEventListener('app:user-message', handleUserMessage as EventListener)
    return () => window.removeEventListener('app:user-message', handleUserMessage as EventListener)
  }, [])

  return null
}
