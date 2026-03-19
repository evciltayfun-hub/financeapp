"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";
import { cn } from "@/lib/utils";

const HIDDEN = "••••••";
const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const RATES: Record<string, number> = { "₺": 1, $: 44, "€": 48, "£": 56 };

type Sub = { id: string; name: string; price: number; currency: string; period: string; paymentMonth: number | null; isActive: boolean; activatedFrom: number | null; deactivatedFrom: number | null };
type BudgetRow = { year: number; month: number; carryover: number; salary: number; extraIncome: number; otherExpenses: number; investment: number; note: string | null };
type BudgetField = "carryover" | "salary" | "extraIncome" | "otherExpenses" | "investment";

function toTRY(price: number, currency: string) {
  return price * (RATES[currency] ?? 1);
}

function fmtTRY(val: number) {
  return `₺${Math.round(val).toLocaleString("tr-TR")}`;
}

function EditableCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const { hidden } = usePrivacy();

  useEffect(() => { setDraft(String(value)); }, [value]);

  if (hidden) return <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{HIDDEN}</td>;

  if (editing) {
    return (
      <td className="px-2 py-1">
        <input
          autoFocus
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { setEditing(false); onSave(Number(draft) || 0); }}
          onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); onSave(Number(draft) || 0); } if (e.key === "Escape") { setEditing(false); setDraft(String(value)); } }}
          className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-right tabular-nums focus:outline-none"
        />
      </td>
    );
  }

  return (
    <td
      className="px-4 py-3 text-right tabular-nums cursor-pointer hover:bg-white/5 rounded transition-colors"
      onClick={() => setEditing(true)}
      title="Düzenlemek için tıkla"
    >
      {value === 0 ? <span className="text-white/20">—</span> : <span>{fmtTRY(value)}</span>}
    </td>
  );
}

function InvestmentCell({ value, pct, onSave }: { value: number; pct: number | null; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const { hidden } = usePrivacy();

  useEffect(() => { setDraft(String(value)); }, [value]);

  if (hidden) return <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{HIDDEN}</td>;

  if (editing) {
    return (
      <td className="px-2 py-1">
        <input
          autoFocus
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { setEditing(false); onSave(Number(draft) || 0); }}
          onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); onSave(Number(draft) || 0); } if (e.key === "Escape") { setEditing(false); setDraft(String(value)); } }}
          className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-sm text-right tabular-nums focus:outline-none"
        />
      </td>
    );
  }

  return (
    <td
      className="px-4 py-3 text-right tabular-nums cursor-pointer hover:bg-white/5 rounded transition-colors"
      onClick={() => setEditing(true)}
      title="Düzenlemek için tıkla"
    >
      <div className="flex items-center justify-end gap-1.5">
        {pct !== null && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-medium">%{pct}</span>
        )}
        {value === 0 ? (
          <span className="text-white/20">—</span>
        ) : (
          <span className="text-blue-400">{fmtTRY(value)}</span>
        )}
      </div>
    </td>
  );
}

function NoteCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  if (editing) {
    return (
      <td className="px-2 py-1 min-w-[180px]">
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => { setEditing(false); onSave(draft); }}
          onKeyDown={(e) => { if (e.key === "Enter") { setEditing(false); onSave(draft); } if (e.key === "Escape") { setEditing(false); setDraft(value); } }}
          className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-sm focus:outline-none"
          placeholder="Not ekle..."
        />
      </td>
    );
  }

  return (
    <td
      className="px-4 py-3 text-sm cursor-pointer hover:bg-white/5 transition-colors min-w-[180px]"
      onClick={() => setEditing(true)}
      title="Not eklemek için tıkla"
    >
      {value ? (
        <span className="text-white/60">{value}</span>
      ) : (
        <span className="text-white/15">—</span>
      )}
    </td>
  );
}

