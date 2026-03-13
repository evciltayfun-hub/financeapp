"use client";

import { useCallback, useEffect, useState } from "react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { PlusCircle, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

const typeConfig: Record<AssetType, { bg: string; chartColor: string; hue: number }> = {
  BIST:   { bg: "oklch(0.32 0.06 145)", chartColor: "#4ade80", hue: 145 },
  US:     { bg: "oklch(0.32 0.06 255)", chartColor: "#60a5fa", hue: 255 },
  CRYPTO: { bg: "oklch(0.32 0.07 52)",  chartColor: "#fb923c", hue: 52  },
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
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=5d`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
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
  return (
    <div className="rounded-md border border-white/10 bg-[oklch(0.22_0_0)] px-2 py-1 text-xs text-white/80">
      {payload[0]?.payload?.date}: {payload[0]?.value?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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

  const loadData = useCallback(async () => {
    // 1. Fetch portfolio assets
    const res = await fetch("/api/assets");
    const data = await res.json();
    const list: Asset[] = Array.isArray(data) ? data : [];
    setAssets(list);
    if (!list.length) return;

    // 2. Current prices + prev close in parallel
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

    // Fetch prev close for daily change %
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
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
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

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : assets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="opacity-30">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p>Portföyünüzde henüz hisse yok.</p>
          <Link href="/portfolio/add">
            <Button size="sm">
              <PlusCircle size={14} className="mr-1.5" /> İlk hisseyi ekle
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map((asset) => {
            const cfg = typeConfig[asset.type];
            const pInfo = prices[asset.symbol];
            const chartPoints = charts[asset.symbol] ?? [];
            const dailyPct =
              pInfo?.price != null && pInfo?.prevClose != null && pInfo.prevClose !== 0
                ? ((pInfo.price - pInfo.prevClose) / pInfo.prevClose) * 100
                : null;
            const isUp = dailyPct != null && dailyPct >= 0;
            const minClose = chartPoints.length ? Math.min(...chartPoints.map((p) => p.close)) * 0.98 : 0;

            return (
              <Card
                key={asset.id}
                className="relative overflow-hidden border-0 rounded-xl"
                style={{
                  background: `linear-gradient(160deg, ${cfg.bg} 0%, oklch(0.26 0.03 ${cfg.hue}) 100%)`,
                }}
              >
                <CardContent className="p-4">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-[10px] text-white/45 font-medium tracking-wider mb-0.5">{asset.type}</div>
                      <div className="font-bold text-white text-lg leading-tight">{asset.symbol}</div>
                      <div className="text-xs text-white/55 mt-0.5 truncate max-w-[130px]">{asset.name}</div>
                    </div>
                    {dailyPct != null ? (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg mt-0.5",
                        isUp ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                      )}>
                        {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {H(fmtPct(dailyPct))}
                      </div>
                    ) : null}
                  </div>

                  {/* Price */}
                  <div className="text-2xl font-bold text-white mb-3 tabular-nums">
                    {pInfo?.price != null
                      ? H(fmt(pInfo.price, pInfo.currency))
                      : <span className="text-white/30 text-sm font-normal">Fiyat yükleniyor…</span>}
                  </div>

                  {/* 1-year chart */}
                  <div className="h-[72px] -mx-1">
                    {chartPoints.length > 1 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartPoints} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                          <defs>
                            <linearGradient id={`g-${asset.symbol}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={cfg.chartColor} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={cfg.chartColor} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <YAxis domain={[minClose, "auto"]} hide />
                          <Tooltip content={<ChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="close"
                            stroke={cfg.chartColor}
                            strokeWidth={1.5}
                            fill={`url(#g-${asset.symbol})`}
                            dot={false}
                            activeDot={{ r: 3, fill: cfg.chartColor }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-white/20 text-xs">
                        Grafik yükleniyor…
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
