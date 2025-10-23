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
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  SeriesMarker,
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

export function LightweightChart({
  tokenMint,
  tokenSymbol,
  className,
}: LightweightChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)

  const [timeframe, setTimeframe] = useState<Timeframe>('5m')
  const [isLoading, setIsLoading] = useState(true)

  // Get SOL price for average cost calculations
  const { prices } = usePriceStreamContext()
  const solPrice = prices.get('So11111111111111111111111111111111111111112')?.price || 208

  // Add trade markers (buy/sell arrows)
  useTradeMarkers(candlestickSeriesRef.current, tokenMint)

  // Add average cost price line
  useAverageCostLine(candlestickSeriesRef.current, tokenMint, solPrice)

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { type: ColorType.Solid, color: '#FFFAE9' }, // Mario theme cream
        textColor: '#1C1C1C', // Outline black
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#e5e5e5' },
        horzLines: { color: '#e5e5e5' },
      },
      crosshair: {
        mode: 1, // CrosshairMode.Normal
        vertLine: {
          width: 2,
          color: '#1C1C1C',
          style: LineStyle.Dashed,
        },
        horzLine: {
          width: 2,
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
      },
      timeScale: {
        borderColor: '#1C1C1C',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
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
        pinch: true,
      },
    })

    // Candlestick series with Mario theme colors
    const candlestickSeries = chart.addSeries('Candlestick' as any, {
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
    }) as ISeriesApi<'Candlestick'>

    // Volume histogram
    const volumeSeries = chart.addSeries('Histogram' as any, {
      color: '#A6D8FF', // Sky blue
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Create separate scale
      lastValueVisible: false,
      priceLineVisible: false,
    }) as ISeriesApi<'Histogram'>

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
  }, [])

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

          // Fit content
          chartRef.current?.timeScale().fitContent()

          console.log(`✅ Loaded ${candlesticks.length} candles`)
        }
      } catch (error) {
        console.error('Failed to load OHLCV:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchOHLCV()
  }, [tokenMint, timeframe])

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d']

  return (
    <div className={cn('space-y-2', className)}>
      {/* Timeframe Selector */}
      <div className="flex gap-2 flex-wrap">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg border-3 border-[var(--outline-black)] transition-all',
              timeframe === tf
                ? 'bg-[var(--star-yellow)] shadow-[3px_3px_0_var(--outline-black)] -translate-y-[1px]'
                : 'bg-white hover:bg-[var(--pipe-100)] shadow-[2px_2px_0_var(--outline-black)]'
            )}
          >
            {tf.toUpperCase()}
          </button>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading...</span>
          </div>
        )}
      </div>

      {/* Chart Container */}
      <div
        ref={chartContainerRef}
        className="border-4 border-[var(--outline-black)] rounded-[16px] shadow-[6px_6px_0_var(--outline-black)] bg-[#FFFAE9] overflow-hidden"
        style={{ minHeight: '500px' }}
      />

      {/* Chart Info */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-2">
        <div>
          <span className="font-bold">{tokenSymbol}</span> • {timeframe.toUpperCase()} Chart
        </div>
        <div>
          Powered by TradingView Lightweight Charts
        </div>
      </div>
    </div>
  )
}
