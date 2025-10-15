// Advanced WebSocket Client Integration Example
// This demonstrates the full hardened WebSocket with shared types

// import { PriceTickV1, type PriceTick } from "@virtualsol/types";
import { connectPrices } from "../lib/ws";
import { env } from "../lib/env";
import { lamportsToSolStr, formatLamportsAsSOL, usdToLamports } from "../lib/format";

/**
 * Example of how to integrate the hardened WebSocket client
 * with the shared type contracts and decimal-safe formatting
 * 
 * Key improvements:
 * 1. Schema validation prevents parsing errors
 * 2. Heartbeat prevents proxy/mobile drops  
 * 3. Exponential backoff with jitter
 * 4. Decimal-safe number handling eliminates float precision bugs
 * 5. Runtime env validation fails fast on wrong URLs
 */

export function useHardenedPriceStream() {
  // Note: Uncomment when @virtualsol/types is properly installed
  /*
  const onPriceTick = (tick: PriceTick) => {
    console.log('✅ [HARDENED] Validated price tick:', {
      version: tick.v,
      sequence: tick.seq,
      mint: tick.mint,
      priceLamports: tick.priceLamports,
      solEquivalent: lamportsToSolStr(tick.priceLamports),
      formatted: formatLamportsAsSOL(tick.priceLamports),
      timestamp: new Date(tick.ts).toISOString()
    });
    
    // Update your price state here with confidence
    // that the data is validated and decimal-safe
  };

  const cleanup = connectPrices(onPriceTick, env.NEXT_PUBLIC_WS_URL);
  
  return cleanup;
  */
}

/**
 * Example component showing proper integration
 */
export function ExamplePriceDisplay({ usdPrice, solPriceUsd }: { 
  usdPrice: number; 
  solPriceUsd: number; 
}) {
  // Convert USD to lamports for decimal-safe storage
  const lamports = usdToLamports(usdPrice, solPriceUsd);
  
  return (
    <div className="space-y-1">
      <div className="text-lg font-medium">
        ${usdPrice.toFixed(2)}
      </div>
      <div className="text-sm text-muted-foreground">
        {formatLamportsAsSOL(lamports.toString())}
      </div>
    </div>
  );
}

/**
 * Integration notes:
 *
 * 1. Always use the connectPrices function from lib/ws.ts for WebSocket connections
 * 2. Store prices as lamports strings to avoid float precision issues
 * 3. Use formatting utilities from lib/format.ts for display
 * 4. Environment variables are validated at startup via lib/env.ts
 * 5. Message contracts prevent schema drift between frontend/backend
 *
 * Benefits:
 * - No more tiny/wrong numbers from float rounding
 * - Connections survive Safari/mobile/Railway proxy issues
 * - Schema validation catches backend changes early
 * - Heartbeat prevents silent connection drops
 * - Exponential backoff prevents thundering herd on reconnect
 */