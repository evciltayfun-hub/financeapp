import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const visit = await prisma.travelVisit.create({ data: body });
  return NextResponse.json(visit);
}
