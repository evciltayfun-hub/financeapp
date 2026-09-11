import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const countries = await prisma.travelCountry.findMany({
    orderBy: { countryName: "asc" },
    include: { visits: { orderBy: { startDate: "asc" } } },
  });
  return NextResponse.json(countries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const country = await prisma.travelCountry.create({ data: body });
  return NextResponse.json({ ...country, visits: [] });
}
