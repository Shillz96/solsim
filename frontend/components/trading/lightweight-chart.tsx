'use client'

/**
 * Lightweight Chart Component
 *
 * Features:
 * - TradingView Lightweight Charts v5
 * - Candlestick series with Mario theme colors
 * - Volume histogram
 * - Buy/sell trade markers
 * - Average cost price line
 * - Real-time price updates
 * - Responsive design
 */

import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  type SeriesMarker,
  ColorType,
  LineStyle,
} from 'lightweight-charts'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useTradeMarkers } from '@/hooks/useTradeMarkers'
import { useAverageCostLine } from '@/hooks/useAverageCostLine'
import { usePriceStreamContext } from '@/lib/price-stream-provider'

interface LightweightChartProps {
  tokenMint: string
  tokenSymbol: string
  className?: string
}

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

/**
 * Convert timeframe to seconds for candle alignment
 */
function getIntervalSeconds(timeframe: Timeframe): number {
  const intervals: Record<Timeframe, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
  }
  return intervals[timeframe]
}

export function LightweightChart({
  tokenMint,
  tokenSymbol,
  className,
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const lastCandleRef = useRef<CandlestickData | null>(null) // Track last candle for proper high/low updates

  const [timeframe, setTimeframe] = useState<Timeframe>('5m')
  const [isLoading, setIsLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'birdeye' | 'mock' | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Get real-time price updates via WebSocket
  const { prices, subscribe, unsubscribe } = usePriceStreamContext()
  const solPrice = prices.get('So11111111111111111111111111111111111111112')?.price || 208
  const tokenPrice = prices.get(tokenMint)

  // Add trade markers (buy/sell arrows)
  useTradeMarkers(candlestickSeriesRef.current, tokenMint)

  // Add average cost price line
  useAverageCostLine(candlestickSeriesRef.current, tokenMint, solPrice)

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    // Responsive height: smaller on mobile, larger on desktop
    const chartHeight = isMobile ? 350 : 500

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#FFFAE9' }, // Mario theme cream
        textColor: '#1C1C1C', // Outline black
        fontSize: isMobile ? 10 : 12, // Smaller font on mobile
      },
      grid: {
        vertLines: { color: '#e5e5e5' },
        horzLines: { color: '#e5e5e5' },
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
        vertLine: {
          width: isMobile ? 1 : 2,
          color: '#1C1C1C',
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: isMobile ? 1 : 2,
          color: '#1C1C1C',
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: '#1C1C1C',
        scaleMargins: {
          top: 0.1,
          bottom: 0.3, // Make room for volume
        },
        minimumWidth: isMobile ? 50 : 60, // Narrower price scale on mobile
      },
      timeScale: {
        borderColor: '#1C1C1C',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        tickMarkFormatter: isMobile
          ? (time: any) => {
              // Shorter date format on mobile
              const date = new Date(time * 1000)
              return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
            }
          : undefined,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true, // Essential for mobile pinch-to-zoom
      },
      // Improve touch handling on mobile
      kineticScroll: {
        touch: true,
        mouse: false,
      },
    })

    // Candlestick series with Mario theme colors
    // @ts-expect-error - addCandlestickSeries exists in v5 but type definitions may be incomplete
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#43B047', // Luigi green
      downColor: '#E52521', // Mario red
      borderUpColor: '#1C1C1C',
      borderDownColor: '#1C1C1C',
      wickUpColor: '#43B047',
      wickDownColor: '#E52521',
      borderVisible: true,
      lastValueVisible: true,
      priceLineVisible: true,
      priceLineWidth: 2,
      priceLineColor: '#1C1C1C',
      priceLineStyle: LineStyle.Solid,
    })

    // Volume histogram
    // @ts-expect-error - addHistogramSeries exists in v5 but type definitions may be incomplete
    const volumeSeries = chart.addHistogramSeries({
      color: '#A6D8FF', // Sky blue
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Create separate scale
      lastValueVisible: false,
      priceLineVisible: false,
    })

    // Configure volume scale to appear at bottom
    chart.priceScale('').applyOptions({
      scaleMargins: {
        top: 0.7, // Volume takes bottom 30%
        bottom: 0,
      },
    })

    chartRef.current = chart
    candlestickSeriesRef.current = candlestickSeries
    volumeSeriesRef.current = volumeSeries

    console.log('📊 Chart initialized')

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !chartRef.current) return
      const { width } = entries[0].contentRect
      chartRef.current.applyOptions({ width: Math.max(width, 300) })
    })

    resizeObserver.observe(chartContainerRef.current)

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up chart')
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [isMobile])

  // Load historical data when timeframe changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return

    const fetchOHLCV = async () => {
      setIsLoading(true)
      try {
        console.log(`📥 Fetching ${timeframe} OHLCV for ${tokenMint}`)

        const response = await fetch(
          `/api/chart/ohlcv?mint=${tokenMint}&type=${timeframe}&limit=500`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch OHLCV data')
        }

        const json = await response.json()

        if (json.success && json.data?.items) {
          // Set data source
          setDataSource(json.source || 'birdeye')

          // Transform to Lightweight Charts format
          const candlesticks: CandlestickData[] = json.data.items.map((item: any) => ({
            time: item.unixTime as Time,
            open: parseFloat(item.o),
            high: parseFloat(item.h),
            low: parseFloat(item.l),
            close: parseFloat(item.c),
          }))

          const volumes = json.data.items.map((item: any) => ({
            time: item.unixTime as Time,
            value: parseFloat(item.v),
            color: parseFloat(item.c) >= parseFloat(item.o)
              ? '#43B047' // Green for up candle
              : '#E52521', // Red for down candle
          }))

          // Set data
          candlestickSeriesRef.current?.setData(candlesticks)
          volumeSeriesRef.current?.setData(volumes)

          // Store last candle for real-time updates
          if (candlesticks.length > 0) {
            lastCandleRef.current = candlesticks[candlesticks.length - 1]
          }

          // Fit content
          chartRef.current?.timeScale().fitContent()

          console.log(`✅ Loaded ${candlesticks.length} candles from ${json.source || 'birdeye'}`)
        }
      } catch (error) {
        console.error('Failed to load OHLCV:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOHLCV()
  }, [tokenMint, timeframe])

  // Subscribe to token price updates via WebSocket
  useEffect(() => {
    if (!tokenMint) return

    console.log(`📡 Subscribing to real-time price updates for ${tokenMint}`)
    subscribe(tokenMint)

    return () => {
      console.log(`📴 Unsubscribing from price updates for ${tokenMint}`)
      unsubscribe(tokenMint)
    }
  }, [tokenMint, subscribe, unsubscribe])

  // Update last candlestick when price changes (real-time updates)
  // Following TradingView best practices for real-time candle updates
  useEffect(() => {
    if (!candlestickSeriesRef.current || !tokenPrice) return

    try {
      // Get current time aligned to timeframe
      const now = Math.floor(Date.now() / 1000)
      const interval = getIntervalSeconds(timeframe)
      const alignedTime = Math.floor(now / interval) * interval

      const currentPrice = tokenPrice.price

      // Get the last candle or create a new one
      let updatedCandle: CandlestickData

      if (lastCandleRef.current && lastCandleRef.current.time === alignedTime) {
        // Update existing candle - properly track high/low as per best practices
        const lastCandle = lastCandleRef.current
        updatedCandle = {
          time: alignedTime as Time,
          open: lastCandle.open,
          high: Math.max(lastCandle.high, currentPrice), // Update high if price exceeds
          low: Math.min(lastCandle.low, currentPrice),   // Update low if price is lower
          close: currentPrice,
        }
      } else {
        // New candle - use current price for all OHLC
        updatedCandle = {
          time: alignedTime as Time,
          open: currentPrice,
          high: currentPrice,
          low: currentPrice,
          close: currentPrice,
        }
      }

      // Update the chart
      candlestickSeriesRef.current.update(updatedCandle)

      // Store for next update
      lastCandleRef.current = updatedCandle

      console.log(`📊 Updated chart with real-time price: $${currentPrice.toFixed(8)}`)
    } catch (error) {
      console.error('Failed to update real-time price on chart:', error)
    }
  }, [tokenPrice, timeframe])

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d']

  return (
    <div className={cn('space-y-2', className)}>
      {/* Timeframe Selector */}
      <div className="flex gap-1.5 md:gap-2 flex-wrap">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={cn(
              'px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-lg border-2 md:border-3 border-[var(--outline-black)] transition-all',
              timeframe === tf
                ? 'bg-[var(--star-yellow)] shadow-[2px_2px_0_var(--outline-black)] md:shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]'
                : 'bg-white hover:bg-[var(--pipe-100)] shadow-[1px_1px_0_var(--outline-black)] md:shadow-[2px_2px_0_var(--outline-black)]'
            )}
          >
            {tf.toUpperCase()}
          </button>
        ))}

        {isLoading && (
          <div className="flex items-center gap-1.5 md:gap-2 ml-auto text-[10px] md:text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="hidden sm:inline">Loading...</span>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="border-3 md:border-4 border-[var(--outline-black)] rounded-[12px] md:rounded-[16px] shadow-[4px_4px_0_var(--outline-black)] md:shadow-[6px_6px_0_var(--outline-black)] bg-[#FFFAE9] overflow-hidden touch-pan-x touch-pan-y"
        style={{
          minHeight: isMobile ? '350px' : '500px',
          touchAction: 'pan-x pan-y', // Better touch handling
        }}
      />

      {/* Chart Info */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-2 gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold">{tokenSymbol}</span> • {timeframe.toUpperCase()} Chart
          {dataSource === 'mock' && (
            <span className="px-2 py-0.5 bg-[var(--star-yellow)] text-[var(--outline-black)] rounded font-bold whitespace-nowrap">
              DEMO DATA
            </span>
          )}
        </div>
        <div className="hidden sm:block">
          Powered by TradingView Lightweight Charts
        </div>
        <div className="sm:hidden text-right">
          TradingView
        </div>
      </div>
    </div>
  )
}

// Default export for better compatibility with Next.js dynamic imports
export default LightweightChart