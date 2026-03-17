import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const year = Number(new URL(req.url).searchParams.get("year") ?? new Date().getFullYear());
  const rows = await prisma.monthlyBudget.findMany({ where: { year }, orderBy: { month: "asc" } });
  return NextResponse.json(rows);
}

export async function PUT(req: Request) {
  const { year, month, salary, otherExpenses } = await req.json();
  const row = await prisma.monthlyBudget.upsert({
    where: { year_month: { year, month } },
    update: { salary: salary ?? undefined, otherExpenses: otherExpenses ?? undefined },
    create: { year, month, salary: salary ?? 0, otherExpenses: otherExpenses ?? 0 },
  });
  return NextResponse.json(row);
}
