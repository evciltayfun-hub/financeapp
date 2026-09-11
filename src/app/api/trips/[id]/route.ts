import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trip = await prisma.tripPlan.findUnique({
    where: { id },
    include: { expenses: { orderBy: { createdAt: "asc" } } },
  });
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(trip);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const trip = await prisma.tripPlan.update({
    where: { id },
    data: {
      ...(body.title       !== undefined && { title:       body.title }),
      ...(body.destination !== undefined && { destination: body.destination }),
      ...(body.startDate   !== undefined && { startDate:   body.startDate }),
      ...(body.endDate     !== undefined && { endDate:     body.endDate }),
      ...(body.status      !== undefined && { status:      body.status }),
      ...(body.totalBudget !== undefined && { totalBudget: body.totalBudget }),
      ...(body.currency    !== undefined && { currency:    body.currency }),
      ...(body.notes       !== undefined && { notes:       body.notes }),
    },
    include: { expenses: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(trip);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.tripPlan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
