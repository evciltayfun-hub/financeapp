"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, YAxis, XAxis, CartesianGrid,
} from "recharts";
import { RefreshCw, TrendingUp, TrendingDown, PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrivacy } from "@/lib/privacy-context";
import { cn } from "@/lib/utils";

const HIDDEN = "••••••";

type AssetType = "BIST" | "US" | "CRYPTO";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
}

interface ChartPoint { date: string; close: number }

interface PriceInfo {
  price: number | null;
  prevClose: number | null;
  currency: string;
}

const typeConfig: Record<AssetType, { color: string; chartColor: string; gradFrom: string; hue: number }> = {
  BIST:   { color: "oklch(0.55 0.12 145)", chartColor: "#4ade80", gradFrom: "oklch(0.32 0.06 145)", hue: 145 },
  US:     { color: "oklch(0.55 0.10 255)", chartColor: "#60a5fa", gradFrom: "oklch(0.32 0.06 255)", hue: 255 },
  CRYPTO: { color: "oklch(0.58 0.14 52)",  chartColor: "#fb923c", gradFrom: "oklch(0.32 0.07 52)",  hue: 52  },
};

const typeBg: Record<AssetType, string> = {
  BIST:   "bg-green-500/15 text-green-300",
  US:     "bg-blue-500/15 text-blue-300",
  CRYPTO: "bg-orange-500/15 text-orange-300",
};

function toYahooSymbol(symbol: string, type: AssetType): string {
  if (type === "BIST") return `${symbol}.IS`;
  if (type === "CRYPTO") {
    const s = symbol.toUpperCase();
    if (s.endsWith("USDT")) return `${s.slice(0, -4)}-USD`;
    if (s.endsWith("USD"))  return `${s.slice(0, -3)}-USD`;
    return `${s}-USD`;
  }
  return symbol;
}

async function fetchPrevClose(yahooSymbol: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const closes: number[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const valid = closes.filter((c) => c != null && !isNaN(c));
    return valid.length >= 2 ? valid[valid.length - 2] : null;
  } catch { return null; }
}

