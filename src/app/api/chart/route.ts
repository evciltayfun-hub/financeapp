import { NextRequest, NextResponse } from "next/server";

interface ChartPoint { date: string; close: number }

async function fetchYahooChart(yahooSymbol: string): Promise<ChartPoint[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1wk&range=1y`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 3600 }, // 1 hour cache
    });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp ?? [];
    const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
    return timestamps
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString().slice(0, 10),
        close: closes[i],
      }))
      .filter((p) => p.close != null && !isNaN(p.close));
  } catch {
    return [];
  }
}

function toYahooSymbol(symbol: string, type: string): string {
  if (type === "BIST") return `${symbol}.IS`;
  if (type === "CRYPTO") {
    const s = symbol.toUpperCase();
    if (s.endsWith("USDT")) return `${s.slice(0, -4)}-USD`;
    if (s.endsWith("USD")) return `${s.slice(0, -3)}-USD`;
    return `${s}-USD`;
  }
  return symbol; // US stocks as-is
}

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json(); // [{ symbol, type }]
    const results = await Promise.all(
      items.map(async ({ symbol, type }: { symbol: string; type: string }) => {
        const yahooSym = toYahooSymbol(symbol, type);
        const points = await fetchYahooChart(yahooSym);
        return { symbol, points };
      })
    );
    const chartData: Record<string, ChartPoint[]> = {};
    for (const { symbol, points } of results) {
      chartData[symbol] = points;
    }
    return NextResponse.json(chartData);
  } catch {
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
