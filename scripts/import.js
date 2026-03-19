// Import export.json into the target database (uses DATABASE_URL from env)
// Local:   node scripts/import.js
// Railway: railway run node scripts/import.js
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const filePath = path.join(__dirname, "..", "export.json");
  if (!fs.existsSync(filePath)) {
    console.error("export.json bulunamadı. Önce: node scripts/export.js");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log("Importing into:", process.env.DATABASE_URL ?? "local");

  // Assets + Lots
  for (const asset of data.assets ?? []) {
    const { lots, ...assetData } = asset;
    await prisma.asset.upsert({
      where: { symbol_type: { symbol: assetData.symbol, type: assetData.type } },
      create: { ...assetData, lots: { create: lots.map(({ id, assetId, ...l }) => l) } },
      update: { name: assetData.name },
    });
  }
  console.log(`✓ Assets: ${data.assets?.length ?? 0}`);

  // Cash balances
  for (const cb of data.cashBalances ?? []) {
    await prisma.cashBalance.upsert({
      where: { currency: cb.currency },
      create: { currency: cb.currency, amount: cb.amount, label: cb.label },
      update: { amount: cb.amount, label: cb.label },
    });
  }
  console.log(`✓ Cash balances: ${data.cashBalances?.length ?? 0}`);

  // Subscriptions
  for (const sub of data.subscriptions ?? []) {
    const { id, createdAt, updatedAt, ...rest } = sub;
    await prisma.subscription.upsert({
      where: { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  console.log(`✓ Subscriptions: ${data.subscriptions?.length ?? 0}`);

  // Watchlist
  for (const item of data.watchlistItems ?? []) {
    const { id, createdAt, ...rest } = item;
    await prisma.watchlistItem.upsert({
      where: { symbol_type: { symbol: rest.symbol, type: rest.type } },
      create: { id, createdAt, ...rest },
      update: { name: rest.name },
    });
  }
  console.log(`✓ Watchlist: ${data.watchlistItems?.length ?? 0}`);

  // Monthly budgets
  for (const row of data.monthlyBudgets ?? []) {
    const { id, createdAt, updatedAt, ...rest } = row;
    await prisma.monthlyBudget.upsert({
      where: { year_month: { year: rest.year, month: rest.month } },
      create: { id, ...rest },
      update: rest,
    });
  }
  console.log(`✓ Budget rows: ${data.monthlyBudgets?.length ?? 0}`);

  // Portfolio notes
  for (const note of data.portfolioNotes ?? []) {
    const { id, createdAt, updatedAt, ...rest } = note;
    await prisma.portfolioNote.upsert({
      where: { id },
      create: { id, ...rest },
      update: rest,
    });
  }
  console.log(`✓ Notes: ${data.portfolioNotes?.length ?? 0}`);

  console.log("\n✅ Import tamamlandı!");
}

main()
  .catch((e) => { console.error("Hata:", e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
