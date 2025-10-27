"use client";
import { useEffect, useState } from "react";

type Payload = {
  pumpVolume24h: number | null;
  totalMarketCapUsd: number | null;
  fearGreedIndex: number | null;
  fearGreedLabel: string | null;
  altcoinSeasonIndex: number | null;
  ts: number;
};

export default function MarketHover({ trigger }: { trigger: React.ReactNode }) {
  const [data, setData] = useState<Payload | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/market-hover", { cache: "no-store" });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const text = await res.text();
        let j;
        try {
          j = JSON.parse(text);
        } catch (parseError) {
          console.error('[MarketHover] Invalid JSON response:', text.substring(0, 200));
          throw new Error(`Invalid JSON response: ${parseError}`);
        }
        
        if (alive) {
          setData(j);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('[MarketHover] Error fetching data:', error);
        // Set fallback data on error
        if (alive) {
          setData({
            pumpVolume24h: null,
            totalMarketCapUsd: null,
            fearGreedIndex: null,
            fearGreedLabel: null,
            altcoinSeasonIndex: null,
            ts: Date.now(),
          });
        }
      }
    };
    load();
    const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const getTimeAgo = () => {
    if (!lastUpdate) return "—";
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  const getFearGreedColor = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "var(--text-secondary)";
    if (value >= 75) return "var(--luigi-green)"; // Extreme Greed - green
    if (value >= 55) return "var(--pipe-green)"; // Greed - lime
    if (value >= 45) return "var(--star-yellow)"; // Neutral - amber
    if (value >= 25) return "var(--coin-gold)"; // Fear - orange
    return "var(--mario-red)"; // Extreme Fear - red
  };

  const getAltSeasonColor = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "var(--text-secondary)";
    if (value >= 75) return "var(--luigi-green)"; // Altseason - green
    if (value >= 50) return "var(--star-yellow)"; // Mixed - amber
    return "var(--sky-blue)"; // Bitcoin Season - blue
  };

  return (
    <div className="relative inline-block group">
      {/* Trigger */}
      <div className="cursor-pointer">{trigger}</div>

      {/* Popover - positioned above the trigger with proper spacing */}
      <div
        className="
          invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0
          transition-all duration-200 ease-out
          absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[420px] z-tooltip
          pointer-events-none group-hover:pointer-events-auto
        "
      >
        <div className="dropdown-base dropdown-market-lighthouse dropdown-animate-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-luigi live-indicator" />
              <span className="font-mario text-sm tracking-wide uppercase">Market Lighthouse</span>
            </div>
            <span className="text-xs opacity-60">Updated {getTimeAgo()}</span>
          </div>

          {/* Market Stats */}
          <div className="space-y-2.5">
            {/* Pump.fun 24h Volume */}
            <StatRow 
              label="Pump.fun 24h Volume" 
              value={fmtSol(data?.pumpVolume24h)}
              icon="🔥"
            />
            
            {/* Total Crypto Market Cap */}
            <StatRow 
              label="Total Crypto Market Cap" 
              value={fmtUsd(data?.totalMarketCapUsd)}
              icon="💰"
            />
            
            {/* Fear & Greed Index */}
            <StatRow 
              label="Fear & Greed Index" 
              value={data?.fearGreedIndex != null ? `${data.fearGreedIndex}` : "—"}
              subValue={data?.fearGreedLabel || undefined}
              valueColor={getFearGreedColor(data?.fearGreedIndex)}
              icon="😱"
            />
            
            {/* Altcoin Season Index */}
            <StatRow 
              label="Altcoin Season Index" 
              value={data?.altcoinSeasonIndex != null ? `${data.altcoinSeasonIndex}/100` : "—"}
              subValue={
                data?.altcoinSeasonIndex != null 
                  ? data.altcoinSeasonIndex >= 75 
                    ? "Altseason" 
                    : data.altcoinSeasonIndex >= 50 
                      ? "Mixed Market" 
                      : "Bitcoin Season"
                  : undefined
              }
              valueColor={getAltSeasonColor(data?.altcoinSeasonIndex)}
              icon="🪙"
            />
          </div>

          {/* Footer */}
          <div className="mt-3 pt-2.5 border-t-2 border-outline">
            <p className="text-[10px] text-center opacity-60">
              Real-time data from CoinMarketCap & PumpPortal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ 
  label, 
  value, 
  subValue, 
  valueColor, 
  icon 
}: { 
  label: string; 
  value: string; 
  subValue?: string; 
  valueColor?: string; 
  icon?: string; 
}) {
  return (
    <div className="rounded-lg border-3 border-outline px-3 py-2.5 shadow-[4px_4px_0_var(--outline-black)] bg-gradient-to-br from-[var(--card)] to-[var(--card-hover)] hover:shadow-[5px_5px_0_var(--outline-black)] transition-all">
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          {icon && <span className="text-base">{icon}</span>}
          <div className="text-[11px] opacity-80 font-medium">{label}</div>
        </div>
        <div className="text-right">
          <div 
            className="text-sm font-bold number-display" 
            style={{ color: valueColor || 'inherit' }}
          >
            {value || "—"}
          </div>
          {subValue && (
            <div 
              className="text-[9px] font-semibold uppercase tracking-wide mt-0.5"
              style={{ color: valueColor || 'var(--text-secondary)' }}
            >
              {subValue}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- formatters ----
const fmtUsd = (n?: number|null) => (
  n == null ? "" : 
  n >= 1e12 ? `$${(n/1e12).toFixed(2)}T` : 
  n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : 
  n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : 
  `$${Math.round(n).toLocaleString()}`
);

const fmtSol = (n?: number|null) => (
  n == null ? "" : 
  n >= 1e6 ? `${(n/1e6).toFixed(2)}M SOL` :
  n >= 1e3 ? `${(n/1e3).toFixed(1)}K SOL` :
  `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL`
);
