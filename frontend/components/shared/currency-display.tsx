/**
 * Currency Display Components
 * Never combine currency glyphs - one per line
 * Primary + Secondary format with proper hierarchy
 */
import { ConnectionState, usePriceStreamContext } from "@/lib/price-stream-provider";

export type DisplayCurrency = "USD" | "SOL";
export type USD = number & { __brand: "USD" };
export type SOL = number & { __brand: "SOL" };

interface SolPriceResult {
  price: number;
  hasLivePrice: boolean;
}

// Get SOL price from the live stream without dangerous fallbacks
function useSolPrice(): SolPriceResult {
  try {
    const context = usePriceStreamContext();
    const solMint = "So11111111111111111111111111111111111111112";
    const solData = context?.prices?.get?.(solMint);
    const connectionReady = context?.connectionState === ConnectionState.Connected;
    const hasLivePrice = Boolean(
      connectionReady &&
      solData &&
      Number.isFinite(solData.price) &&
      solData.price > 0
    );

    return {
      price: hasLivePrice ? solData!.price : NaN,
      hasLivePrice,
    };
  } catch {
    return { price: NaN, hasLivePrice: false };
  }
}

interface CurrencyValueProps {
  /** USD amount (never SOL!) */
  usd: number;
  /** Primary display currency (defaults to USD) */
  primary?: DisplayCurrency;
  /** Show secondary currency */
  showSecondary?: boolean;
  /** Custom className for container */
  className?: string;
  /** Custom className for primary value */
  primaryClassName?: string;
  /** Custom className for secondary value */
  secondaryClassName?: string;
}

/**
 * Display a value in primary currency with optional secondary
 * RULE: Never show "$123 — 0.45 SOL" on same line
 * Format: Primary line, secondary line with "≈" prefix
 */
export function CurrencyValue({
  usd,
  primary = "USD",
  showSecondary = true,
  className = "",
  primaryClassName = "",
  secondaryClassName = "text-xs text-muted-foreground",
}: CurrencyValueProps) {
  const { price: solPrice, hasLivePrice } = useSolPrice();
  const hasLive = hasLivePrice && Number.isFinite(solPrice) && solPrice > 0;
  const canShowSecondary = showSecondary && hasLive && Number.isFinite(usd);
  const sol = hasLive && solPrice > 0 ? usd / solPrice : NaN;
  const hasUsd = Number.isFinite(usd);

  if (primary === "USD") {
    return (
      <div className={className}>
        <div className={primaryClassName}>{hasUsd ? formatUSD(usd) : "--"}</div>
        {canShowSecondary && (
          <div className={secondaryClassName}>≈ {formatSOL(sol)}</div>
        )}
      </div>
    );
  } else {
    return (
      <div className={className}>
        <div className={primaryClassName}>
          {hasLive ? formatSOL(sol) : "--"}
        </div>
        {canShowSecondary && (
          <div className={secondaryClassName}>≈ {hasUsd ? formatUSD(usd) : "--"}</div>
        )}
      </div>
    );
  }
}

