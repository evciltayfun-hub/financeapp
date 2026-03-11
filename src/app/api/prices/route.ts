import { NextRequest, NextResponse } from "next/server";

interface PriceResult {
  symbol: string;
  price: number | null;
  currency: string;
}

async function fetchYahooPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    return typeof price === "number" ? price : null;
  } catch {
    return null;
  }
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

const cryptoYahooMap: Record<string, string> = {
  BTC: "BTC-USD", ETH: "ETH-USD", BNB: "BNB-USD", SOL: "SOL-USD",
  ADA: "ADA-USD", XRP: "XRP-USD", DOGE: "DOGE-USD", DOT: "DOT-USD",
  AVAX: "AVAX-USD", MATIC: "MATIC-USD", LINK: "LINK-USD", UNI: "UNI-USD",
  ATOM: "ATOM-USD", LTC: "LTC-USD", BCH: "BCH-USD",
};

const cryptoCoinGeckoMap: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", SOL: "solana",
  ADA: "cardano", XRP: "ripple", DOGE: "dogecoin", DOT: "polkadot",
  AVAX: "avalanche-2", MATIC: "matic-network", LINK: "chainlink", UNI: "uniswap",
  ATOM: "cosmos", LTC: "litecoin", BCH: "bitcoin-cash",
};

async function fetchCryptoPrice(symbol: string): Promise<number | null> {
  const yahooTicker = cryptoYahooMap[symbol.toUpperCase()] || `${symbol.toUpperCase()}-USD`;
  const yahooPrice = await fetchYahooPrice(yahooTicker);
  if (yahooPrice !== null) return yahooPrice;
  const coinId = cryptoCoinGeckoMap[symbol.toUpperCase()] || symbol.toLowerCase();
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
            price = await fetchCryptoPrice(symbol);
            currency = "USD";
          }
          return { symbol, price, currency } as PriceResult;
        })
      ),
      fetchYahooPrice("USDTRY=X"),
    ]);

    return NextResponse.json({ prices: results, usdTry: usdTryPrice });
  } catch {
    return NextResponse.json({ error: "Failed to fetch prices" }, { status: 500 });
  }
}
