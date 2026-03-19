import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol") ?? "markets";
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=10&quotesCount=0&enableFuzzyQuery=false`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      next: { revalidate: 1800 }, // 30 min cache
    });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    const news = (data?.news ?? []).slice(0, 10);
    return NextResponse.json(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      news.map((n: any) => ({
        title:     n.title     ?? "",
        publisher: n.publisher ?? "",
        link:      n.link      ?? "",
        time:      n.providerPublishTime ?? 0,
        thumbnail: n.thumbnail?.resolutions?.[0]?.url ?? null,
      }))
    );
  } catch {
    return NextResponse.json([]);
  }
}
