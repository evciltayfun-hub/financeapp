import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; expId: string }> }) {
  const { expId } = await params;
  const body = await req.json();
  const expense = await prisma.tripExpense.update({
    where: { id: expId },
    data: {
      ...(body.category    !== undefined && { category:    body.category }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.amount      !== undefined && { amount:      body.amount }),
      ...(body.currency    !== undefined && { currency:    body.currency }),
      ...(body.isPaid        !== undefined && { isPaid:        body.isPaid }),
      ...(body.date          !== undefined && { date:          body.date }),
      ...(body.savingsAmount   !== undefined && { savingsAmount:   body.savingsAmount }),
      ...(body.savingsNote     !== undefined && { savingsNote:     body.savingsNote }),
      ...(body.savingsData     !== undefined && { savingsData:     body.savingsData }),
      ...(body.paymentMethod   !== undefined && { paymentMethod:   body.paymentMethod }),
    },
  });
  return NextResponse.json(expense);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; expId: string }> }) {
  const { expId } = await params;
  await prisma.tripExpense.delete({ where: { id: expId } });
  return NextResponse.json({ ok: true });
}
