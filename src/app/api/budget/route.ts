import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const year = Number(new URL(req.url).searchParams.get("year") ?? new Date().getFullYear());
  const rows = await prisma.monthlyBudget.findMany({ where: { year }, orderBy: { month: "asc" } });
  return NextResponse.json(rows);
}

export async function PUT(req: Request) {
  const { year, month, salary, extraIncome, carryover, otherExpenses, investment, note } = await req.json();
  const row = await prisma.monthlyBudget.upsert({
    where: { year_month: { year, month } },
    update: {
      salary: salary ?? undefined,
      extraIncome: extraIncome ?? undefined,
      carryover: carryover ?? undefined,
      otherExpenses: otherExpenses ?? undefined,
      investment: investment ?? undefined,
      note: note !== undefined ? note : undefined,
    },
    create: { year, month, salary: salary ?? 0, extraIncome: extraIncome ?? 0, carryover: carryover ?? 0, otherExpenses: otherExpenses ?? 0, investment: investment ?? 0, note: note ?? null },
  });
  return NextResponse.json(row);
}
