"use client"

import { useEffect, useState } from "react"
import { formatNumber } from "@/lib/format"
import { createSafeImageProps } from "@/lib/utils"
import { EnhancedCard, CardGrid, CardSection } from "@/components/ui/enhanced-card-system"
import { Badge } from "@/components/ui/badge"
import {
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertCircle,
  Globe,
  Twitter,
  MessageSquare,
  Clock,
  Users,
  Copy,
  Check,
} from "lucide-react"
import { AnimatedNumber } from "@/components/ui/animated-number"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TokenLogo } from "@/components/ui/token-logo"
import { usePriceStreamContext } from "@/lib/price-stream-provider"
import { useTokenMetadata } from "@/hooks/use-token-metadata"
// ✅ Import standardized components instead of manual formatting
import { PriceCell, MoneyCell } from "@/components/ui/table-cells"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TokenDetailsHeaderProps {
  tokenAddress: string
}

export function TokenDetailsHeader({ tokenAddress }: TokenDetailsHeaderProps) {
  // Fetch token details using the token metadata hook
  const { data: tokenDetails, isLoading, error } = useTokenMetadata(tokenAddress, !!tokenAddress)

  // Real-time price stream integration
  const { connected: wsConnected, prices: livePrices, subscribe, unsubscribe } = usePriceStreamContext()

  // Copy to clipboard state
  const [copied, setCopied] = useState(false)
  
  // Subscribe to price updates for this token
  useEffect(() => {
    if (!tokenAddress || !wsConnected) return
    
    subscribe(tokenAddress)
    
    return () => {
      if (wsConnected) {
        unsubscribe(tokenAddress)
      }
    }
  }, [tokenAddress, wsConnected, subscribe, unsubscribe])
  
  // Get current price from WebSocket or fallback to API data
  const livePrice = livePrices.get(tokenAddress)
  // Ensure currentPrice is always a number for AnimatedNumber component
  const currentPrice = livePrice?.price || tokenDetails?.price || Number(tokenDetails?.lastPrice) || 0
  
  // Format numbers for display using the global formatter
  const formatNumber = (num: number | null | undefined) => {
    if (num === null || num === undefined) return 'N/A'
    return formatNumber(num)
  }

  if (isLoading) {
    return (
      <div className="mario-card p-4 mb-4 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Loading token information...</span>
      </div>
    )
  }

  if (error || !tokenDetails) {
    return (
      <div className="mario-card p-4 mb-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load token information: {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const priceChange = livePrice?.change24h || (tokenDetails.priceChange24h ? Number(tokenDetails.priceChange24h) : null)
  const isPositiveChange = priceChange !== undefined && priceChange !== null && priceChange > 0
  const isNegativeChange = priceChange !== undefined && priceChange !== null && priceChange < 0
  
  // Get SOL price for equivalents
  const solPrice = livePrices.get('So11111111111111111111111111111111111111112')?.price || 0
  
  // Debug logging for token image URL - helpful for troubleshooting
  if (process.env.NODE_ENV !== 'production') {
    console.debug(`Token ${tokenDetails.symbol} image URL: ${tokenDetails.imageUrl || tokenDetails.logoURI || 'not available'}`)
  }

  // Parse social links
  const parseSocials = () => {
    if (!tokenDetails.socials) return [];
    try {
      const parsed = JSON.parse(tokenDetails.socials);
      console.log('Parsed socials:', parsed);
      return parsed;
    } catch (e) {
      console.error('Failed to parse socials:', tokenDetails.socials, e);
      return [];
    }
  };

  // Parse websites
  const parseWebsites = () => {
    if (!tokenDetails.websites) return [];
    try {
      const parsed = JSON.parse(tokenDetails.websites);
      console.log('Parsed websites:', parsed);
      return parsed;
    } catch (e) {
      console.error('Failed to parse websites:', tokenDetails.websites, e);
      return [];
    }
  };

  const websites = parseWebsites();
  const socials = parseSocials();

  // Debug: Log the final arrays
  console.log('Token:', tokenDetails.symbol, '| Websites array:', websites, '| Socials array:', socials);
  
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Unknown';
    return new Date(timestamp).toLocaleDateString(undefined, { 
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to get social icon by URL
  const getSocialIcon = (url: string) => {
    if (url.includes('twitter.com') || url.includes('x.com')) return <Twitter className="h-4 w-4" />;
    if (url.includes('t.me') || url.includes('telegram')) return <MessageSquare className="h-4 w-4" />;
    return <Globe className="h-4 w-4" />;
  };

  // DexScreener Icon Component
  const DexScreenerIcon = ({ className }: { className?: string }) => (
    <img
      {...createSafeImageProps(
        "https://images.seeklogo.com/logo-png/52/1/dex-screener-logo-png_seeklogo-527276.png",
        "/icons/external-link.png", // Fallback icon
        "DexScreener"
      )}
      className={className}
      onError={(e) => {
        // If both image and fallback fail, replace with icon
        const target = e.currentTarget;
        const iconSpan = document.createElement('span');
        iconSpan.innerHTML = '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>';
        target.parentNode?.replaceChild(iconSpan, target);
      }}
    />
  );

  // Solscan Icon Component
  const SolscanIcon = ({ className }: { className?: string }) => (
    <img
      src="/solscan-logo-dark.svg"
      alt="Solscan"
      className={className}
    />
  );

  // Copy address to clipboard
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(tokenAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  return (
    <div className="mario-card relative overflow-hidden bg-card">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-blue-500/5 opacity-50"></div>
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500"></div>

      {/* Mobile Compact Layout */}
      <div className="relative z-10 p-4 md:p-6 lg:hidden">
        <div className="flex items-start gap-3">
          {/* Token Image - Optimized for mobile */}
          <div className="relative flex-shrink-0">
            <TokenLogo
              src={tokenDetails.imageUrl || tokenDetails.logoURI || undefined}
              alt={tokenDetails.name || 'Token'}
              mint={tokenAddress}
              className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-primary/20"
            />
            {(tokenDetails.isNew || tokenDetails.isTrending) && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-luigi rounded-full animate-pulse"></div>
            )}
          </div>

          {/* Token Info - Optimized spacing */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[18px] sm:text-xl font-bold leading-tight">
                {tokenDetails.symbol}
              </h1>
              <span className="text-sm sm:text-base text-muted-foreground truncate max-w-[140px] sm:max-w-[180px]">
                {tokenDetails.name}
              </span>
            </div>

            {/* Contract Address - Readable on mobile */}
            <div className="text-xs sm:text-sm text-muted-foreground font-mono mt-1.5">
              {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
            </div>

            {/* Social Links - Touch-friendly */}
            <div className="flex gap-1.5 mt-2">
              <TooltipProvider>
                {socials.slice(0, 1).map((social: string, index: number) => (
                  <Link
                    key={`social-${index}`}
                    href={social}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 touch-manipulation">
                      {getSocialIcon(social)}
                    </Button>
                  </Link>
                ))}
                <Link
                  href={`https://dexscreener.com/solana/${tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 touch-manipulation">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Metrics - Responsive Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4">
          <div className="text-left p-2.5 sm:p-3 bg-muted/30 rounded-lg">
            <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-1">Price</div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1">
              <PriceCell
                priceUSD={currentPrice}
                priceChangePercent={priceChange ?? undefined}
                className="text-sm sm:text-base font-mono font-bold leading-tight"
                showSolEquiv={false}
              />
              {priceChange !== undefined && priceChange !== null && (
                <span className={`text-[10px] sm:text-xs font-bold ${isPositiveChange ? 'text-green-400' : isNegativeChange ? 'text-red-400' : 'text-muted-foreground'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {tokenDetails.marketCapUsd && (
            <div className="text-left p-2.5 sm:p-3 bg-muted/30 rounded-lg">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-1">MCap</div>
              <MoneyCell
                usd={Number(tokenDetails.marketCapUsd)}
                className="text-sm sm:text-base font-mono font-bold leading-tight"
                hideSolEquiv={true}
              />
            </div>
          )}

          {tokenDetails.volume24h && (
            <div className="text-left p-2.5 sm:p-3 bg-muted/30 rounded-lg">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-1">24h Vol</div>
              <MoneyCell
                usd={Number(tokenDetails.volume24h)}
                className="text-sm sm:text-base font-mono font-bold leading-tight"
                hideSolEquiv={true}
              />
            </div>
          )}

          {tokenDetails.liquidityUsd && (
            <div className="text-left p-2.5 sm:p-3 bg-muted/30 rounded-lg">
              <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide mb-1">Liquidity</div>
              <MoneyCell
                usd={Number(tokenDetails.liquidityUsd)}
                className="text-sm sm:text-base font-mono font-bold leading-tight"
                hideSolEquiv={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Desktop Layout - Compact Design */}
      <div className="relative z-10 p-3 hidden lg:block">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Token Info */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative flex-shrink-0">
              <TokenLogo
                src={tokenDetails.imageUrl || tokenDetails.logoURI || undefined}
                alt={tokenDetails.name || 'Token'}
                mint={tokenAddress}
                className="w-12 h-12 ring-2 ring-primary/20"
              />
              {(tokenDetails.isNew || tokenDetails.isTrending) && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-luigi rounded-full animate-pulse"></div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">
                  {tokenDetails.symbol}
                </h1>
                <span className="text-sm text-muted-foreground">
                  {tokenDetails.name}
                </span>
                {tokenDetails.isNew && (
                  <Badge variant="default" className="text-xs bg-sky h-5 px-2">
                    New
                  </Badge>
                )}
                {tokenDetails.isTrending && (
                  <Badge variant="default" className="text-xs bg-luigi h-5 px-2">
                    Trending
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Click-to-copy Contract Address */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={copyAddress}
                        className="flex items-center gap-2 text-sm text-muted-foreground font-mono bg-muted/30 px-3 py-1.5 rounded hover:bg-muted/50 transition-colors group"
                      >
                        <span>{tokenAddress.slice(0, 4)}...{tokenAddress.slice(-4)}</span>
                        {copied ? (
                          <Check className="h-3.5 w-3.5 text-luigi" />
                        ) : (
                          <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-popover text-popover-foreground border border-border">
                      <p className="font-medium">{copied ? 'Copied!' : 'Click to copy address'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Social Links - Inline and Compact */}
                <div className="flex gap-1.5">
                  <TooltipProvider>
                    {websites.length > 0 && websites.slice(0, 1).map((website: string, index: number) => (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <Link href={website} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10">
                              <Globe className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-popover text-popover-foreground border border-border">
                          <p className="font-medium">Website</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}

                    {socials.length > 0 && socials.slice(0, 2).map((social: string, index: number) => (
                      <Tooltip key={`social-${index}`}>
                        <TooltipTrigger asChild>
                          <Link href={social} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10">
                              {getSocialIcon(social)}
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-popover text-popover-foreground border border-border">
                          <p className="font-medium">{social.includes('twitter.com') || social.includes('x.com') ? 'Twitter' :
                             social.includes('t.me') ? 'Telegram' : 'Social'}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`https://dexscreener.com/solana/${tokenAddress}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10">
                            <DexScreenerIcon className="h-4 w-4 object-contain" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-popover text-popover-foreground border border-border">
                        <p className="font-medium">DexScreener</p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`https://solscan.io/token/${tokenAddress}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-primary/10">
                            <SolscanIcon className="h-4 w-4 object-contain" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="bg-popover text-popover-foreground border border-border">
                        <p className="font-medium">Solscan</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Metrics - Compact Grid */}
          <div className="flex items-center gap-2.5 ml-auto">
            <div className="text-center p-2.5 bg-muted/30 rounded-lg min-w-[120px]">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Price</div>
              <div className="flex flex-col items-center gap-0.5">
                <PriceCell
                  priceUSD={currentPrice}
                  priceChangePercent={priceChange ?? undefined}
                  className="text-base font-mono font-bold"
                  showSolEquiv={false}
                />
                {priceChange !== undefined && priceChange !== null && (
                  <div className={`flex items-center text-xs px-1.5 py-0.5 rounded ${
                    isPositiveChange
                      ? 'text-green-400 bg-luigi/10'
                      : isNegativeChange
                        ? 'text-red-400 bg-mario/10'
                        : 'text-muted-foreground bg-muted/20'
                  }`}>
                    {isPositiveChange && <TrendingUp className="h-2.5 w-2.5 mr-0.5" />}
                    {isNegativeChange && <TrendingDown className="h-2.5 w-2.5 mr-0.5" />}
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </div>
                )}
              </div>
            </div>

            {tokenDetails.marketCapUsd && (
              <div className="text-center p-2.5 bg-muted/30 rounded-lg min-w-[100px]">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">MCap</div>
                <MoneyCell
                  usd={Number(tokenDetails.marketCapUsd)}
                  className="text-sm font-mono font-bold"
                  hideSolEquiv={true}
                />
              </div>
            )}

            {tokenDetails.volume24h && (
              <div className="text-center p-2.5 bg-muted/30 rounded-lg min-w-[100px]">
                <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">24h Vol</div>
                <MoneyCell
                  usd={Number(tokenDetails.volume24h)}
                  className="text-sm font-mono font-bold"
                  hideSolEquiv={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
