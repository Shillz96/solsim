"use client"

import { useState, useEffect } from "react"
import { getTokenLogoFallback, getTokenLogoAlternatives } from "@/lib/token-logos"

interface TokenLogoProps {
  /** Primary logo URL from API */
  src?: string
  /** Alt text (usually token symbol) */
  alt: string
  /** Token mint address for fallback lookup */
  mint?: string
  /** Custom className for styling */
  className?: string
  /** Fallback className for letter avatar */
  fallbackClassName?: string
}

/**
 * Consolidated Token Logo Component
 *
 * Handles token logos with intelligent fallback chain:
 * 1. API-provided logo URL (src prop)
 * 2. Curated fallback from token-logos.ts
 * 3. Alternative CDN URLs
 * 4. First letter avatar with gradient
 *
 * Features:
 * - Automatic error handling with fallback cascade
 * - Lazy loading for performance
 * - Consistent styling across app
 * - Colored avatars for missing logos
 *
 * @example
 * ```tsx
 * <TokenLogo
 *   src={token.logoURI}
 *   alt={token.symbol}
 *   mint={token.mint}
 *   className="w-10 h-10 rounded-full"
 * />
 * ```
 */
export function TokenLogo({
  src,
  alt,
  mint,
  className = "",
  fallbackClassName = "bg-gradient-to-br from-purple-500 to-pink-500"
}: TokenLogoProps) {
  // Initialize with src or curated fallback
  const [currentSrc, setCurrentSrc] = useState(src || (mint ? getTokenLogoFallback(mint) : undefined))
  const [attemptIndex, setAttemptIndex] = useState(0)
  const [hasError, setHasError] = useState(false)

  // CRITICAL FIX: Reset state when src or mint changes
  useEffect(() => {
    const newSrc = src || (mint ? getTokenLogoFallback(mint) : undefined)
    setCurrentSrc(newSrc)
    setAttemptIndex(0)
    setHasError(false)
  }, [src, mint])

  const handleError = () => {
    if (mint) {
      const alternatives = getTokenLogoAlternatives(mint)

      if (attemptIndex < alternatives.length) {
        // Try next alternative
        setCurrentSrc(alternatives[attemptIndex])
        setAttemptIndex(prev => prev + 1)
        return
      }
    }

    // No more alternatives, show fallback
    setHasError(true)
  }

  if (!currentSrc || hasError) {
    // Fallback: Show first letter of alt text in a colored circle
    const firstLetter = alt.charAt(0).toUpperCase()

    return (
      <div
        className={`flex items-center justify-center text-white font-bold rounded-full ${fallbackClassName} ${className}`}
        aria-label={alt}
        title={alt}
      >
        {firstLetter}
      </div>
    )
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      title={alt}
      className={`rounded-full object-cover ${className}`}
      onError={handleError}
      loading="lazy"
    />
  )
}

/**
 * Re-export as TokenImage for flexibility
 */
export const TokenImage = TokenLogo
