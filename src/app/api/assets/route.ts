import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const assets = await prisma.asset.findMany({
      include: { lots: true },
      orderBy: [{ type: "asc" }, { symbol: "asc" }],
    });
    return NextResponse.json(assets);
  } catch {
    return NextResponse.json({ error: "Failed to fetch assets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, name, type } = body;

    if (!symbol || !name || !type) {
      return NextResponse.json({ error: "symbol, name, type required" }, { status: 400 });
    }

    const asset = await prisma.asset.upsert({
      where: { symbol_type: { symbol: symbol.toUpperCase(), type } },
      update: { name },
      create: { symbol: symbol.toUpperCase(), name, type },
      include: { lots: true },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create asset" }, { status: 500 });
  }
}
