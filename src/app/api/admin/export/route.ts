import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Same shape as scripts/export.js so a backup can be restored with scripts/push-to-railway.js
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-import-secret");
  if (!secret || secret !== process.env.IMPORT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [assets, cashBalances, subscriptions, watchlistItems, monthlyBudgets, portfolioNotes, monthlyGoals, travelCountries, cultureEvents, trips] =
    await Promise.all([
      prisma.asset.findMany({ include: { lots: true } }),
      prisma.cashBalance.findMany(),
      prisma.subscription.findMany(),
      prisma.watchlistItem.findMany(),
      prisma.monthlyBudget.findMany(),
      prisma.portfolioNote.findMany(),
      prisma.monthlyGoal.findMany(),
      prisma.travelCountry.findMany({ include: { visits: true } }),
      prisma.cultureEvent.findMany(),
      prisma.tripPlan.findMany({ include: { expenses: true } }),
    ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    assets, cashBalances, subscriptions, watchlistItems, monthlyBudgets, portfolioNotes, monthlyGoals, travelCountries, cultureEvents, trips,
  });
}
