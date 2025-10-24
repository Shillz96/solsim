'use client'

/**
 * ResizableSplit Component
 * 
 * Mario-themed resizable split panel with:
 * - Draggable handle between two panels
 * - Smooth resize animation
 * - Min/max constraints
 * - Persistent split ratio to localStorage
 * - Mario theme styling with hover/drag states
 */

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
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

  // Save ratio to localStorage (debounced)
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

  // Debounced save function
  const debouncedSave = useRef<NodeJS.Timeout>()
  const debouncedSaveRatio = useCallback(
    (newRatio: number) => {
      if (debouncedSave.current) {
        clearTimeout(debouncedSave.current)
      }
      debouncedSave.current = setTimeout(() => saveRatio(newRatio), 100)
    },
    [saveRatio]
  )

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startPosRef.current = orientation === 'vertical' ? e.clientY : e.clientX
    startRatioRef.current = ratio
  }, [orientation, ratio])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const containerSize = orientation === 'vertical' ? containerRect.height : containerRect.width
    const currentPos = orientation === 'vertical' ? e.clientY : e.clientX
    const startPos = startPosRef.current
    const startRatio = startRatioRef.current

    const delta = currentPos - startPos
    const deltaPercent = (delta / containerSize) * 100
    const newRatio = Math.max(minRatio, Math.min(maxRatio, startRatio + deltaPercent))

    setRatio(newRatio)
    debouncedSaveRatio(newRatio)
  }, [isDragging, orientation, minRatio, maxRatio, debouncedSaveRatio])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startPosRef.current = orientation === 'vertical' ? e.touches[0].clientY : e.touches[0].clientX
    startRatioRef.current = ratio
  }, [orientation, ratio])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const containerSize = orientation === 'vertical' ? containerRect.height : containerRect.width
    const currentPos = orientation === 'vertical' ? e.touches[0].clientY : e.touches[0].clientX
    const startPos = startPosRef.current
    const startRatio = startRatioRef.current

    const delta = currentPos - startPos
    const deltaPercent = (delta / containerSize) * 100
    const newRatio = Math.max(minRatio, Math.min(maxRatio, startRatio + deltaPercent))

    setRatio(newRatio)
    debouncedSaveRatio(newRatio)
  }, [isDragging, orientation, minRatio, maxRatio, debouncedSaveRatio])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Global event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  const isVertical = orientation === 'vertical'
  const firstPanelSize = `${ratio}%`
  const secondPanelSize = `${100 - ratio}%`

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
          [isVertical ? 'height' : 'width']: firstPanelSize
        }}
      >
        {children[0]}
      </div>

      {/* Resize Handle */}
      <div
        className={cn(
          "flex-shrink-0 bg-[var(--outline-black)] transition-all duration-200 cursor-row-resize",
          isVertical ? "h-1 w-full" : "w-1 h-full",
          "hover:h-2 hover:bg-[var(--star-yellow)] hover:shadow-[2px_2px_0_var(--outline-black)]",
          isDragging && "h-2 bg-[var(--mario-red)] shadow-[2px_2px_0_var(--outline-black)]",
          isVertical ? "hover:h-2" : "hover:w-2",
          isDragging && (isVertical ? "h-2" : "w-2")
        )}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="separator"
        aria-label="Resize panels"
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
          [isVertical ? 'height' : 'width']: secondPanelSize
        }}
      >
        {children[1]}
      </div>
    </div>
  )
}
