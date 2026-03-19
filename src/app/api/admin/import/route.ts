import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-import-secret");
  if (!secret || secret !== process.env.IMPORT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await req.json();

    // Assets + Lots
    let assetCount = 0;
    for (const asset of data.assets ?? []) {
      const { lots, createdAt, updatedAt, ...assetData } = asset;
      const created = await prisma.asset.upsert({
        where: { symbol_type: { symbol: assetData.symbol, type: assetData.type } },
        create: assetData,
        update: { name: assetData.name },
      });
      for (const lot of lots ?? []) {
        const { id, assetId, createdAt: _ca, updatedAt: _ua, ...lotData } = lot;
        await prisma.lot.upsert({
          where: { id },
          create: { id, assetId: created.id, ...lotData },
          update: lotData,
        });
      }
      assetCount++;
    }

    // Cash balances
    for (const cb of data.cashBalances ?? []) {
      await prisma.cashBalance.upsert({
        where: { currency: cb.currency },
        create: { currency: cb.currency, amount: cb.amount, label: cb.label ?? "" },
        update: { amount: cb.amount, label: cb.label ?? "" },
      });
    }

    // Subscriptions
    for (const sub of data.subscriptions ?? []) {
      const { id, createdAt, updatedAt, ...rest } = sub;
      await prisma.subscription.upsert({
        where: { id },
        create: { id, ...rest },
        update: rest,
      });
    }

    // Watchlist
    for (const item of data.watchlistItems ?? []) {
      const { id, createdAt, ...rest } = item;
      await prisma.watchlistItem.upsert({
        where: { symbol_type: { symbol: rest.symbol, type: rest.type } },
        create: { id, ...rest },
        update: { name: rest.name },
      });
    }

    // Monthly budgets
    for (const row of data.monthlyBudgets ?? []) {
      const { id, createdAt, updatedAt, ...rest } = row;
      await prisma.monthlyBudget.upsert({
        where: { year_month: { year: rest.year, month: rest.month } },
        create: { id, ...rest },
        update: rest,
      });
    }

    // Portfolio notes
    for (const note of data.portfolioNotes ?? []) {
      const { id, createdAt, updatedAt, ...rest } = note;
      await prisma.portfolioNote.upsert({
        where: { id },
        create: { id, ...rest },
        update: rest,
      });
    }

    return NextResponse.json({
      ok: true,
      imported: {
        assets: assetCount,
        cashBalances: data.cashBalances?.length ?? 0,
        subscriptions: data.subscriptions?.length ?? 0,
        watchlistItems: data.watchlistItems?.length ?? 0,
        monthlyBudgets: data.monthlyBudgets?.length ?? 0,
        portfolioNotes: data.portfolioNotes?.length ?? 0,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
