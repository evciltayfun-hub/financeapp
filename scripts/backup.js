// Download a full data snapshot from the live site into a dated JSON file.
// Usage: railway run node scripts/backup.js   (IMPORT_SECRET comes from Railway variables)
// Optional env: RAILWAY_URL (default: live domain), BACKUP_DIR (default: ~/Documents/FinanceApp-Yedek), KEEP (default: 30)
const fs = require("fs");
const os = require("os");
const path = require("path");

const RAILWAY_URL = (process.env.RAILWAY_URL || "https://lifeoftufao.up.railway.app").replace(/\/$/, "");
const IMPORT_SECRET = process.env.IMPORT_SECRET;
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(os.homedir(), "Documents", "FinanceApp-Yedek");
const KEEP = parseInt(process.env.KEEP || "30", 10);

const stamp = new Date().toISOString().slice(0, 10);
const logPath = path.join(BACKUP_DIR, "backup.log");

function log(msg) {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  try { fs.appendFileSync(logPath, line + "\n"); } catch {}
}

async function main() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  if (!IMPORT_SECRET) { log("HATA: IMPORT_SECRET yok — `railway run node scripts/backup.js` ile çalıştır"); process.exit(1); }

  const res = await fetch(`${RAILWAY_URL}/api/admin/export`, { headers: { "x-import-secret": IMPORT_SECRET } });
  if (!res.ok) { log(`HATA: ${res.status} ${await res.text().catch(() => "")}`); process.exit(1); }
  const data = await res.json();

  const file = path.join(BACKUP_DIR, `financeapp-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  const lots = (data.assets || []).reduce((n, a) => n + (a.lots?.length || 0), 0);
  log(`OK ${path.basename(file)} — ${data.assets?.length ?? 0} varlık/${lots} lot, ${data.subscriptions?.length ?? 0} abonelik, ${data.monthlyBudgets?.length ?? 0} bütçe, ${data.travelCountries?.length ?? 0} ülke, ${data.trips?.length ?? 0} gezi`);

  const old = fs.readdirSync(BACKUP_DIR)
    .filter((f) => /^financeapp-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort()
    .slice(0, -KEEP);
  for (const f of old) fs.unlinkSync(path.join(BACKUP_DIR, f));
  if (old.length) log(`eski yedek silindi: ${old.join(", ")}`);
}

main().catch((e) => { log(`HATA: ${e.message}`); process.exit(1); });
