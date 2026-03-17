import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const data = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { name, category, price, currency, period, paymentMonth } = await req.json();

  if (!name || !category || !price || !period) {
    return NextResponse.json({ error: "Eksik alan" }, { status: 400 });
  }

  const sub = await prisma.subscription.create({
    data: { name, category, price: Number(price), currency, period, paymentMonth: paymentMonth ? Number(paymentMonth) : null },
  });
  return NextResponse.json(sub, { status: 201 });
}

export async function PUT(req: Request) {
  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

  if (data.price !== undefined) data.price = Number(data.price);

  const sub = await prisma.subscription.update({
    where: { id },
    data,
  });
  return NextResponse.json(sub);
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID gerekli" }, { status: 400 });

  await prisma.subscription.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
