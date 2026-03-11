import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const goals = await prisma.monthlyGoal.findMany({
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });
    return NextResponse.json(goals);
  } catch {
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

function num(v: unknown, fallback = 0): number {
  if (v === undefined || v === null || v === "") return fallback;
  const n = parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

function bool(v: unknown, fallback = false): boolean {
  if (v === undefined || v === null) return fallback;
  return Boolean(v);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json({ error: "year and month required" }, { status: 400 });
    }

    const data = {
      netSalary: num(body.netSalary),
      spendingTarget: num(body.spendingTarget),
      besInvestment: num(body.besInvestment),
      investmentTarget: num(body.investmentTarget),
      actualInvestment: num(body.actualInvestment),
      remainingCash: num(body.remainingCash),
      creditCardTL: num(body.creditCardTL),
      creditCardEUR: num(body.creditCardEUR),
      netAmount: num(body.netAmount),
      note: body.note ?? null,
      isChecked: bool(body.isChecked),
      extraAmount: num(body.extraAmount),
      isExtraChecked: bool(body.isExtraChecked),
    };

    const goal = await prisma.monthlyGoal.upsert({
      where: { year_month: { year: parseInt(year), month: parseInt(month) } },
      update: data,
      create: { year: parseInt(year), month: parseInt(month), ...data },
    });

    return NextResponse.json(goal);
  } catch {
    return NextResponse.json({ error: "Failed to save goal" }, { status: 500 });
  }
}
