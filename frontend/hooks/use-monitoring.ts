'use client'

import { useState, useEffect } from 'react'

interface SystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  components: Record<string, 'healthy' | 'degraded' | 'unhealthy'>
  lastUpdated: string
}

export function useSystemStatus(refreshInterval?: number) {
  const [data, setData] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = () => {
    setLoading(true)
    setError(null)

    // Mock data for now
    setTimeout(() => {
      setData({
        overall: 'healthy',
        components: {
          database: 'healthy',
          api: 'healthy',
          websocket: 'healthy',
          redis: 'healthy'
        },
        lastUpdated: new Date().toISOString()
      })
      setLoading(false)
    }, 500)
  }

  useEffect(() => {
    refetch()

    if (refreshInterval) {
      const interval = setInterval(refetch, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [refreshInterval])

  return { data, loading, error, refetch }
}
