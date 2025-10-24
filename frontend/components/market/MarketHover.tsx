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

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const res = await fetch("/api/market-hover", { cache: "no-store" });
      const j = await res.json();
      if (alive) setData(j);
    };
    load();
    const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return (
    <div className="relative inline-block group">
      {/* Trigger */}
      <div className="cursor-pointer">{trigger}</div>

      {/* Popover - positioned above the trigger on desktop */}
      <div
        className="
          invisible opacity-0 translate-y-2 group-hover:visible group-hover:opacity-100 group-hover:translate-y-0
          transition-all duration-200 ease-out
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[420px] z-[100]
        "
      >
        <div className="rounded-[16px] border-4 border-[var(--outline-black)] bg-[var(--card)] p-4 shadow-[6px_6px_0_var(--outline-black)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--luigi-green)] live-indicator" />
              <span className="font-mario text-sm tracking-wide uppercase">Market Lighthouse</span>
            </div>
            <span className="text-xs opacity-60">Updated {data ? "now" : "…"}</span>
          </div>

          {/* Market Stats */}
          <div className="space-y-2">
            <StatRow label="Pump.fun 24h Vol" value={fmtSol(data?.pumpVolume24h)} />
            <StatRow label="Total Crypto Market Cap" value={fmtUsd(data?.totalMarketCapUsd)} />
            <StatRow 
              label="Fear & Greed Index" 
              value={data?.fearGreedIndex != null ? `${data.fearGreedIndex} - ${data.fearGreedLabel}` : "—"} 
            />
            <StatRow 
              label="Altcoin Season Index" 
              value={data?.altcoinSeasonIndex != null ? `${data.altcoinSeasonIndex}/100` : "—"} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border-4 border-[var(--outline-black)] px-3 py-2 shadow-[6px_6px_0_var(--outline-black)] bg-[var(--card)]">
      <div className="flex justify-between items-center">
        <div className="text-[11px] opacity-70">{label}</div>
        <div className="text-sm font-semibold number-display">{value || "—"}</div>
      </div>
    </div>
  );
}

// ---- formatters ----
const fmtUsd = (n?: number|null) => (n==null ? "" : (n >= 1e12 ? `$${(n/1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`));
const fmtSol = (n?: number|null) => (n==null ? "" : `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL`);