interface PriceDisplayProps {
  /** Price in USD */
  priceUSD: number;
  /** Show SOL equivalent */
  showSol?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Display token price with high precision
 * Line 1: USD price with smart precision
 * Line 2: SOL price (optional)
 */
export function PriceDisplay({
  priceUSD,
  showSol = true,
  className = "",
}: PriceDisplayProps) {
  if (process.env.NODE_ENV !== "production") {
    const looksLikeUSD = Number.isFinite(priceUSD) && Math.abs(priceUSD) < 1e9;
    console.assert(looksLikeUSD, "PriceDisplay expects USD values");
  }
  const { price: solPrice, hasLivePrice } = useSolPrice();
  const hasLive = hasLivePrice && Number.isFinite(solPrice) && solPrice > 0;
  const canShowSol = showSol && hasLive && Number.isFinite(priceUSD);
  const priceSol = hasLive && solPrice > 0 ? priceUSD / solPrice : NaN;

  return (
    <div className={className}>
      <div className="font-mono">{formatPriceUSD(priceUSD)}</div>
      {canShowSol && (
        <div className="text-xs text-muted-foreground font-mono">
          {formatPriceSOL(priceSol)}
        </div>
      )}
    </div>
  );
}

interface PnLDisplayProps {
  /** PnL in USD */
  pnlUSD: number;
  /** Cost basis for percentage (USD only) */
  costBasisUSD?: number;
  /** Show SOL equivalent */
  showSol?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Display PnL with proper colorization
 * Line 1: USD with percentage
 * Line 2: SOL equivalent (optional)
 */
export function PnLDisplay({
  pnlUSD,
  costBasisUSD,
  showSol = true,
  className = "",
}: PnLDisplayProps) {
  if (process.env.NODE_ENV !== "production") {
    const costUndefined = costBasisUSD === undefined;
    const looksReasonable = costUndefined || Math.abs(costBasisUSD) < 1e9;
    console.assert(looksReasonable, "PnLDisplay expects costBasisUSD in dollars");
  }

  const { price: solPrice, hasLivePrice } = useSolPrice();
  const hasLive = hasLivePrice && Number.isFinite(solPrice) && solPrice > 0;
  const pnlSol = hasLive && solPrice > 0 ? pnlUSD / solPrice : NaN;
  const pnlPercent =
    costBasisUSD && costBasisUSD > 0 ? (pnlUSD / costBasisUSD) * 100 : 0;

  const colorClass =
    pnlUSD > 0
      ? "text-green-400"
      : pnlUSD < 0
      ? "text-red-400"
      : "text-muted-foreground";

  const sign = pnlUSD > 0 ? "+" : "";

  return (
    <div className={className}>
      <div className={`font-mono ${colorClass}`}>
        {sign}
        {formatUSD(pnlUSD)}
        {costBasisUSD && costBasisUSD > 0 && (
          <span className="ml-1">({sign}{pnlPercent.toFixed(2)}%)</span>
        )}
      </div>
      {showSol && hasLive && solPrice > 0 && (
        <div className={`text-xs font-mono ${colorClass}`}>
          {sign}
          {formatSOL(Math.abs(pnlSol))}
        </div>
      )}
    </div>
  );
}

interface CurrencyValueFromSOLProps extends Omit<CurrencyValueProps, "usd"> {
  /** SOL amount */
  sol: number;
}

/**
 * Helper when you have SOL and need the standard display without manual conversion
 */
export function CurrencyValueFromSOL({ sol, ...rest }: CurrencyValueFromSOLProps) {
  const { price: solPrice, hasLivePrice } = useSolPrice();
  const usd = hasLivePrice && solPrice > 0 ? sol * solPrice : NaN;
  return <CurrencyValue usd={usd} {...rest} />;
}

// Formatting helpers
function formatUSD(value: number): string {
  if (!isFinite(value)) return "$0.00";
  const abs = Math.abs(value);

  if (abs >= 10000) {
    return `$${compactNumber(value)}`;
  }
  if (abs >= 1) {
    return `$${value.toFixed(2)}`;
  }
  if (abs >= 0.01) {
    return `$${value.toFixed(4)}`;
  }
  if (abs === 0) {
    return "$0.00";
  }
  return `$${value.toFixed(6)}`;
}

function formatSOL(value: number): string {
  if (!isFinite(value)) return "0 SOL";
  const abs = Math.abs(value);

  if (abs >= 1000) {
    return `${compactNumber(value)} SOL`;
  }
  if (abs >= 1) {
    return `${value.toFixed(2)} SOL`;
  }
  if (abs >= 0.01) {
    return `${value.toFixed(4)} SOL`;
  }
  if (abs === 0) {
    return "0 SOL";
  }
  return `${value.toFixed(6)} SOL`;
}

function formatPriceUSD(value: number): string {
  if (!isFinite(value)) return "$0.00";
  const abs = Math.abs(value);

  if (abs >= 1) {
    return `$${value.toFixed(4)}`;
  }
  if (abs >= 0.0001) {
    return `$${value.toFixed(6)}`;
  }
  if (abs >= 0.000001) {
    return `$${value.toFixed(8)}`;
  }
  if (abs === 0) {
    return "$0.00";
  }
  
  // Very small: show with leading zeros notation
  const str = value.toFixed(12);
  const match = str.match(/^0\.0+/);
  if (match && match[0].length - 2 >= 5) {
    const zeros = match[0].length - 2;
    const significant = str.slice(match[0].length, match[0].length + 4);
    return `$0.0{${zeros}}${significant}`;
  }
  return `$${str}`;
}

function formatPriceSOL(value: number): string {
  if (!isFinite(value)) return "0 SOL";
  return `${value.toFixed(8)} SOL`;
}

function compactNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}
