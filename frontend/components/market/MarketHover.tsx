"use client";
import { useEffect, useState } from "react";

type WinKey = "5m" | "1h" | "6h" | "24h";
type PumpWin = { totalTrades:number; traders:number; volumeSol:number; created:number; migrations:number; };
type Payload = {
  pump: Record<WinKey, PumpWin>;
  cmc: { totalMarketCapUsd:number|null; btcDominancePct:number|null; totalVolume24hUsd:number|null };
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

  const W: WinKey[] = ["5m","1h","6h","24h"];

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

          {/* CMC summary row */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <StatTile label="Market Cap" value={fmtUsd(data?.cmc.totalMarketCapUsd)} />
            <StatTile label="BTC.D" value={percent(data?.cmc.btcDominancePct)} />
            <StatTile label="24h Vol" value={fmtUsd(data?.cmc.totalVolume24hUsd)} />
          </div>

          {/* Pump.fun windows */}
          <div className="space-y-2">
            {W.map(w => (
              <WinRow key={w} label={w} win={data?.pump?.[w]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label:string; value:string }) {
  return (
    <div className="rounded-[16px] border-4 border-[var(--outline-black)] px-3 py-2 shadow-[6px_6px_0_var(--outline-black)] bg-[var(--card)]">
      <div className="text-[11px] opacity-70 leading-none">{label}</div>
      <div className="text-sm font-semibold number-display mt-1">{value || "—"}</div>
    </div>
  );
}

function WinRow({ label, win }: { label:string; win?:PumpWin }) {
  return (
    <div className="grid grid-cols-5 gap-2 items-center">
      <div className="text-xs inline-flex items-center justify-center px-2 py-1 bg-[var(--coin-gold)] border-2 border-[var(--outline-black)] rounded-full font-mario shadow-[2px_2px_0_var(--outline-black)] uppercase">{label}</div>
      <Pair k="Trades" v={win?.totalTrades} />
      <Pair k="Traders" v={win?.traders} />
      <Pair k="Vol (SOL)" v={win ? round(win.volumeSol,2) : undefined} />
      <Pair k="Created / Mig" v={win ? `${win.created}/${win.migrations}` : undefined} />
    </div>
  );
}

function Pair({ k, v }: { k:string; v?:number|string }) {
  return (
    <div className="px-2 py-1 rounded-[12px] border-4 border-[var(--outline-black)] bg-[var(--card)] text-[11px] shadow-[4px_4px_0_var(--outline-black)]">
      <div className="opacity-60 leading-none">{k}</div>
      <div className="leading-tight font-semibold number-display">{v ?? "—"}</div>
    </div>
  );
}

// ---- formatters ----
const fmtUsd = (n?: number|null) => (n==null ? "" : (n >= 1e12 ? `$${(n/1e12).toFixed(2)}T` : n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`));
const percent = (n?: number|null) => (n==null ? "" : `${n.toFixed(1)}%`);
const round = (n:number, d=2) => Number(n.toFixed(d));
