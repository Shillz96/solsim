"use client"

import { useState, useEffect } from 'react'
import { usePriceStreamContext } from '@/lib/price-stream-provider'
import { env } from '@/lib/env'

interface DiagnosticResult {
  name: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: string
}

export function ConnectionDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { connected, connectionState, error } = usePriceStreamContext()

  useEffect(() => {
    const runDiagnostics = async () => {
      const results: DiagnosticResult[] = []

      // 1. Check environment variables
      try {
        const wsUrl = env.NEXT_PUBLIC_WS_URL
        const apiUrl = env.NEXT_PUBLIC_API_URL
        
        results.push({
          name: 'Environment Variables',
          status: 'success',
          message: 'Environment variables loaded',
          details: `WS: ${wsUrl}, API: ${apiUrl}`
        })
      } catch (err) {
        results.push({
          name: 'Environment Variables',
          status: 'error',
          message: 'Failed to load environment variables',
          details: String(err)
        })
      }

      // 2. Check WebSocket connection
      results.push({
        name: 'WebSocket Connection',
        status: connected ? 'success' : 'error',
        message: connected ? 'Connected' : 'Disconnected',
        details: error || `State: ${connectionState}`
      })

      // 3. Check API connectivity
      try {
        const response = await fetch('/api/market-hover', { 
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          const data = await response.json()
          results.push({
            name: 'API Connectivity',
            status: 'success',
            message: 'API responding correctly',
            details: `Response keys: ${Object.keys(data).join(', ')}`
          })
        } else {
          results.push({
            name: 'API Connectivity',
            status: 'error',
            message: `API error: ${response.status}`,
            details: response.statusText
          })
        }
      } catch (err) {
        results.push({
          name: 'API Connectivity',
          status: 'error',
          message: 'API request failed',
          details: String(err)
        })
      }

      // 4. Check backend direct connection
      try {
        const apiUrl = env.NEXT_PUBLIC_API_URL
        const response = await fetch(`${apiUrl}/market/lighthouse`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          results.push({
            name: 'Backend Direct',
            status: 'success',
            message: 'Backend responding',
            details: `Status: ${response.status}`
          })
        } else {
          results.push({
            name: 'Backend Direct',
            status: 'error',
            message: `Backend error: ${response.status}`,
            details: response.statusText
          })
        }
      } catch (err) {
        results.push({
          name: 'Backend Direct',
          status: 'error',
          message: 'Backend unreachable',
          details: String(err)
        })
      }

      setDiagnostics(results)
      setIsLoading(false)
    }

    runDiagnostics()
  }, [connected, connectionState, error])

  if (isLoading) {
    return (
      <div className="p-4 border-2 border-outline bg-card rounded-lg">
        <h3 className="font-mario text-sm mb-2">🔍 Running Diagnostics...</h3>
      </div>
    )
  }

  return (
    <div className="p-4 border-2 border-outline bg-card rounded-lg">
      <h3 className="font-mario text-sm mb-3">🔍 Connection Diagnostics</h3>
      
      <div className="space-y-2">
        {diagnostics.map((diag, index) => (
          <div key={index} className="flex items-start gap-2 text-xs">
            <span className={`w-2 h-2 rounded-full mt-1 ${
              diag.status === 'success' ? 'bg-luigi' :
              diag.status === 'warning' ? 'bg-star' :
              'bg-mario'
            }`} />
            
            <div className="flex-1">
              <div className="font-medium">{diag.name}</div>
              <div className="opacity-80">{diag.message}</div>
              {diag.details && (
                <div className="opacity-60 text-[10px] mt-1 font-mono">
                  {diag.details}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-2 border-t border-outline">
        <div className="text-[10px] opacity-60">
          💡 If WebSocket/API are failing, check if backend is running on port 4000
        </div>
      </div>
    </div>
  )
}
