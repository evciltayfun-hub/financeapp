import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const trips = await prisma.tripPlan.findMany({
    include: { expenses: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const trip = await prisma.tripPlan.create({
    data: {
      title:       body.title,
      destination: body.destination,
      startDate:   body.startDate   ?? null,
      endDate:     body.endDate     ?? null,
      status:      body.status      ?? "planned",
      totalBudget: body.totalBudget ?? null,
      currency:    body.currency    ?? "TRY",
      notes:       body.notes       ?? null,
    },
    include: { expenses: true },
  });
  return NextResponse.json(trip);
}
