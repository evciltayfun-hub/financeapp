"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
  ComposedChart, Bar, ResponsiveContainer, Tooltip,
  YAxis, XAxis, CartesianGrid, Brush,
} from "recharts";
import {
  RefreshCw, TrendingUp, TrendingDown, PlusCircle,
  Search, ZoomIn, ZoomOut, ExternalLink, Newspaper,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrivacy } from "@/lib/privacy-context";
import { cn } from "@/lib/utils";

const HIDDEN = "••••••";

type AssetType = "BIST" | "US" | "CRYPTO";
type Period = "1G" | "1A" | "3A" | "6A" | "1Y" | "3Y";

const PERIODS: { label: string; value: Period; desc: string }[] = [
  { label: "1G", value: "1G", desc: "bugün" },
  { label: "1A", value: "1A", desc: "1 ay" },
  { label: "3A", value: "3A", desc: "3 ay" },
  { label: "6A", value: "6A", desc: "6 ay" },
  { label: "1Y", value: "1Y", desc: "1 yıl" },
  { label: "3Y", value: "3Y", desc: "3 yıl" },
];

interface Asset      { id: string; symbol: string; name: string; type: AssetType }
interface ChartPoint { date: string; open: number; high: number; low: number; close: number }
interface PriceInfo  { price: number | null; prevClose: number | null; currency: string }
interface MarketItem { label: string; symbol: string; unit: string; price: number | null; pct: number | null }
interface NewsItem   { title: string; publisher: string; link: string; time: number; thumbnail: string | null }

const typeConfig: Record<AssetType, { chartColor: string; upColor: string; gradFrom: string; hue: number }> = {
  BIST:   { chartColor: "#4ade80", upColor: "#4ade80", gradFrom: "color-mix(in oklab, oklch(0.65 0.15 145) 14%, var(--card))", hue: 145 },
  US:     { chartColor: "#60a5fa", upColor: "#60a5fa", gradFrom: "color-mix(in oklab, oklch(0.62 0.15 255) 14%, var(--card))", hue: 255 },
  CRYPTO: { chartColor: "#fb923c", upColor: "#fb923c", gradFrom: "color-mix(in oklab, oklch(0.70 0.16 52) 15%, var(--card))", hue: 52 },
};

const typeBg: Record<AssetType, string> = {
  BIST:   "bg-green-500/15 text-green-300",
  US:     "bg-blue-500/15 text-blue-300",
  CRYPTO: "bg-orange-500/15 text-orange-300",
};

async function fetchPrevClose(symbol: string, type: AssetType): Promise<number | null> {
  try {
    const res = await fetch(`/api/chart?symbol=${encodeURIComponent(symbol)}&type=${type}&period=5G`);
    if (!res.ok) return null;
    const points: ChartPoint[] = await res.json();
    return points.length >= 2 ? points[points.length - 2].close : null;
  } catch { return null; }
}

