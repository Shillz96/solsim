"use client"

import { useState } from "react"
import { getTokenLogoAlternatives } from "@/lib/token-logos"

interface TokenLogoProps {
  src?: string
  alt: string
  mint?: string
  className?: string
  fallbackClassName?: string
}

/**
 * Enhanced token logo component with automatic fallback handling
 * Tries alternative logo URLs if primary fails
 */
export function TokenLogo({
  src,
  alt,
  mint,
  className = "",
  fallbackClassName = "bg-gradient-to-br from-purple-500 to-pink-500"
}: TokenLogoProps) {
  const [currentSrc, setCurrentSrc] = useState(src)
  const [attemptIndex, setAttemptIndex] = useState(0)
  const [hasError, setHasError] = useState(false)

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
        className={`flex items-center justify-center text-white font-bold ${fallbackClassName} ${className}`}
        aria-label={alt}
      >
        {firstLetter}
      </div>
    )
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
    />
  )
}
