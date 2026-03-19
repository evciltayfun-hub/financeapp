import { NextResponse } from "next/server";

const MARKET_SYMBOLS = [
  { symbol: "^IXIC",    label: "NASDAQ",   unit: "puan"  },
  { symbol: "^GSPC",    label: "S&P 500",  unit: "puan"  },
  { symbol: "GC=F",     label: "Altın",    unit: "$/oz"  },
  { symbol: "CL=F",     label: "Petrol",   unit: "$/bbl" },
  { symbol: "XU100.IS", label: "BIST 100", unit: "puan"  },
  { symbol: "USDTRY=X", label: "USD/TRY",  unit: "₺"     },
  { symbol: "EURTRY=X", label: "EUR/TRY",  unit: "₺"     },
  { symbol: "EURUSD=X", label: "EUR/USD",  unit: "$"     },
];

async function fetchMarketItem(symbol: string, label: string, unit: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Accept": "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return { label, symbol, unit, price: null, prevClose: null, pct: null };
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const meta   = result?.meta;
    const closes: number[] = result?.indicators?.quote?.[0]?.close ?? [];
    const valid  = closes.filter((c: number) => c != null && !isNaN(c));
    const price  = meta?.regularMarketPrice ?? (valid.length ? valid[valid.length - 1] : null);
    const prevClose = valid.length >= 2
      ? valid[valid.length - 2]
      : (meta?.previousClose ?? meta?.chartPreviousClose ?? null);
    const pct = price && prevClose && prevClose !== 0
      ? ((price - prevClose) / prevClose) * 100
      : null;
    return { label, symbol, unit, price, pct };
  } catch {
    return { label, symbol, unit, price: null, pct: null };
  }
}

export async function GET() {
  const results = await Promise.all(
    MARKET_SYMBOLS.map(({ symbol, label, unit }) => fetchMarketItem(symbol, label, unit))
  );
  return NextResponse.json(results);
}
