import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.watchlistItem.findMany({ orderBy: { createdAt: "asc" } });
    return NextResponse.json(items);
  } catch {
    return NextResponse.json({ error: "Failed to fetch watchlist" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { symbol, type, name } = await req.json();
    const item = await prisma.watchlistItem.upsert({
      where: { symbol_type: { symbol: symbol.toUpperCase(), type } },
      update: { name },
      create: { symbol: symbol.toUpperCase(), type, name },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }
}
