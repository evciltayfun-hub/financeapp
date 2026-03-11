import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.lot.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete lot" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { quantity, costPriceTL, costPriceUSD, purchaseDate, note } = body;

    const lot = await prisma.lot.update({
      where: { id },
      data: {
        ...(quantity !== undefined && { quantity: parseFloat(quantity) }),
        ...(costPriceTL !== undefined && { costPriceTL: costPriceTL ? parseFloat(costPriceTL) : null }),
        ...(costPriceUSD !== undefined && { costPriceUSD: costPriceUSD ? parseFloat(costPriceUSD) : null }),
        ...(purchaseDate !== undefined && { purchaseDate: new Date(purchaseDate) }),
        ...(note !== undefined && { note }),
      },
    });

    return NextResponse.json(lot);
  } catch {
    return NextResponse.json({ error: "Failed to update lot" }, { status: 500 });
  }
}
