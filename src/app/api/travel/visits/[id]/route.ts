import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const visit = await prisma.travelVisit.update({ where: { id }, data: body });
  return NextResponse.json(visit);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.travelVisit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
