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
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  AreaSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type Time,
  type SeriesMarker,
  type MouseEventParams,
  ColorType,
  LineStyle,
} from 'lightweight-charts'
import { cn } from '@/lib/utils'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { useTradeMarkers } from '@/hooks/useTradeMarkers'
import { useAverageCostLine } from '@/hooks/useAverageCostLine'
import { usePriceStreamContext } from '@/lib/price-stream-provider'
import { calculateSMA, calculateEMA, type PriceData } from '@/lib/indicators'

interface LightweightChartProps {
  tokenMint: string
  tokenSymbol: string
  className?: string
}

type Timeframe = '1s' | '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
type ChartType = 'candlestick' | 'line' | 'area'

interface TooltipData {
  time: Time
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/**
 * Convert timeframe to seconds for candle alignment
 */
function getIntervalSeconds(timeframe: Timeframe): number {
  const intervals: Record<Timeframe, number> = {
    '1s': 1,
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
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  const [timeframe, setTimeframe] = useState<Timeframe>('1s')
  const [chartType, setChartType] = useState<ChartType>('candlestick')
  const [isLoading, setIsLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'birdeye' | 'mock' | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null)
  const [priceChange24h, setPriceChange24h] = useState<number>(0)
  const [openPrice24h, setOpenPrice24h] = useState<number>(0)
  const [showSMA, setShowSMA] = useState(false)
  const [showEMA, setShowEMA] = useState(false)

  // Get real-time price updates via WebSocket
  const { prices, subscribe, unsubscribe } = usePriceStreamContext()
  const solPrice = prices.get('So11111111111111111111111111111111111111112')?.price || 208
  const tokenPrice = prices.get(tokenMint)

  // Add trade markers (buy/sell circular bubbles)
  const { hideBubbles, toggleBubbles } = useTradeMarkers(
    candlestickSeriesRef.current,
    tokenMint
  )

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
        background: { type: ColorType.Solid, color: '#0A0A0F' }, // Dark background for better contrast
        textColor: '#D1D4DC', // Light gray text
        fontSize: isMobile ? 10 : 12, // Smaller font on mobile
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.6)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.6)' },
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
        vertLine: {
          width: isMobile ? 1 : 2,
          color: '#758696',
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: isMobile ? 1 : 2,
          color: '#758696',
          style: LineStyle.Dashed,
        },
      },
      rightPriceScale: {
        borderColor: '#2B2B43',
        scaleMargins: {
          top: 0.1,
          bottom: 0.3, // Make room for volume
        },
        minimumWidth: isMobile ? 50 : 60, // Narrower price scale on mobile
      },
      timeScale: {
        borderColor: '#2B2B43',
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

    // Create main series based on chart type
    let candlestickSeries: ISeriesApi<any>

    if (chartType === 'candlestick') {
      candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#2ecc71', // Luigi green for bullish
        downColor: '#e74c3c', // Mario red for bearish
        borderUpColor: '#27ae60', // Darker green border
        borderDownColor: '#c0392b', // Darker red border
        wickUpColor: '#2ecc71',
        wickDownColor: '#e74c3c',
        borderVisible: true, // Mario theme uses borders
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineWidth: 3, // Thicker lines for Mario theme
        priceLineColor: '#34495e', // Dark border color
        priceLineStyle: LineStyle.Solid,
      })
    } else if (chartType === 'line') {
      candlestickSeries = chart.addSeries(LineSeries, {
        color: '#2ecc71', // Luigi green
        lineWidth: 3, // Thicker for Mario theme
        lastValueVisible: true,
        priceLineVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5, // Larger markers
        crosshairMarkerBorderColor: '#27ae60', // Darker green border
        crosshairMarkerBackgroundColor: '#2ecc71',
      })
    } else { // 'area'
      candlestickSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(46, 204, 113, 0.3)', // Luigi green with opacity
        bottomColor: 'rgba(46, 204, 113, 0.0)',
        lineColor: '#2ecc71', // Luigi green
        lineWidth: 3, // Thicker for Mario theme
        lastValueVisible: true,
        priceLineVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 5, // Larger markers
        crosshairMarkerBorderColor: '#27ae60', // Darker green border
        crosshairMarkerBackgroundColor: '#2ecc71',
      })
    }

    // Volume histogram (v5 API)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3498db', // Mario blue for volume
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

    // Subscribe to crosshair move for OHLCV tooltip
    chart.subscribeCrosshairMove((param: MouseEventParams) => {
      if (!param.time || !param.seriesData) {
        setTooltipData(null)
        return
      }

      const candleData = param.seriesData.get(candlestickSeries) as CandlestickData | undefined
      const volumeData = param.seriesData.get(volumeSeries) as { value: number } | undefined

      if (candleData) {
        setTooltipData({
          time: param.time,
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volumeData?.value,
        })
      }
    })

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

      // Clear refs BEFORE removing chart to prevent "Object is disposed" errors
      candlestickSeriesRef.current = null
      volumeSeriesRef.current = null
      chartRef.current = null
      lastCandleRef.current = null

      // Now safe to remove chart
      chart.remove()
    }
  }, [isMobile, chartType]) // Recreate chart when type changes

  // Load historical data when timeframe changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current) return

    let isMounted = true // Track if component is still mounted

    const fetchOHLCV = async () => {
      setIsLoading(true)
      try {
        console.log(`📥 Fetching ${timeframe} OHLCV for ${tokenMint}`)

        // Use backend API URL instead of relative path
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
        const response = await fetch(
          `${API}/api/chart/ohlcv?mint=${tokenMint}&type=${timeframe}&limit=500`
        )

        if (!response.ok) {
          throw new Error('Failed to fetch OHLCV data')
        }

        const json = await response.json()

        if (json.success && json.data?.items) {
          // Set data source
          setDataSource(json.source || 'birdeye')

          // Transform to Lightweight Charts format based on chart type
          let seriesData: any[]

          if (chartType === 'candlestick') {
            seriesData = json.data.items.map((item: any) => ({
              time: item.unixTime as Time,
              open: parseFloat(item.o),
              high: parseFloat(item.h),
              low: parseFloat(item.l),
              close: parseFloat(item.c),
            }))
          } else {
            // For line and area charts, use close price
            seriesData = json.data.items.map((item: any) => ({
              time: item.unixTime as Time,
              value: parseFloat(item.c), // Use close price
            }))
          }

          // Keep candlestick data for calculations
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
              ? 'rgba(38, 166, 154, 0.5)' // Teal green with transparency
              : 'rgba(239, 83, 80, 0.5)', // Red with transparency
          }))

          // Only update if component is still mounted (prevents "Object is disposed" errors)
          if (isMounted && candlestickSeriesRef.current && volumeSeriesRef.current) {
            // Set data (use seriesData which is formatted for the current chart type)
            candlestickSeriesRef.current.setData(seriesData)
            volumeSeriesRef.current.setData(volumes)

            // Store last candle for real-time updates
            if (candlesticks.length > 0) {
              lastCandleRef.current = candlesticks[candlesticks.length - 1]

              // Calculate 24h price change
              const latestClose = candlesticks[candlesticks.length - 1].close
              const oldestOpen = candlesticks[0].open
              setOpenPrice24h(oldestOpen)
              const change = ((latestClose - oldestOpen) / oldestOpen) * 100
              setPriceChange24h(change)
            }

            // Fit content
            chartRef.current?.timeScale().fitContent()

            console.log(`✅ Loaded ${candlesticks.length} candles from ${json.source || 'birdeye'}`)
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to load OHLCV:', error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchOHLCV()

    return () => {
      isMounted = false // Cleanup: mark as unmounted
    }
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
    // Guard: Check if series still exists (might be disposed during cleanup)
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

      // Double-check series still exists before updating (race condition guard)
      if (candlestickSeriesRef.current) {
        // Update series based on chart type
        if (chartType === 'candlestick') {
          candlestickSeriesRef.current.update(updatedCandle)
        } else {
          // For line/area charts, just use the close price
          candlestickSeriesRef.current.update({
            time: alignedTime as Time,
            value: currentPrice,
          } as LineData)
        }

        // Store for next update
        lastCandleRef.current = updatedCandle
        console.log(`📊 Updated chart with real-time price: $${currentPrice.toFixed(8)}`)
      }
    } catch (error) {
      // Silently catch disposal errors to prevent console spam
      if (error instanceof Error && !error.message.includes('disposed')) {
        console.error('Failed to update real-time price on chart:', error)
      }
    }
  }, [tokenPrice, timeframe, chartType])

  const timeframes: Timeframe[] = ['1s', '1m', '5m', '15m', '1h', '4h', '1d']
  const chartTypes: { type: ChartType; label: string }[] = [
    { type: 'candlestick', label: 'Candles' },
    { type: 'line', label: 'Line' },
    { type: 'area', label: 'Area' },
  ]

  const currentPrice = tokenPrice?.price || lastCandleRef.current?.close || 0
  const priceChangePercent = priceChange24h

  return (
    <div className={cn('space-y-2 border-4 border-outline rounded-xl shadow-[6px_6px_0_var(--outline-black)] bg-card overflow-hidden', className)}>
      {/* Token Info Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-[var(--luigi-green)]/20 to-[var(--sky-blue)]/20 border-3 border-outline rounded-lg shadow-[3px_3px_0_var(--outline-black)]">
        <div>
          <h3 className="text-outline font-mario font-bold text-sm md:text-base">{tokenSymbol}/USD</h3>
          <p className="text-xs text-outline font-bold">Real-time Price</p>
        </div>
        <div className="text-right">
          <p className="text-xl md:text-2xl font-bold font-mono text-outline">
            ${currentPrice.toFixed(currentPrice < 0.01 ? 8 : 4)}
          </p>
          {priceChangePercent !== 0 && (
            <div className={cn('flex items-center gap-1 text-sm font-bold justify-end', priceChangePercent >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
              {priceChangePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Type & Timeframe Selector */}
      <div className="flex gap-1.5 md:gap-2 flex-wrap items-center">
        {/* Chart Type Selector */}
        <div className="flex gap-1 md:gap-1.5 border-r-2 border-outline pr-2 mr-1">
          {chartTypes.map(({ type, label }) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={cn(
                'px-2 md:px-2.5 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-lg border-2 border-outline transition-all',
                chartType === type
                  ? 'bg-luigi text-white shadow-[2px_2px_0_var(--outline-black)]'
                  : 'bg-card hover:bg-muted shadow-[1px_1px_0_var(--outline-black)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Timeframe Selector */}
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={cn(
              'px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-lg border-2 md:border-3 border-outline transition-all',
              timeframe === tf
                ? 'bg-star shadow-[2px_2px_0_var(--outline-black)] md:shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]'
                : 'bg-card hover:bg-[var(--pipe-100)] shadow-[1px_1px_0_var(--outline-black)] md:shadow-[2px_2px_0_var(--outline-black)]'
            )}
          >
            {tf.toUpperCase()}
          </button>
        ))}

        {/* Hide Bubbles Toggle (axiom.trade style) */}
        <button
          onClick={toggleBubbles}
          className={cn(
            'px-2.5 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-lg border-2 md:border-3 transition-all ml-auto',
            hideBubbles
              ? 'bg-mario text-white border-mario shadow-[2px_2px_0_rgba(0,0,0,0.3)]'
              : 'bg-luigi text-white border-luigi shadow-[2px_2px_0_rgba(0,0,0,0.3)]'
          )}
        >
          {hideBubbles ? 'Show Bubbles' : 'Hide Bubbles'}
        </button>

        {isLoading && (
          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="hidden sm:inline">Loading...</span>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div className="relative">
        <div
          ref={chartContainerRef}
          className="border-3 md:border-4 border-[var(--chart-border-dark)] rounded-lg md:rounded-xl shadow-[4px_4px_0_rgba(0,0,0,0.5)] md:shadow-[6px_6px_0_rgba(0,0,0,0.5)] bg-[var(--chart-bg-dark)] overflow-hidden touch-pan-x touch-pan-y"
          style={{
            minHeight: isMobile ? '350px' : '500px',
            touchAction: 'pan-x pan-y', // Better touch handling
          }}
        />

        {/* OHLCV Tooltip Overlay */}
        {tooltipData && (
          <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-[var(--chart-bg-dark)]/90 backdrop-blur-sm border-2 border-[var(--chart-border-dark)] rounded-lg p-2 md:p-3 pointer-events-none z-10 shadow-[2px_2px_0_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-2 gap-x-3 md:gap-x-4 gap-y-1 text-xs md:text-sm font-mono">
              <div className="text-[var(--outline-black)]/50">O</div>
              <div className="text-white font-bold">${tooltipData.open.toFixed(tooltipData.open < 0.01 ? 8 : 4)}</div>

              <div className="text-[var(--outline-black)]/50">H</div>
              <div className="text-[#26a69a] font-bold">${tooltipData.high.toFixed(tooltipData.high < 0.01 ? 8 : 4)}</div>

              <div className="text-[var(--outline-black)]/50">L</div>
              <div className="text-[#ef5350] font-bold">${tooltipData.low.toFixed(tooltipData.low < 0.01 ? 8 : 4)}</div>

              <div className="text-[var(--outline-black)]/50">C</div>
              <div className={cn('font-bold', tooltipData.close >= tooltipData.open ? 'text-[#26a69a]' : 'text-[#ef5350]')}>
                ${tooltipData.close.toFixed(tooltipData.close < 0.01 ? 8 : 4)}
              </div>

              {tooltipData.volume && (
                <>
                  <div className="text-[var(--outline-black)]/50">Vol</div>
                  <div className="text-[#A6D8FF] font-bold">
                    {tooltipData.volume >= 1000000
                      ? `${(tooltipData.volume / 1000000).toFixed(2)}M`
                      : tooltipData.volume >= 1000
                      ? `${(tooltipData.volume / 1000).toFixed(2)}K`
                      : tooltipData.volume.toFixed(0)
                    }
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chart Info */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-2 gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold">{tokenSymbol}</span> • {timeframe.toUpperCase()} Chart
          {dataSource === 'mock' && (
            <span className="px-2 py-0.5 bg-star text-outline rounded font-bold whitespace-nowrap">
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