export default function BudgetPage() {
  const { hidden } = usePrivacy();
  const H = (val: string) => (hidden ? HIDDEN : val);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [budget, setBudget] = useState<Record<number, BudgetRow>>({});
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    const [subsRes, budgetRes, rateRes] = await Promise.all([
      fetch("/api/subscriptions"),
      fetch(`/api/budget?year=${y}`),
      fetch("/api/prices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assets: [] }) }),
    ]);
    const subsData: Sub[] = await subsRes.json();
    const budgetData: BudgetRow[] = await budgetRes.json();
    const rateData = await rateRes.json();
    setSubs(subsData);
    if (rateData.usdTry) setUsdRate(rateData.usdTry);
    const map: Record<number, BudgetRow> = {};
    for (const r of budgetData) map[r.month] = r;
    setBudget(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(year); }, [year, load]);

  async function updateBudget(month: number, field: BudgetField, value: number) {
    const current = budget[month] ?? { year, month, carryover: 0, salary: 0, extraIncome: 0, otherExpenses: 0, investment: 0, note: null };
    const updated = { ...current, [field]: value };
    setBudget((prev) => ({ ...prev, [month]: updated }));
    await fetch("/api/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, [field]: value }),
    });
  }

  async function updateNote(month: number, note: string) {
    const current = budget[month] ?? { year, month, carryover: 0, salary: 0, extraIncome: 0, otherExpenses: 0, investment: 0, note: null };
    setBudget((prev) => ({ ...prev, [month]: { ...current, note } }));
    await fetch("/api/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, note }),
    });
  }

  // Check if a subscription is active for a given year+month
  function isSubActiveForMonth(s: Sub, ym: number): boolean {
    if (s.isActive) {
      return s.activatedFrom == null || s.activatedFrom <= ym;
    } else {
      if (s.deactivatedFrom == null) return false;
      if (s.activatedFrom != null) {
        return s.activatedFrom <= ym && ym < s.deactivatedFrom;
      } else {
        return ym < s.deactivatedFrom;
      }
    }
  }

  // Calculate subscription cost for a given month
  function subsCostForMonth(month: number): number {
    const ym = year * 100 + month;
    let total = 0;
    for (const s of subs) {
      if (!isSubActiveForMonth(s, ym)) continue;
      if (s.period === "monthly") {
        total += toTRY(s.price, s.currency);
      } else if (s.period === "yearly" && s.paymentMonth === month) {
        total += toTRY(s.price, s.currency);
      }
    }
    return total;
  }

  const yearlySubs = subs.filter((s) => s.period === "yearly" && s.isActive);
  const monthlySubsTotal = subs.filter((s) => s.period === "monthly" && s.isActive).reduce((a, s) => a + toTRY(s.price, s.currency), 0);

  // Annual totals
  let totalCarryover = 0, totalSalary = 0, totalExtra = 0, totalSubs = 0, totalOther = 0, totalInvestment = 0;
  for (let m = 1; m <= 12; m++) {
    totalCarryover += budget[m]?.carryover ?? 0;
    totalSalary += budget[m]?.salary ?? 0;
    totalExtra += budget[m]?.extraIncome ?? 0;
    totalSubs += subsCostForMonth(m);
    totalOther += budget[m]?.otherExpenses ?? 0;
    totalInvestment += budget[m]?.investment ?? 0;
  }
  const totalNet = totalCarryover + totalSalary + totalExtra - totalSubs - totalOther - totalInvestment;

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
      <div className="text-muted-foreground text-sm">Yükleniyor...</div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gelir & Gider</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Maaş ve giderleri düzenlemek için hücrelere tıkla</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft size={16} />
          </button>
          <span className="text-lg font-semibold w-14 text-center">{year}</span>
          <button onClick={() => setYear(y => y + 1)} className="p-1.5 rounded-lg hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Legend: yearly subs */}
      {yearlySubs.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-[oklch(0.28_0_0)] p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Yıllık abonelikler — ödeme ayı ataması
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Yıllık aboneliklerinizin ödeme aylarını Abonelikler sayfasından ayarlayabilirsiniz.
          </p>
          <div className="flex flex-wrap gap-2">
            {yearlySubs.map((s) => (
              <span key={s.id} className="text-xs px-2.5 py-1 rounded-lg bg-white/6 text-white/70 flex items-center gap-1.5">
                <span>{s.name}</span>
                <span className="text-white/30">·</span>
                <span className={s.paymentMonth ? "text-amber-400" : "text-white/30"}>
                  {s.paymentMonth ? MONTHS[s.paymentMonth - 1] : "Ay seçilmedi"}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main table */}
      <div className="rounded-xl border border-white/8 bg-[oklch(0.28_0_0)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ay</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Önceki Aydan Devir</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Maaş</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Ek Gelir</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Abonelikler</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Diğer Ödemeler</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Yatırıma Aktarılacak</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Kalan</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Notlar</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((monthName, idx) => {
              const month = idx + 1;
              const row = budget[month];
              const carryover = row?.carryover ?? 0;
              const salary = row?.salary ?? 0;
              const extra = row?.extraIncome ?? 0;
              const other = row?.otherExpenses ?? 0;
              const investment = row?.investment ?? 0;
              const note = row?.note ?? "";
              const subsTotal = subsCostForMonth(month);
              const totalIncome = carryover + salary + extra;
              const net = totalIncome - subsTotal - other - investment;
              const hasIncome = totalIncome > 0;
              const investmentPct = totalIncome > 0 && investment > 0 ? Math.round((investment / totalIncome) * 100) : null;
              const isCurrentMonth = year === currentYear && month === new Date().getMonth() + 1;
              const yearlyThisMonth = yearlySubs.filter((s) => s.paymentMonth === month);

              return (
                <tr
                  key={month}
                  className={cn(
                    "border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors",
                    isCurrentMonth && "bg-white/4"
                  )}
                >
                  {/* Ay */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-medium", isCurrentMonth && "text-white")}>
                        {monthName}
                      </span>
                      {isCurrentMonth && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/60">Bu ay</span>
                      )}
                      {yearlyThisMonth.length > 0 && (
                        <div className="flex gap-1">
                          {yearlyThisMonth.map((s) => (
                            <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                              {s.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Önceki Aydan Devir */}
                  <EditableCell
                    value={carryover}
                    onSave={(v) => updateBudget(month, "carryover", v)}
                  />

                  {/* Net Maaş */}
                  <EditableCell
                    value={salary}
                    onSave={(v) => updateBudget(month, "salary", v)}
                  />

                  {/* Ek Gelir */}
                  <EditableCell
                    value={extra}
                    onSave={(v) => updateBudget(month, "extraIncome", v)}
                  />

                  {/* Abonelikler */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {subsTotal > 0 ? (
                      <span className={hidden ? "" : "text-red-400"}>{H(fmtTRY(subsTotal))}</span>
                    ) : (
                      <span className="text-white/20">
                        {hidden ? HIDDEN : fmtTRY(monthlySubsTotal)}
                      </span>
                    )}
                  </td>

                  {/* Diğer Ödemeler */}
                  <EditableCell
                    value={other}
                    onSave={(v) => updateBudget(month, "otherExpenses", v)}
                  />

                  {/* Yatırıma Aktarılacak */}
                  <InvestmentCell
                    value={investment}
                    pct={investmentPct}
                    onSave={(v) => updateBudget(month, "investment", v)}
                  />

                  {/* Net Kalan */}
                  <td className={cn(
                    "px-4 py-3 text-right tabular-nums font-semibold",
                    !hasIncome ? "text-white/20" : net >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {!hasIncome ? "—" : H(fmtTRY(net))}
                  </td>

                  {/* Notlar */}
                  <NoteCell value={note} onSave={(v) => updateNote(month, v)} />
                </tr>
              );
            })}
          </tbody>
          {/* Toplam satırı */}
          <tfoot>
            <tr className="border-t border-white/15 bg-white/4">
              <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Yıllık toplam</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">{H(fmtTRY(totalCarryover))}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">{H(fmtTRY(totalSalary))}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">{H(fmtTRY(totalExtra))}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-red-400">{H(fmtTRY(totalSubs))}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-red-400">{H(fmtTRY(totalOther))}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-blue-400">{H(fmtTRY(totalInvestment))}</td>
              <td className={cn("px-4 py-3 text-right tabular-nums font-bold", totalNet >= 0 ? "text-green-400" : "text-red-400")}>
                {H(fmtTRY(totalNet))}
              </td>
              <td />
            </tr>
            {usdRate && (
              <tr className="border-t border-white/5 bg-white/2">
                <td className="px-4 py-2.5 text-xs text-muted-foreground/60 flex items-center gap-1.5">
                  <span>≈ USD</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/8 text-white/40 text-[10px]">1$ = ₺{usdRate.toFixed(2)}</span>
                </td>
                {[totalCarryover, totalSalary, totalExtra, totalSubs, totalOther, totalInvestment, totalNet].map((val, i) => (
                  <td key={i} className={cn("px-4 py-2.5 text-right tabular-nums text-xs text-muted-foreground/50", i === 3 || i === 4 ? "text-red-400/40" : i === 5 ? "text-blue-400/40" : i === 6 ? (totalNet >= 0 ? "text-green-400/40" : "text-red-400/40") : "")}>
                    {hidden ? "••" : `$${Math.round(val / usdRate).toLocaleString("tr-TR")}`}
                  </td>
                ))}
                <td />
              </tr>
            )}
          </tfoot>
        </table>
      </div>

    </div>
  );
}