function fmt(val: number | null, currency: string): string {
  if (val == null) return "—";
  if (currency === "TRY")
    return `₺${val.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtPct(val: number): string { return `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`; }
function fmtVal(val: number): string {
  if (val >= 10000) return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (val >= 1000)  return val.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (val >= 100)   return val.toFixed(2);
  return val.toFixed(3);
}
function fmtMarketPrice(val: number): string {
  if (val >= 10000) return val.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (val >= 1000)  return val.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return val.toFixed(2);
}
function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 3600)  return `${Math.round(diff / 60)}dk önce`;
  if (diff < 86400) return `${Math.round(diff / 3600)}sa önce`;
  return `${Math.round(diff / 86400)}g önce`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CandleTooltip({ active, payload, period }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as ChartPoint;
  if (!d) return null;
  const isUp = d.close >= d.open;
  const dateLabel = period === "1G" ? d.date.slice(11, 16) : d.date.slice(0, 10);
  return (
    <div className="rounded-lg border border-white/10 bg-card px-3.5 py-2.5 text-xs shadow-xl">
      <div className="text-white/40 mb-2 font-medium">{dateLabel}</div>
      <div className="space-y-1 min-w-[120px]">
        <div className="flex justify-between gap-6">
          <span className="text-white/40">Açılış</span>
          <span className="text-white tabular-nums">{fmtVal(d.open)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-green-400/70">Yüksek</span>
          <span className="text-green-400 tabular-nums">{fmtVal(d.high)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-red-400/70">Düşük</span>
          <span className="text-red-400 tabular-nums">{fmtVal(d.low)}</span>
        </div>
        <div className="flex justify-between gap-6 pt-1 border-t border-border">
          <span className="text-white/40">Kapanış</span>
          <span className={cn("tabular-nums font-semibold", isUp ? "text-green-400" : "text-red-400")}>
            {fmtVal(d.close)}
          </span>
        </div>
      </div>
    </div>
  );
}

function makeCandleShape(domainMin: number, upColor: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function CandleShape(props: any) {
    const { x, y, width, height, payload } = props;
    if (!payload || height <= 0 || !isFinite(height)) return null;
    const ppu   = height / (payload.close - domainMin);
    const cx    = x + width / 2;
    const bw    = Math.max(width * 0.6, 2);
    const isUp  = payload.close >= payload.open;
    const color = isUp ? upColor : "#f87171";
    const highPx  = y - (payload.high  - payload.close) * ppu;
    const lowPx   = y + (payload.close - payload.low)   * ppu;
    const openPx  = y + (payload.close - payload.open)  * ppu;
    const closePx = y;
    const bodyTop = Math.min(openPx, closePx);
    const bodyBot = Math.max(openPx, closePx);
    const bodyH   = Math.max(bodyBot - bodyTop, 1);
    return (
      <g>
        <line x1={cx} y1={highPx}  x2={cx} y2={bodyTop} stroke={color} strokeWidth={1} opacity={0.75} />
        <rect x={cx - bw / 2} y={bodyTop} width={bw} height={bodyH} fill={color} fillOpacity={isUp ? 0.85 : 0.75} rx={0.5} />
        <line x1={cx} y1={bodyBot} x2={cx} y2={lowPx}   stroke={color} strokeWidth={1} opacity={0.75} />
      </g>
    );
  };
}

function MarketBar({ items, onSelect, selected }: { items: MarketItem[]; onSelect: (item: MarketItem) => void; selected: MarketItem | null }) {
  return (
    <div className="grid grid-cols-8 gap-2 mt-5">
      {items.map((item) => {
        const isActive = selected?.symbol === item.symbol;
        return (
          <button
            key={item.symbol}
            onClick={() => onSelect(item)}
            className={cn(
              "rounded-xl border px-3 py-2.5 flex flex-col gap-0.5 text-left transition-all",
              isActive
                ? "border-white/20 bg-white/8 ring-1 ring-white/10"
                : "border-border bg-card hover:bg-white/5 hover:border-white/12"
            )}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] text-white/35 uppercase tracking-wider font-medium">{item.label}</span>
              <span className="text-[9px] text-white/20 font-medium">{item.unit}</span>
            </div>
            <div className="text-sm font-bold text-white tabular-nums">
              {item.price != null ? fmtMarketPrice(item.price) : <span className="text-white/25">—</span>}
            </div>
            {item.pct != null && (
              <div className={cn("text-[11px] font-semibold tabular-nums", item.pct >= 0 ? "text-green-400" : "text-red-400")}>
                {item.pct >= 0 ? "+" : ""}{item.pct.toFixed(2)}%
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function NewsSection({ news, loading }: { news: NewsItem[]; loading: boolean }) {
  return (
    <div className="mt-5 pt-4 border-t border-border">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper size={13} className="text-white/30" />
        <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Piyasa Haberleri</span>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
        </div>
      ) : news.length === 0 ? (
        <p className="text-xs text-white/25 py-4 text-center">Haber bulunamadı</p>
      ) : (
        <div className="space-y-1">
          {news.map((item, i) => (
            <a
              key={i}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group"
            >
              {item.thumbnail && (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <img src={item.thumbnail} alt="" className="w-12 h-9 object-cover rounded shrink-0 opacity-70" onError={(e: any) => { e.target.style.display = "none"; }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/75 group-hover:text-white transition-colors line-clamp-2 leading-relaxed">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-white/30">{item.publisher}</span>
                  <span className="text-white/15">·</span>
                  <span className="text-[10px] text-white/25">{timeAgo(item.time)}</span>
                </div>
              </div>
              <ExternalLink size={10} className="text-white/20 group-hover:text-white/40 shrink-0 mt-0.5 transition-colors" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WatchlistPage() {
  const { hidden } = usePrivacy();
  const H = (val: string) => (hidden ? HIDDEN : val);

  const [assets, setAssets]             = useState<Asset[]>([]);
  const [prices, setPrices]             = useState<Record<string, PriceInfo>>({});
  const [chartCache, setChartCache]     = useState<Record<string, Record<string, ChartPoint[]>>>({});
  const cacheRef = useRef<Record<string, Record<string, ChartPoint[]>>>({});
  const [loading, setLoading]           = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [refreshing, setRefreshing]     = useState(false);
  const [selected, setSelected]         = useState<Asset | null>(null);
  const [period, setPeriod]             = useState<Period>("1Y");
  const [search, setSearch]             = useState("");

  // Market overview
  const [market, setMarket]             = useState<MarketItem[]>([]);
  const [marketLoading, setMarketLoading] = useState(true);

  // News
  const [news, setNews]                 = useState<NewsItem[]>([]);
  const [newsLoading, setNewsLoading]   = useState(false);

  // Zoom state
  const [zoomStart, setZoomStart]       = useState(0);
  const [zoomEnd, setZoomEnd]           = useState(0);

  // Market chart state
  const [selectedMarket, setSelectedMarket]         = useState<MarketItem | null>(null);
  const [marketChart, setMarketChart]               = useState<ChartPoint[]>([]);
  const [marketChartLoading, setMarketChartLoading] = useState(false);
  const [marketPeriod, setMarketPeriod]             = useState<Period>("1Y");
  const [marketZoomStart, setMarketZoomStart]       = useState(0);
  const [marketZoomEnd, setMarketZoomEnd]           = useState(0);
  const marketCacheRef = useRef<Record<string, Record<string, ChartPoint[]>>>({});

  const loadPrices = useCallback(async (list: Asset[]) => {
    if (!list.length) return;
    const priceRes = await fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assets: list.map((a) => ({ symbol: a.symbol, type: a.type })) }),
    });
    const priceData = await priceRes.json();
    const prevCloses = await Promise.all(
      list.map(async (a) => ({ symbol: a.symbol, prev: await fetchPrevClose(a.symbol, a.type) }))
    );
    const prevMap: Record<string, number | null> = {};
    for (const { symbol, prev } of prevCloses) prevMap[symbol] = prev;
    const pm: Record<string, PriceInfo> = {};
    for (const p of priceData.prices ?? []) {
      pm[p.symbol] = { price: p.price, prevClose: prevMap[p.symbol] ?? null, currency: p.currency };
    }
    setPrices(pm);
  }, []);

  const fetchChart = useCallback(async (asset: Asset, p: Period) => {
    if (cacheRef.current[asset.symbol]?.[p]) return;
    setChartLoading(true);
    try {
      const res = await fetch(`/api/chart?symbol=${encodeURIComponent(asset.symbol)}&type=${asset.type}&period=${p}`);
      const points: ChartPoint[] = await res.json();
      cacheRef.current = {
        ...cacheRef.current,
        [asset.symbol]: { ...(cacheRef.current[asset.symbol] ?? {}), [p]: points },
      };
      setChartCache({ ...cacheRef.current });
    } finally {
      setChartLoading(false);
    }
  }, []);

  const fetchNews = useCallback(async (symbol: string, type: AssetType) => {
    setNewsLoading(true);
    try {
      const q = type === "BIST" ? `${symbol} borsa` : symbol;
      const res = await fetch(`/api/news?symbol=${encodeURIComponent(q)}`);
      const data: NewsItem[] = await res.json();
      setNews(data);
    } catch { setNews([]); }
    finally { setNewsLoading(false); }
  }, []);

  const fetchMarketChart = useCallback(async (item: MarketItem, p: Period) => {
    if (marketCacheRef.current[item.symbol]?.[p]) {
      setMarketChart(marketCacheRef.current[item.symbol][p]);
      return;
    }
    setMarketChartLoading(true);
    try {
      const res = await fetch(`/api/chart?symbol=${encodeURIComponent(item.symbol)}&type=MARKET&period=${p}`);
      const points: ChartPoint[] = await res.json();
      marketCacheRef.current = {
        ...marketCacheRef.current,
        [item.symbol]: { ...(marketCacheRef.current[item.symbol] ?? {}), [p]: points },
      };
      setMarketChart(points);
    } finally {
      setMarketChartLoading(false);
    }
  }, []);

  function handleMarketClick(item: MarketItem) {
    if (selectedMarket?.symbol === item.symbol) {
      setSelectedMarket(null);
      setMarketChart([]);
    } else {
      setSelectedMarket(item);
      fetchMarketChart(item, marketPeriod);
    }
  }

  const loadData = useCallback(async () => {
    const res = await fetch("/api/assets");
    const data = await res.json();
    const list: Asset[] = Array.isArray(data) ? data : [];
    setAssets(list);
    if (!list.length) return;
    await loadPrices(list);
    setSelected((prev) => prev ?? list[0] ?? null);
  }, [loadPrices]);

  // Load market overview
  useEffect(() => {
    fetch("/api/market")
      .then((r) => r.json())
      .then((d) => setMarket(d))
      .catch(() => {})
      .finally(() => setMarketLoading(false));
  }, []);

  useEffect(() => { loadData().finally(() => setLoading(false)); }, [loadData]);
  useEffect(() => { if (selected) { fetchChart(selected, period); fetchNews(selected.symbol, selected.type); } }, [selected, period, fetchChart, fetchNews]);
  useEffect(() => { if (selectedMarket) fetchMarketChart(selectedMarket, marketPeriod); }, [marketPeriod, selectedMarket, fetchMarketChart]);
  useEffect(() => { if (marketChart.length > 0) { setMarketZoomStart(0); setMarketZoomEnd(marketChart.length - 1); } }, [marketChart.length]);

  // Reset zoom when chart data changes
  const selChart = selected ? (chartCache[selected.symbol]?.[period] ?? []) : [];
  useEffect(() => {
    if (selChart.length > 0) {
      setZoomStart(0);
      setZoomEnd(selChart.length - 1);
    }
  }, [selChart.length]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const res = await fetch("/api/assets");
    const data = await res.json();
    const list: Asset[] = Array.isArray(data) ? data : [];
    setAssets(list);
    await loadPrices(list);
    setRefreshing(false);
  };

  function zoomIn() {
    const span = zoomEnd - zoomStart;
    if (span <= 5) return;
    const center  = Math.round((zoomStart + zoomEnd) / 2);
    const newSpan = Math.max(5, Math.round(span / 1.6));
    setZoomStart(Math.max(0, center - Math.round(newSpan / 2)));
    setZoomEnd(Math.min(selChart.length - 1, center + Math.round(newSpan / 2)));
  }

  function zoomOut() {
    const span = zoomEnd - zoomStart;
    const center  = Math.round((zoomStart + zoomEnd) / 2);
    const newSpan = Math.min(selChart.length - 1, Math.round(span * 1.6));
    setZoomStart(Math.max(0, center - Math.round(newSpan / 2)));
    setZoomEnd(Math.min(selChart.length - 1, center + Math.round(newSpan / 2)));
  }

  const selCfg   = selected ? typeConfig[selected.type] : null;
  const selPrice = selected ? prices[selected.symbol] : null;

  const chartMin = selChart.length ? Math.min(...selChart.map((p) => p.low))  * 0.993 : 0;
  const chartMax = selChart.length ? Math.max(...selChart.map((p) => p.high)) * 1.007 : undefined;

  // Stats based on visible (zoomed) window
  const visibleChart = selChart.slice(zoomStart, zoomEnd + 1);
  const chartHigh = visibleChart.length ? Math.max(...visibleChart.map((p) => p.high)) : 0;
  const chartLow  = visibleChart.length ? Math.min(...visibleChart.map((p) => p.low))  : 0;

  const periodPct = selChart.length >= 2
    ? ((selChart[selChart.length - 1].close - selChart[0].open) / selChart[0].open) * 100 : null;
  const dailyPct = selPrice?.price != null && selPrice?.prevClose != null && selPrice.prevClose !== 0
    ? ((selPrice.price - selPrice.prevClose) / selPrice.prevClose) * 100 : null;
  const displayPct = period === "1G" ? dailyPct : periodPct;
  const selIsUp    = displayPct != null && displayPct >= 0;

  const candleShape = useMemo(
    () => selCfg ? makeCandleShape(chartMin, selCfg.upColor) : null,
    [chartMin, selCfg]
  );

  const xTickFormatter = (v: string) => {
    if (period === "1G") return v.slice(11, 16);
    if (period === "1A" || period === "3A") return v.slice(5, 10);
    return v.slice(0, 7);
  };

  const rangeLabel = visibleChart.length >= 2
    ? `${visibleChart[0].date.slice(0, 10)} — ${visibleChart[visibleChart.length - 1].date.slice(0, 10)}`
    : "";

  const filteredAssets = assets.filter((a) =>
    !search ||
    a.symbol.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Takip Listesi</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Güncel fiyatlar ve mum grafikleri</p>
        </div>
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

      {/* Market Overview Bar — top */}
      {marketLoading ? (
        <div className="grid grid-cols-8 gap-2 mb-5">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <MarketBar items={market} onSelect={handleMarketClick} selected={selectedMarket} />
      )}

      {!selectedMarket && <div className="mb-5" />}

      {/* Market Chart Panel — right below market bar */}
      {selectedMarket && (
        <div className="mt-4 mb-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white">{selectedMarket.label}</h3>
                <span className="text-xs text-white/30 font-medium">{selectedMarket.unit}</span>
              </div>
              <div className="text-2xl font-bold tabular-nums text-white">
                {selectedMarket.price != null ? fmtMarketPrice(selectedMarket.price) : "—"}
              </div>
              {selectedMarket.pct != null && (
                <div className={cn("text-sm font-semibold tabular-nums mt-0.5", selectedMarket.pct >= 0 ? "text-green-400" : "text-red-400")}>
                  {selectedMarket.pct >= 0 ? "+" : ""}{selectedMarket.pct.toFixed(2)}%
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
                {PERIODS.map((p) => (
                  <button key={p.value} onClick={() => setMarketPeriod(p.value)} className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", marketPeriod === p.value ? "bg-white/15 text-white" : "text-white/40 hover:text-white/70")}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { const s=marketZoomEnd-marketZoomStart; if(s<=5)return; const c=Math.round((marketZoomStart+marketZoomEnd)/2); const ns=Math.max(5,Math.round(s/1.6)); setMarketZoomStart(Math.max(0,c-Math.round(ns/2))); setMarketZoomEnd(Math.min(marketChart.length-1,c+Math.round(ns/2))); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"><ZoomIn size={13}/></button>
                <button onClick={() => { const s=marketZoomEnd-marketZoomStart; const c=Math.round((marketZoomStart+marketZoomEnd)/2); const ns=Math.min(marketChart.length-1,Math.round(s*1.6)); setMarketZoomStart(Math.max(0,c-Math.round(ns/2))); setMarketZoomEnd(Math.min(marketChart.length-1,c+Math.round(ns/2))); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"><ZoomOut size={13}/></button>
                <button onClick={() => { setMarketZoomStart(0); setMarketZoomEnd(marketChart.length-1); }} className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/35 hover:text-white/60 transition-colors text-[10px] font-medium">Tümü</button>
                <button onClick={() => { setSelectedMarket(null); setMarketChart([]); }} className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors text-[10px] font-medium">✕ Kapat</button>
              </div>
            </div>
          </div>
          {marketChartLoading ? (
            <div className="h-[240px] flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
            </div>
          ) : marketChart.length > 1 ? (() => {
            const mMin = Math.min(...marketChart.map(p => p.low)) * 0.993;
            const mMax = Math.max(...marketChart.map(p => p.high)) * 1.007;
            const mShape = makeCandleShape(mMin, "#94a3b8");
            const mVisible = marketChart.slice(marketZoomStart, marketZoomEnd + 1);
            const mHigh = mVisible.length ? Math.max(...mVisible.map(p => p.high)) : 0;
            const mLow  = mVisible.length ? Math.min(...mVisible.map(p => p.low))  : 0;
            return (
              <>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={marketChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={Math.floor(marketChart.length / 6)} tickFormatter={xTickFormatter} />
                      <YAxis domain={[mMin, mMax]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={72} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toFixed(2)} />
                      <Tooltip content={<CandleTooltip period={marketPeriod} />} cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }} />
                      <Bar dataKey="close" shape={mShape} maxBarSize={16} isAnimationActive={false} />
                      <Brush dataKey="date" height={22} stroke="var(--line-strong)" fill="transparent" travellerWidth={6} tickFormatter={xTickFormatter} startIndex={marketZoomStart} endIndex={marketZoomEnd} onChange={(range) => { if (range.startIndex !== undefined && range.endIndex !== undefined) { setMarketZoomStart(range.startIndex); setMarketZoomEnd(range.endIndex); } }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                  <div><div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Dönem Yüksek</div><div className="text-sm font-semibold text-green-400 tabular-nums">{fmtMarketPrice(mHigh)}</div></div>
                  <div><div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Dönem Düşük</div><div className="text-sm font-semibold text-red-400 tabular-nums">{fmtMarketPrice(mLow)}</div></div>
                  <div><div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Tarih Aralığı</div><div className="text-xs text-white/45 tabular-nums">{mVisible.length >= 2 ? `${mVisible[0].date.slice(0,10)} — ${mVisible[mVisible.length-1].date.slice(0,10)}` : ""}</div></div>
                </div>
              </>
            );
          })() : (
            <div className="h-[240px] flex items-center justify-center text-white/25 text-sm">Grafik verisi yükleniyor…</div>
          )}
        </div>
      )}

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
          {/* LEFT — Asset list */}
          <div className="w-72 shrink-0 rounded-xl border border-border overflow-hidden bg-card">
            <div className="px-3 py-2.5 border-b border-border">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/6">
                <Search size={11} className="text-white/30 shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ara..."
                  className="bg-transparent text-xs text-white/70 placeholder:text-white/25 outline-none w-full"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
              {filteredAssets.map((asset) => {
                const pInfo    = prices[asset.symbol];
                const pct      = pInfo?.price != null && pInfo?.prevClose != null && pInfo.prevClose !== 0
                  ? ((pInfo.price - pInfo.prevClose) / pInfo.prevClose) * 100 : null;
                const isUp     = pct != null && pct >= 0;
                const isActive = selected?.id === asset.id;
                const cfg      = typeConfig[asset.type];
                return (
                  <button
                    key={asset.id}
                    onClick={() => setSelected(asset)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3.5 text-left transition-all border-b border-white/5 last:border-0",
                      isActive ? "bg-white/8" : "hover:bg-white/4"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="shrink-0 rounded-full transition-all duration-200"
                        style={{ width: isActive ? 2 : 0, height: 28, background: cfg.chartColor, opacity: isActive ? 1 : 0 }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-white">{asset.symbol}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", typeBg[asset.type])}>
                            {asset.type}
                          </span>
                        </div>
                        <div className="text-xs text-white/40 truncate max-w-[140px] mt-0.5">{asset.name}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-sm font-semibold text-white tabular-nums">
                        {pInfo?.price != null ? H(fmt(pInfo.price, pInfo.currency)) : <span className="text-white/25">—</span>}
                      </div>
                      {pct != null && (
                        <div className={cn("text-xs tabular-nums font-medium", isUp ? "text-green-400" : "text-red-400")}>
                          {H(fmtPct(pct))}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT — Chart + News */}
          {selected && selCfg && (
            <div className="flex-1 min-w-0">
              <div
                className="rounded-xl border border-border overflow-hidden"
                style={{ background: `linear-gradient(150deg, ${selCfg.gradFrom} 0%, color-mix(in oklab, oklch(0.65 0.1 ${selCfg.hue}) 5%, var(--card)) 55%, var(--card) 100%)` }}
              >
                <div className="p-6">
                  {/* Symbol header */}
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-2xl font-bold text-white">{selected.symbol}</h2>
                        <span className={cn("text-[10px] px-2 py-0.5 rounded font-medium", typeBg[selected.type])}>
                          {selected.type}
                        </span>
                      </div>
                      <div className="text-sm text-white/50">{selected.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white tabular-nums tracking-tight">
                        {selPrice?.price != null ? H(fmt(selPrice.price, selPrice.currency)) : "—"}
                      </div>
                      {displayPct != null && (
                        <div className={cn(
                          "flex items-center justify-end gap-1 text-sm font-semibold mt-1",
                          selIsUp ? "text-green-300" : "text-red-300"
                        )}>
                          {selIsUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          <span>{H(fmtPct(displayPct))}</span>
                          <span className="text-white/35 font-normal text-xs ml-0.5">
                            {PERIODS.find((p) => p.value === period)?.desc}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Period selector + Zoom buttons */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 w-fit">
                      {PERIODS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setPeriod(p.value)}
                          className={cn(
                            "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all duration-150",
                            period === p.value ? "shadow-sm" : "text-white/40 hover:text-white/70"
                          )}
                          style={period === p.value
                            ? { background: selCfg.chartColor + "28", color: selCfg.chartColor }
                            : {}
                          }
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={zoomIn}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                        title="Zoom In"
                      >
                        <ZoomIn size={13} />
                      </button>
                      <button
                        onClick={zoomOut}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                        title="Zoom Out"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <button
                        onClick={() => { setZoomStart(0); setZoomEnd(selChart.length - 1); }}
                        className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/35 hover:text-white/60 transition-colors text-[10px] font-medium"
                        title="Sıfırla"
                      >
                        Tümü
                      </button>
                    </div>
                  </div>

                  {/* Chart */}
                  {chartLoading ? (
                    <div className="h-[300px] flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
                    </div>
                  ) : selChart.length > 1 && candleShape ? (
                    <>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={selChart} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                              tickLine={false}
                              axisLine={false}
                              interval={Math.floor(selChart.length / 6)}
                              tickFormatter={xTickFormatter}
                            />
                            <YAxis
                              domain={[chartMin, chartMax ?? "auto"]}
                              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                              tickLine={false}
                              axisLine={false}
                              width={64}
                              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(1)}
                            />
                            <Tooltip
                              content={<CandleTooltip period={period} />}
                              cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
                            />
                            <Bar dataKey="close" shape={candleShape} maxBarSize={16} isAnimationActive={false} />
                            <Brush
                              dataKey="date"
                              height={22}
                              stroke="var(--line-strong)"
                              fill="transparent"
                              travellerWidth={6}
                              tickFormatter={xTickFormatter}
                              startIndex={zoomStart}
                              endIndex={zoomEnd}
                              onChange={(range) => {
                                if (range.startIndex !== undefined && range.endIndex !== undefined) {
                                  setZoomStart(range.startIndex);
                                  setZoomEnd(range.endIndex);
                                }
                              }}
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                        <div>
                          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Dönem Yüksek</div>
                          <div className="text-sm font-semibold text-green-400 tabular-nums">
                            {H(fmt(chartHigh, selPrice?.currency ?? "USD"))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Dönem Düşük</div>
                          <div className="text-sm font-semibold text-red-400 tabular-nums">
                            {H(fmt(chartLow, selPrice?.currency ?? "USD"))}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Tarih Aralığı</div>
                          <div className="text-xs text-white/45 tabular-nums">{rangeLabel}</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-white/25 text-sm">
                      Grafik verisi yükleniyor…
                    </div>
                  )}

                  {/* News */}
                  <NewsSection news={news} loading={newsLoading} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
