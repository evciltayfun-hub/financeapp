import { NextRequest, NextResponse } from "next/server";

interface PriceResult {
  symbol: string;
  price: number | null;
  currency: string;
  error?: string;
}

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return price ?? null;
  } catch {
    return null;
  }
}

async function fetchCryptoPrice(coinId: string): Promise<number | null> {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.[coinId]?.usd ?? null;
  } catch {
    return null;
  }
}

// Map common crypto symbols to CoinGecko IDs
const cryptoMap: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  BNB: "binancecoin",
  SOL: "solana",
  ADA: "cardano",
  XRP: "ripple",
  DOGE: "dogecoin",
  DOT: "polkadot",
  AVAX: "avalanche-2",
  MATIC: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assets } = body; // [{ symbol, type }]

    if (!assets || !Array.isArray(assets)) {
      return NextResponse.json({ error: "assets array required" }, { status: 400 });
    }

    const results: PriceResult[] = await Promise.all(
      assets.map(async ({ symbol, type }: { symbol: string; type: string }) => {
        let price: number | null = null;
        let currency = "TRY";

        if (type === "BIST") {
          price = await fetchYahooPrice(`${symbol}.IS`);
          currency = "TRY";
        } else if (type === "US") {
          price = await fetchYahooPrice(symbol);
          currency = "USD";
        } else if (type === "CRYPTO") {
          const coinId = cryptoMap[symbol.toUpperCase()] || symbol.toLowerCase();
          price = await fetchCryptoPrice(coinId);
          currency = "USD";
        }

        return { symbol, price, currency };
      })
    );

    // Also fetch USD/TRY rate
    const usdTryPrice = await fetchYahooPrice("USDTRY=X");

    return NextResponse.json({ prices: results, usdTry: usdTryPrice });
  } catch {
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
