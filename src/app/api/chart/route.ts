import { NextRequest, NextResponse } from "next/server";

export interface ChartPoint { date: string; open: number; high: number; low: number; close: number }

function getPeriodParams(period: string): { interval: string; range: string } {
  switch (period) {
    case "1G": return { interval: "60m", range: "1d"  };
    case "1A": return { interval: "1d",  range: "1mo" };
    case "3A": return { interval: "1d",  range: "3mo" };
    case "6A": return { interval: "1wk", range: "6mo" };
    case "3Y": return { interval: "1wk", range: "3y"  };
    default:   return { interval: "1wk", range: "1y"  };
  }
}

async function fetchYahooChart(yahooSymbol: string, interval: string, range: string): Promise<ChartPoint[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const timestamps: number[] = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};
    const opens:  number[] = q.open  ?? [];
    const highs:  number[] = q.high  ?? [];
    const lows:   number[] = q.low   ?? [];
    const closes: number[] = q.close ?? [];
    return timestamps
      .map((ts, i) => ({
        date:  new Date(ts * 1000).toISOString().slice(0, 16),
        open:  opens[i],
        high:  highs[i],
        low:   lows[i],
        close: closes[i],
      }))
      .filter((p) => p.close != null && !isNaN(p.close) && p.open != null && !isNaN(p.open));
  } catch {
    return [];
  }
}

function toYahooSymbol(symbol: string, type: string): string {
  if (type === "BIST") return `${symbol}.IS`;
  if (type === "CRYPTO") {
    const s = symbol.toUpperCase();
    if (s.endsWith("USDT")) return `${s.slice(0, -4)}-USD`;
    if (s.endsWith("USD"))  return `${s.slice(0, -3)}-USD`;
    return `${s}-USD`;
  }
  return symbol;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") ?? "";
  const type   = searchParams.get("type")   ?? "";
  const period = searchParams.get("period") ?? "1Y";
  const { interval, range } = getPeriodParams(period);
  const points = await fetchYahooChart(toYahooSymbol(symbol, type), interval, range);
  return NextResponse.json(points);
}

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json();
    const { interval, range } = getPeriodParams("1Y");
    const results = await Promise.all(
      items.map(async ({ symbol, type }: { symbol: string; type: string }) => {
        const points = await fetchYahooChart(toYahooSymbol(symbol, type), interval, range);
        return { symbol, points };
      })
    );
    const chartData: Record<string, ChartPoint[]> = {};
    for (const { symbol, points } of results) chartData[symbol] = points;
    return NextResponse.json(chartData);
  } catch {
    return NextResponse.json({ error: "Failed to fetch chart data" }, { status: 500 });
  }
}
