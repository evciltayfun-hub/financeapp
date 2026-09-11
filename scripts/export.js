// Export all local data to export.json
// Run: node scripts/export.js
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  console.log("Exporting local data...");

  const [assets, cashBalances, subscriptions, watchlistItems, monthlyBudgets, portfolioNotes, monthlyGoals, travelCountries] =
    await Promise.all([
      prisma.asset.findMany({ include: { lots: true } }),
      prisma.cashBalance.findMany(),
      prisma.subscription.findMany(),
      prisma.watchlistItem.findMany(),
      prisma.monthlyBudget.findMany(),
      prisma.portfolioNote.findMany(),
      prisma.monthlyGoal.findMany(),
      prisma.travelCountry.findMany({ include: { visits: true } }),
    ]);

  const data = { assets, cashBalances, subscriptions, watchlistItems, monthlyBudgets, portfolioNotes, monthlyGoals, travelCountries };
  const outPath = path.join(__dirname, "..", "export.json");
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));

  console.log(`✓ Assets:         ${assets.length} (${assets.reduce((a, x) => a + x.lots.length, 0)} lots)`);
  console.log(`✓ Cash balances:  ${cashBalances.length}`);
  console.log(`✓ Subscriptions:  ${subscriptions.length}`);
  console.log(`✓ Watchlist:      ${watchlistItems.length}`);
  console.log(`✓ Budget rows:    ${monthlyBudgets.length}`);
  console.log(`✓ Notes:          ${portfolioNotes.length}`);
  console.log(`✓ Monthly goals:  ${monthlyGoals.length}`);
  console.log(`✓ Travel:         ${travelCountries.length} countries (${travelCountries.reduce((a, x) => a + x.visits.length, 0)} visits)`);
  console.log(`\nSaved → export.json`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
