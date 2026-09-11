import { NextRequest, NextResponse } from "next/server";
import type { PriceData, SplitEvent } from "@/lib/types";

interface YahooQuote { price: number | null; splits: SplitEvent[] }
interface YahooSplit { date: number; splitRatio: string; numerator: number; denominator: number }

// A 2-year weekly window keeps the payload small while still carrying split events.
async function fetchYahooQuote(symbol: string): Promise<YahooQuote> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1wk&range=2y&events=splits`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return { price: null, splits: [] };
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    const rawSplits: YahooSplit[] = Object.values(result?.events?.splits ?? {});
    const splits: SplitEvent[] = rawSplits
      .filter((s) => s.numerator > 0 && s.denominator > 0)
      .map((s) => ({
        date: new Date(s.date * 1000).toISOString().slice(0, 10),
        ratio: s.splitRatio,
        numerator: s.numerator,
        denominator: s.denominator,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    return { price: typeof price === "number" ? price : null, splits };
  } catch {
    return { price: null, splits: [] };
  }
}

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  return (await fetchYahooQuote(symbol)).price;
}

async function fetchCoinGeckoPrice(coinId: string): Promise<number | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[coinId]?.usd ?? null;
  } catch {
    return null;
  }
}

const coinGeckoMap: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
  ADA: "cardano", XRP: "ripple", DOGE: "dogecoin", DOT: "polkadot",
  AVAX: "avalanche-2", MATIC: "matic-network", LINK: "chainlink", UNI: "uniswap",
  ATOM: "cosmos", LTC: "litecoin", BCH: "bitcoin-cash",
};

// Extract base coin from symbols like BTCUSD, BTCUSDT, BTC
function parseBaseAndQuote(symbol: string): { base: string; quote: "USD" | "USDT" } {
  const s = symbol.toUpperCase();
  if (s.endsWith("USDT")) return { base: s.slice(0, -4), quote: "USDT" };
  if (s.endsWith("USD")) return { base: s.slice(0, -3), quote: "USD" };
  return { base: s, quote: "USD" };
}

async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  const { base, quote } = parseBaseAndQuote(symbol);
  const yahooTicker = `${base}-${quote}`;
  const yahooPrice = await fetchYahooPrice(yahooTicker);
  if (yahooPrice !== null) return yahooPrice;
  // CoinGecko fallback (always USD)
  const coinId = coinGeckoMap[base] || base.toLowerCase();
  return fetchCoinGeckoPrice(coinId);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assets } = body;

    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json({ error: "assets array required" }, { status: 400 });
    }

    const [results, usdTryPrice] = await Promise.all([
      Promise.all(
        assets.map(async ({ symbol, type }: { symbol: string; type: string }): Promise<PriceData> => {
          if (type === "BIST") {
            const q = await fetchYahooQuote(`${symbol}.IS`);
            return { symbol, price: q.price, currency: "TRY", splits: q.splits };
          }
          if (type === "US") {
            const q = await fetchYahooQuote(symbol);
            return { symbol, price: q.price, currency: "USD", splits: q.splits };
          }
          if (type === "CRYPTO") {
            return { symbol, price: await fetchCryptoPrice(symbol), currency: "USD", splits: [] };
          }
          return { symbol, price: null, currency: "TRY", splits: [] };
        })
      ),
      fetchYahooPrice("USDTRY=X"),
    ]);

    return NextResponse.json({ prices: results, usdTry: usdTryPrice });
  } catch {
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
