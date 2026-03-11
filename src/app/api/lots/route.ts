import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assetId, quantity, costPriceTL, costPriceUSD, purchaseDate, note } = body;

    if (!assetId || !quantity) {
      return NextResponse.json({ error: "assetId and quantity required" }, { status: 400 });
    }

    const lot = await prisma.lot.create({
      data: {
        assetId,
        quantity: parseFloat(quantity),
        costPriceTL: costPriceTL ? parseFloat(costPriceTL) : null,
        costPriceUSD: costPriceUSD ? parseFloat(costPriceUSD) : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        note,
      },
    });

    return NextResponse.json(lot, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create lot" }, { status: 500 });
  }
}
