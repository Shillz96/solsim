'use client'

/**
 * ResizableSplit Component - Optimized Version
 * 
 * Mario-themed resizable split panel with:
 * - Smooth, performant dragging
 * - Optimized re-renders
 * - Min/max constraints
 * - Persistent split ratio to localStorage
 * - Mario theme styling with hover/drag states
 */

import { useState, useEffect, useRef, useCallback, ReactNode, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface ResizableSplitProps {
  children: [ReactNode, ReactNode]
  orientation?: 'horizontal' | 'vertical'
  defaultRatio?: number // percentage for first panel (0-100)
  minRatio?: number // minimum percentage for first panel
  maxRatio?: number // maximum percentage for first panel
  storageKey?: string // localStorage key for persistence
  className?: string
}

export function ResizableSplit({
  children,
  orientation = 'vertical',
  defaultRatio = 60,
  minRatio = 30,
  maxRatio = 70,
  storageKey,
  className
}: ResizableSplitProps) {
  const [ratio, setRatio] = useState(defaultRatio)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const startPosRef = useRef<number>(0)
  const startRatioRef = useRef<number>(0)
  const debouncedSaveRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved ratio from localStorage
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey)
        if (saved) {
          const parsed = parseFloat(saved)
          if (!isNaN(parsed) && parsed >= minRatio && parsed <= maxRatio) {
            setRatio(parsed)
          }
        }
      } catch (error) {
        console.warn(`Failed to load split ratio from ${storageKey}:`, error)
      }
    }
  }, [storageKey, minRatio, maxRatio])

  // Optimized save function with cleanup
  const saveRatio = useCallback(
    (newRatio: number) => {
      if (storageKey && typeof window !== 'undefined') {
        try {
          localStorage.setItem(storageKey, newRatio.toString())
        } catch (error) {
          console.warn(`Failed to save split ratio to ${storageKey}:`, error)
        }
      }
    },
    [storageKey]
  )

  // Debounced save with proper cleanup
  const debouncedSaveRatio = useCallback(
    (newRatio: number) => {
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current)
      }
      debouncedSaveRef.current = setTimeout(() => saveRatio(newRatio), 200)
    },
    [saveRatio]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current)
      }
    }
  }, [])

  // Optimized mouse handlers with proper click-and-hold behavior
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    startPosRef.current = orientation === 'vertical' ? e.clientY : e.clientX
    startRatioRef.current = ratio
  }, [orientation, ratio])

  // Throttled mouse move handler for better performance
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    e.preventDefault()
    e.stopPropagation()

    const containerRect = containerRef.current.getBoundingClientRect()
    const containerSize = orientation === 'vertical' ? containerRect.height : containerRect.width
    const currentPos = orientation === 'vertical' ? e.clientY : e.clientX
    const startPos = startPosRef.current
    const startRatio = startRatioRef.current

    const delta = currentPos - startPos
    const deltaPercent = (delta / containerSize) * 100
    const newRatio = Math.max(minRatio, Math.min(maxRatio, startRatio + deltaPercent))

    setRatio(newRatio)
    // Only save on significant changes to reduce localStorage writes
    if (Math.abs(newRatio - ratio) > 1) {
      debouncedSaveRatio(newRatio)
    }
  }, [isDragging, orientation, minRatio, maxRatio, ratio, debouncedSaveRatio])

  const handleMouseUp = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    // Save final ratio
    debouncedSaveRatio(ratio)
  }, [ratio, debouncedSaveRatio])

  // Touch handlers with proper click-and-hold behavior
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    startPosRef.current = orientation === 'vertical' ? e.touches[0].clientY : e.touches[0].clientX
    startRatioRef.current = ratio
  }, [orientation, ratio])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return

    e.preventDefault()
    e.stopPropagation()

    const containerRect = containerRef.current.getBoundingClientRect()
    const containerSize = orientation === 'vertical' ? containerRect.height : containerRect.width
    const currentPos = orientation === 'vertical' ? e.touches[0].clientY : e.touches[0].clientX
    const startPos = startPosRef.current
    const startRatio = startRatioRef.current

    const delta = currentPos - startPos
    const deltaPercent = (delta / containerSize) * 100
    const newRatio = Math.max(minRatio, Math.min(maxRatio, startRatio + deltaPercent))

    setRatio(newRatio)
    if (Math.abs(newRatio - ratio) > 1) {
      debouncedSaveRatio(newRatio)
    }
  }, [isDragging, orientation, minRatio, maxRatio, ratio, debouncedSaveRatio])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    debouncedSaveRatio(ratio)
  }, [ratio, debouncedSaveRatio])

  // Optimized event listeners with proper click-and-hold behavior
  useEffect(() => {
    if (!isDragging) return

    const handleMove = (e: MouseEvent) => handleMouseMove(e)
    const handleTouch = (e: TouchEvent) => handleTouchMove(e)
    const handleUp = (e: MouseEvent) => handleMouseUp(e)
    const handleTouchEndLocal = (e: TouchEvent) => handleTouchEnd(e)

    // Add event listeners with capture to ensure they fire before other handlers
    document.addEventListener('mousemove', handleMove, { passive: false, capture: true })
    document.addEventListener('mouseup', handleUp, { passive: false, capture: true })
    document.addEventListener('touchmove', handleTouch, { passive: false, capture: true })
    document.addEventListener('touchend', handleTouchEndLocal, { passive: false, capture: true })

    return () => {
      document.removeEventListener('mousemove', handleMove, { capture: true })
      document.removeEventListener('mouseup', handleUp, { capture: true })
      document.removeEventListener('touchmove', handleTouch, { capture: true })
      document.removeEventListener('touchend', handleTouchEndLocal, { capture: true })
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // Memoized calculations to prevent unnecessary re-renders
  const isVertical = orientation === 'vertical'
  const panelSizes = useMemo(() => ({
    first: `${ratio}%`,
    second: `${100 - ratio}%`
  }), [ratio])

  // Memoized handle styles
  const handleStyles = useMemo(() => cn(
    "flex-shrink-0 bg-[var(--outline-black)] transition-all duration-150 cursor-row-resize select-none",
    isVertical ? "h-1 w-full" : "w-1 h-full",
    "hover:h-2 hover:bg-[var(--star-yellow)] hover:shadow-[2px_2px_0_var(--outline-black)]",
    isDragging && "h-2 bg-[var(--mario-red)] shadow-[2px_2px_0_var(--outline-black)]",
    isVertical ? "hover:h-2" : "hover:w-2",
    isDragging && (isVertical ? "h-2" : "w-2")
  ), [isVertical, isDragging])

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full w-full",
        isVertical ? "flex-col" : "flex-row",
        className
      )}
    >
      {/* First Panel */}
      <div
        className={cn(
          "flex-shrink-0 overflow-hidden",
          isVertical ? "w-full" : "h-full"
        )}
        style={{
          [isVertical ? 'height' : 'width']: panelSizes.first
        }}
      >
        {children[0]}
      </div>

      {/* Resize Handle */}
      <div
        className={handleStyles}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="separator"
        aria-label="Resize panels - drag to adjust panel sizes"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            const delta = e.key === 'ArrowUp' ? -2 : 2
            const newRatio = Math.max(minRatio, Math.min(maxRatio, ratio + delta))
            setRatio(newRatio)
            debouncedSaveRatio(newRatio)
          }
        }}
      />

      {/* Second Panel */}
      <div
        className={cn(
          "flex-1 overflow-hidden",
          isVertical ? "w-full" : "h-full"
        )}
        style={{
          [isVertical ? 'height' : 'width']: panelSizes.second
        }}
      >
        {children[1]}
      </div>
    </div>
  )
}
