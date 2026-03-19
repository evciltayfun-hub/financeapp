// Push local export.json to Railway deployment
// Usage: RAILWAY_URL=https://xxx.railway.app IMPORT_SECRET=mypassword node scripts/push-to-railway.js
const fs = require("fs");
const path = require("path");

const RAILWAY_URL = process.env.RAILWAY_URL;
const IMPORT_SECRET = process.env.IMPORT_SECRET;

if (!RAILWAY_URL || !IMPORT_SECRET) {
  console.error("Eksik değişkenler. Kullanım:");
  console.error("  RAILWAY_URL=https://xxx.railway.app IMPORT_SECRET=mypassword node scripts/push-to-railway.js");
  process.exit(1);
}

const filePath = path.join(__dirname, "..", "export.json");
if (!fs.existsSync(filePath)) {
  console.error("export.json bulunamadı. Önce: node scripts/export.js");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
const url = `${RAILWAY_URL.replace(/\/$/, "")}/api/admin/import`;

console.log(`Gönderiliyor → ${url}`);
console.log(`Veri: ${data.assets?.length ?? 0} asset, ${data.subscriptions?.length ?? 0} abonelik, ${data.monthlyBudgets?.length ?? 0} bütçe satırı`);

fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-import-secret": IMPORT_SECRET },
  body: JSON.stringify(data),
})
  .then((r) => r.json())
  .then((result) => {
    if (result.error) { console.error("Hata:", result.error); process.exit(1); }
    console.log("\n✅ Import tamamlandı!");
    console.log(result.imported);
  })
  .catch((e) => { console.error("Bağlantı hatası:", e.message); process.exit(1); });
