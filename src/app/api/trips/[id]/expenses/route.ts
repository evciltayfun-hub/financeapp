import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const expense = await prisma.tripExpense.create({
    data: {
      tripId:      id,
      category:    body.category,
      description: body.description,
      amount:      body.amount,
      currency:      body.currency      ?? "TRY",
      isPaid:        body.isPaid        ?? false,
      date:          body.date          ?? null,
      savingsAmount: body.savingsAmount ?? 0,
      savingsNote:   body.savingsNote   ?? null,
      savingsData:   body.savingsData   ?? null,
      paymentMethod: body.paymentMethod ?? "nakit",
    },
  });
  return NextResponse.json(expense);
}