function fmt(val: number | null, currency: string): string {
  if (val == null) return "—";
  if (currency === "TRY")
    return `₺${val.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(val: number): string {
  return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-md border border-white/10 bg-[oklch(0.20_0_0)] px-3 py-1.5 text-xs text-white/80 shadow-lg">
      <div className="text-white/50 mb-0.5">{d?.date}</div>
      <div className="font-semibold text-white">{payload[0]?.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
    </div>
  );
}

export default function WatchlistPage() {
  const { hidden } = usePrivacy();
  const H = (val: string) => (hidden ? HIDDEN : val);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const [charts, setCharts] = useState<Record<string, ChartPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch("/api/assets");
    const data = await res.json();
    const list: Asset[] = Array.isArray(data) ? data : [];
    setAssets(list);
    if (!list.length) return;

    const [priceRes, chartRes] = await Promise.all([
      fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: list.map((a) => ({ symbol: a.symbol, type: a.type })) }),
      }),
      fetch("/api/chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: list.map((a) => ({ symbol: a.symbol, type: a.type })) }),
      }),
    ]);

    const priceData = await priceRes.json();
    const chartData: Record<string, ChartPoint[]> = await chartRes.json();
    setCharts(chartData);

    const prevCloses = await Promise.all(
      list.map(async (a) => ({
        symbol: a.symbol,
        prev: await fetchPrevClose(toYahooSymbol(a.symbol, a.type)),
      }))
    );
    const prevMap: Record<string, number | null> = {};
    for (const { symbol, prev } of prevCloses) prevMap[symbol] = prev;

    const pm: Record<string, PriceInfo> = {};
    for (const p of priceData.prices ?? []) {
      pm[p.symbol] = { price: p.price, prevClose: prevMap[p.symbol] ?? null, currency: p.currency };
    }
    setPrices(pm);

    // Auto-select first item
    setSelected((prev) => prev ?? list[0] ?? null);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const selCfg = selected ? typeConfig[selected.type] : null;
  const selPrice = selected ? prices[selected.symbol] : null;
  const selChart = selected ? (charts[selected.symbol] ?? []) : [];
  const selPct = selPrice?.price != null && selPrice?.prevClose != null && selPrice.prevClose !== 0
    ? ((selPrice.price - selPrice.prevClose) / selPrice.prevClose) * 100
    : null;
  const selIsUp = selPct != null && selPct >= 0;
  const chartMin = selChart.length ? Math.min(...selChart.map((p) => p.close)) * 0.985 : 0;

  // Year range label
  const yearLabel = selChart.length >= 2
    ? `${selChart[0].date} — ${selChart[selChart.length - 1].date}`
    : "";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Takip Listesi</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw size={14} className={cn("mr-1.5", refreshing && "animate-spin")} />
            Yenile
          </Button>
          <Link href="/portfolio/add">
            <Button size="sm">
              <PlusCircle size={14} className="mr-1.5" />
              Hisse Ekle
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4">
          <div className="w-72 shrink-0 space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
          <Skeleton className="flex-1 h-96 rounded-xl" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="opacity-30">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p>Portföyünüzde henüz hisse yok.</p>
          <Link href="/portfolio/add">
            <Button size="sm"><PlusCircle size={14} className="mr-1.5" />İlk hisseyi ekle</Button>
          </Link>
        </div>
      ) : (
        <div className="flex gap-4 items-start">
          {/* LEFT: asset list */}
          <div className="w-72 shrink-0 rounded-xl border border-white/8 overflow-hidden bg-[oklch(0.28_0_0)]">
            {assets.map((asset) => {
              const pInfo = prices[asset.symbol];
              const pct = pInfo?.price != null && pInfo?.prevClose != null && pInfo.prevClose !== 0
                ? ((pInfo.price - pInfo.prevClose) / pInfo.prevClose) * 100 : null;
              const isUp = pct != null && pct >= 0;
              const isActive = selected?.id === asset.id;

              return (
                <button
                  key={asset.id}
                  onClick={() => setSelected(asset)}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-left transition-colors border-b border-white/5 last:border-0",
                    isActive
                      ? "bg-white/8"
                      : "hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Active indicator */}
                    <div
                      className="w-1 h-8 rounded-full shrink-0 transition-opacity"
                      style={{
                        background: typeConfig[asset.type].chartColor,
                        opacity: isActive ? 1 : 0,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{asset.symbol}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", typeBg[asset.type])}>
                          {asset.type}
                        </span>
                      </div>
                      <div className="text-xs text-white/45 truncate max-w-[150px] mt-0.5">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="text-sm font-semibold text-white tabular-nums">
                      {pInfo?.price != null ? H(fmt(pInfo.price, pInfo.currency)) : <span className="text-white/30">—</span>}
                    </div>
                    {pct != null && (
                      <div className={cn("text-xs tabular-nums", isUp ? "text-green-400" : "text-red-400")}>
                        {H(fmtPct(pct))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* RIGHT: chart panel */}
          {selected && selCfg && (
            <div
              className="flex-1 rounded-xl border border-white/8 overflow-hidden p-6"
              style={{ background: `linear-gradient(160deg, ${selCfg.gradFrom} 0%, oklch(0.26 0.02 ${selCfg.hue}) 100%)` }}
            >
              {/* Chart header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-2xl font-bold text-white">{selected.symbol}</h2>
                    <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", typeBg[selected.type])}>
                      {selected.type}
                    </span>
                  </div>
                  <div className="text-sm text-white/50">{selected.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white tabular-nums">
                    {selPrice?.price != null ? H(fmt(selPrice.price, selPrice.currency)) : "—"}
                  </div>
                  {selPct != null && (
                    <div className={cn(
                      "flex items-center justify-end gap-1 text-sm font-semibold mt-1",
                      selIsUp ? "text-green-300" : "text-red-300"
                    )}>
                      {selIsUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {H(fmtPct(selPct))} bugün
                    </div>
                  )}
                </div>
              </div>

              {/* Chart */}
              {selChart.length > 1 ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="selGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={selCfg.chartColor} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={selCfg.chartColor} stopOpacity={0.03} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }}
                          tickLine={false}
                          axisLine={false}
                          interval={Math.floor(selChart.length / 6)}
                          tickFormatter={(v: string) => v.slice(0, 7)}
                        />
                        <YAxis
                          domain={[chartMin, "auto"]}
                          tick={{ fontSize: 10, fill: "rgba(255,255,255,0.35)" }}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(1)}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="close"
                          stroke={selCfg.chartColor}
                          strokeWidth={2}
                          fill="url(#selGrad)"
                          dot={false}
                          activeDot={{ r: 4, fill: selCfg.chartColor, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-center text-xs text-white/30 mt-2">{yearLabel}</div>
                </>
              ) : (
                <div className="h-64 flex items-center justify-center text-white/30 text-sm">
                  Grafik verisi yükleniyor…
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
