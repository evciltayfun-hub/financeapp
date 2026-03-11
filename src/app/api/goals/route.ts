import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const goals = await prisma.monthlyGoal.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return NextResponse.json(goals);
  } catch {
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { year, month, incomeTarget, savingTarget, actualIncome, actualExpense, note } = body;

    if (!year || !month) {
      return NextResponse.json({ error: "year and month required" }, { status: 400 });
    }

    const goal = await prisma.monthlyGoal.upsert({
      where: { year_month: { year: parseInt(year), month: parseInt(month) } },
      update: {
        incomeTarget: incomeTarget ? parseFloat(incomeTarget) : undefined,
        savingTarget: savingTarget ? parseFloat(savingTarget) : undefined,
        actualIncome: actualIncome !== undefined ? parseFloat(actualIncome) : undefined,
        actualExpense: actualExpense !== undefined ? parseFloat(actualExpense) : undefined,
        note,
      },
      create: {
        year: parseInt(year),
        month: parseInt(month),
        incomeTarget: incomeTarget ? parseFloat(incomeTarget) : 0,
        savingTarget: savingTarget ? parseFloat(savingTarget) : 0,
        actualIncome: actualIncome ? parseFloat(actualIncome) : 0,
        actualExpense: actualExpense ? parseFloat(actualExpense) : 0,
        note,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to save goal" }, { status: 500 });
  }
}
