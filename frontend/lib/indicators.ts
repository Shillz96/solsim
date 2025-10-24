/**
 * Technical Indicator Calculations
 *
 * Functions for calculating SMA, EMA, RSI, and other technical indicators
 */

import type { Time } from 'lightweight-charts'

export interface PriceData {
  time: Time
  value: number
}

/**
 * Calculate Simple Moving Average (SMA)
 * @param data - Array of price data points
 * @param period - Number of periods (e.g., 20 for SMA20)
 * @returns Array of SMA values
 */
export function calculateSMA(data: PriceData[], period: number): PriceData[] {
  const sma: PriceData[] = []

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) {
      sum += data[i - j].value
    }
    sma.push({
      time: data[i].time,
      value: sum / period,
    })
  }

  return sma
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param data - Array of price data points
 * @param period - Number of periods (e.g., 12 for EMA12)
 * @returns Array of EMA values
 */
export function calculateEMA(data: PriceData[], period: number): PriceData[] {
  const ema: PriceData[] = []
  const multiplier = 2 / (period + 1)

  // Start with SMA for the first value
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += data[i].value
  }
  let emaValue = sum / period
  ema.push({
    time: data[period - 1].time,
    value: emaValue,
  })

  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    emaValue = (data[i].value - emaValue) * multiplier + emaValue
    ema.push({
      time: data[i].time,
      value: emaValue,
    })
  }

  return ema
}

/**
 * Calculate Relative Strength Index (RSI)
 * @param data - Array of price data points
 * @param period - Number of periods (typically 14)
 * @returns Array of RSI values (0-100)
 */
export function calculateRSI(data: PriceData[], period: number = 14): PriceData[] {
  const rsi: PriceData[] = []

  if (data.length < period + 1) {
    return rsi
  }

  // Calculate price changes
  const changes: number[] = []
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].value - data[i - 1].value)
  }

  // Calculate initial average gain and loss
  let avgGain = 0
  let avgLoss = 0
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i]
    } else {
      avgLoss += Math.abs(changes[i])
    }
  }
  avgGain /= period
  avgLoss /= period

  // Calculate first RSI value
  let rs = avgGain / (avgLoss || 1) // Avoid division by zero
  let rsiValue = 100 - 100 / (1 + rs)
  rsi.push({
    time: data[period].time,
    value: rsiValue,
  })

  // Calculate subsequent RSI values using smoothed averages
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    rs = avgGain / (avgLoss || 1)
    rsiValue = 100 - 100 / (1 + rs)

    rsi.push({
      time: data[i + 1].time,
      value: rsiValue,
    })
  }

  return rsi
}

/**
 * Calculate Volume Profile (Price levels with most trading volume)
 * @param data - Array of candlestick data with volume
 * @param bins - Number of price bins to divide the range into
 * @returns Array of volume profile data
 */
export interface VolumeProfileData {
  price: number
  volume: number
  percentage: number
}

export function calculateVolumeProfile(
  data: Array<{ high: number; low: number; volume: number }>,
  bins: number = 24
): VolumeProfileData[] {
  if (data.length === 0) return []

  // Find price range
  const prices = data.flatMap((d) => [d.high, d.low])
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const priceRange = maxPrice - minPrice
  const binSize = priceRange / bins

  // Initialize bins
  const volumeBins: number[] = new Array(bins).fill(0)

  // Distribute volume across bins
  for (const candle of data) {
    const avgPrice = (candle.high + candle.low) / 2
    const binIndex = Math.min(Math.floor((avgPrice - minPrice) / binSize), bins - 1)
    volumeBins[binIndex] += candle.volume
  }

  // Find max volume for percentage calculation
  const maxVolume = Math.max(...volumeBins)

  // Create volume profile data
  const profile: VolumeProfileData[] = []
  for (let i = 0; i < bins; i++) {
    profile.push({
      price: minPrice + (i + 0.5) * binSize,
      volume: volumeBins[i],
      percentage: (volumeBins[i] / maxVolume) * 100,
    })
  }

  return profile
}
