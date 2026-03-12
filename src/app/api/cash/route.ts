import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const balances = await prisma.cashBalance.findMany({ orderBy: { currency: "asc" } });
  return NextResponse.json(balances);
}

export async function POST(req: Request) {
  const { currency, amount, label } = await req.json();
  if (!currency || amount == null) {
    return NextResponse.json({ error: "currency and amount required" }, { status: 400 });
  }
  const balance = await prisma.cashBalance.upsert({
    where: { currency },
    update: { amount: parseFloat(amount), label: label ?? "" },
    create: { currency, amount: parseFloat(amount), label: label ?? "" },
  });
  return NextResponse.json(balance);
}
