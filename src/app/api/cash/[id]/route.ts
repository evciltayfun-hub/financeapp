import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { amount, label } = await req.json();
  const balance = await prisma.cashBalance.update({
    where: { id },
    data: { amount: parseFloat(amount), label: label ?? "" },
  });
  return NextResponse.json(balance);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.cashBalance.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
