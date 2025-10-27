"use client"

import { usePriceStreamContext, ConnectionState } from '@/lib/price-stream-provider'
import { cn } from '@/lib/utils'

interface WebSocketStatusProps {
  className?: string
  showDetails?: boolean
}

export function WebSocketStatus({ className, showDetails = false }: WebSocketStatusProps) {
  const { connectionState, error, reconnect, disconnect } = usePriceStreamContext()

  const getStatusColor = (state: ConnectionState) => {
    switch (state) {
      case ConnectionState.Connected:
        return 'text-luigi'
      case ConnectionState.Connecting:
      case ConnectionState.Reconnecting:
        return 'text-star'
      case ConnectionState.Failed:
        return 'text-mario'
      case ConnectionState.Disconnected:
      default:
        return 'text-pipe-500'
    }
  }

  const getStatusIcon = (state: ConnectionState) => {
    switch (state) {
      case ConnectionState.Connected:
        return '🟢'
      case ConnectionState.Connecting:
      case ConnectionState.Reconnecting:
        return '🟡'
      case ConnectionState.Failed:
        return '🔴'
      case ConnectionState.Disconnected:
      default:
        return '⚫'
    }
  }

  if (!showDetails) {
    return (
      <div className={cn('flex items-center gap-1 text-xs', className)}>
        <span>{getStatusIcon(connectionState)}</span>
        <span className={getStatusColor(connectionState)}>
          {connectionState}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('p-2 border rounded text-xs', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{getStatusIcon(connectionState)}</span>
          <span className={cn('font-medium', getStatusColor(connectionState))}>
            {connectionState}
          </span>
        </div>
        <div className="flex gap-1">
          {connectionState === ConnectionState.Failed && (
            <button
              onClick={reconnect}
              className="px-2 py-1 bg-sky text-white rounded hover:bg-sky"
            >
              Retry
            </button>
          )}
          {(connectionState === ConnectionState.Connected || 
            connectionState === ConnectionState.Connecting) && (
            <button
              onClick={disconnect}
              className="px-2 py-1 bg-mario text-white rounded hover:bg-mario"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
      
      {error && (
        <div className="text-mario mb-2">
          Error: {error}
        </div>
      )}
      
      <div className="text-pipe-600">
        Real-time price updates
      </div>
    </div>
  )
}