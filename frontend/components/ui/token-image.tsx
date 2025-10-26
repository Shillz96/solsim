"use client"

import { useState } from 'react'
import Image from 'next/image'
import { cn, createSafeImageProps } from '@/lib/utils'

interface TokenImageProps {
  src?: string | null
  alt: string
  className?: string
  width?: number
  height?: number
  size?: number
  fallback?: string
}

export function TokenImage({ 
  src, 
  alt, 
  className, 
  width, 
  height, 
  size = 32,
  fallback = "/placeholder-token.svg"
}: TokenImageProps) {
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const finalWidth = width || size
  const finalHeight = height || size
  
  // Process image source to ensure it loads properly
  let processedSrc = src
  if (src) {
    // Block HTTP IP addresses (security risk)
    if (src.match(/^http:\/\/\d+\.\d+\.\d+\.\d+/)) {
      console.warn(`Blocked unsafe HTTP IP address image: ${src}`)
      processedSrc = fallback
    }
    // Handle DexScreener URLs
    else if (src.includes('dd.dexscreener.com')) {
      // Ensure the URL has a proper https:// prefix if missing
      if (!src.startsWith('http')) {
        processedSrc = `https://${src}`
      }
    }
    // Handle other potential issues with URLs
    else if (src.startsWith('//')) {
      processedSrc = `https:${src}`
    }
    // Handle IPFS URLs
    else if (src.startsWith('ipfs://')) {
      processedSrc = `https://ipfs.io/ipfs/${src.replace('ipfs://', '')}`
    }
    // Handle arweave URLs
    else if (src.startsWith('ar://')) {
      processedSrc = `https://arweave.net/${src.replace('ar://', '')}`
    }
    
    // Debug image URL in development
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`Original token image URL: ${src}`)
      console.debug(`Processed token image URL: ${processedSrc}`)
    }
  }
  
  const imageSrc = (hasError || !processedSrc) ? fallback : processedSrc

  return (
    <div className={cn("relative overflow-hidden rounded-full", className)} style={{ width: finalWidth, height: finalHeight }}>
      {isLoading && !hasError && src && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-full" />
      )}
      <Image
        {...createSafeImageProps(
          imageSrc,
          fallback,
          alt
        )}
        width={finalWidth}
        height={finalHeight}
        className="object-cover rounded-full"
        onError={(e) => {
          console.warn(`Failed to load token image: ${src}`, e);
          setHasError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
        priority={false}
        quality={85}
        sizes={`${finalWidth}px`}
        referrerPolicy="no-referrer"
      />
    </div>
  )
}