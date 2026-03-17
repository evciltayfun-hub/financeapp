"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";
import { cn } from "@/lib/utils";

const HIDDEN = "••••••";
const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
const RATES: Record<string, number> = { "₺": 1, $: 44, "€": 48, "£": 56 };

type Sub = { id: string; name: string; price: number; currency: string; period: string; paymentMonth: number | null; isActive: boolean };
type BudgetRow = { year: number; month: number; salary: number; otherExpenses: number };

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

export default function BudgetPage() {
  const { hidden } = usePrivacy();
  const H = (val: string) => (hidden ? HIDDEN : val);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [budget, setBudget] = useState<Record<number, BudgetRow>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    const [subsRes, budgetRes] = await Promise.all([
      fetch("/api/subscriptions"),
      fetch(`/api/budget?year=${y}`),
    ]);
    const subsData: Sub[] = await subsRes.json();
    const budgetData: BudgetRow[] = await budgetRes.json();
    setSubs(subsData.filter((s) => s.isActive));
    const map: Record<number, BudgetRow> = {};
    for (const r of budgetData) map[r.month] = r;
    setBudget(map);
    setLoading(false);
  }, []);

  useEffect(() => { load(year); }, [year, load]);

  async function updateBudget(month: number, field: "salary" | "otherExpenses", value: number) {
    const current = budget[month] ?? { year, month, salary: 0, otherExpenses: 0 };
    const updated = { ...current, [field]: value };
    setBudget((prev) => ({ ...prev, [month]: updated }));
    await fetch("/api/budget", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month, [field]: value }),
    });
  }

  // Calculate subscription cost for a given month
  function subsCostForMonth(month: number): number {
    let total = 0;
    for (const s of subs) {
      if (s.period === "monthly") {
        total += toTRY(s.price, s.currency);
      } else if (s.period === "yearly" && s.paymentMonth === month) {
        total += toTRY(s.price, s.currency);
      }
    }
    return total;
  }

  // Yearly subs that have a payment month assigned
  const yearlySubs = subs.filter((s) => s.period === "yearly");
  const monthlySubsTotal = subs.filter((s) => s.period === "monthly").reduce((a, s) => a + toTRY(s.price, s.currency), 0);

  // Annual totals
  let totalSalary = 0, totalSubs = 0, totalOther = 0;
  for (let m = 1; m <= 12; m++) {
    totalSalary += budget[m]?.salary ?? 0;
    totalSubs += subsCostForMonth(m);
    totalOther += budget[m]?.otherExpenses ?? 0;
  }
  const totalNet = totalSalary - totalSubs - totalOther;

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

      {/* Legend: monthly subs */}
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
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Maaş</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Abonelikler</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Diğer Ödemeler</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Net Kalan</th>
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((monthName, idx) => {
              const month = idx + 1;
              const row = budget[month];
              const salary = row?.salary ?? 0;
              const other = row?.otherExpenses ?? 0;
              const subsTotal = subsCostForMonth(month);
              const net = salary - subsTotal - other;
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

                  {/* Net Maaş */}
                  <EditableCell
                    value={salary}
                    onSave={(v) => updateBudget(month, "salary", v)}
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

                  {/* Net Kalan */}
                  <td className={cn(
                    "px-4 py-3 text-right tabular-nums font-semibold",
                    salary === 0 ? "text-white/20" : net >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {salary === 0 ? "—" : H(fmtTRY(net))}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {/* Toplam satırı */}
          <tfoot>
            <tr className="border-t border-white/15 bg-white/4">
              <td className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Yıllık toplam</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold">{H(fmtTRY(totalSalary))}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-red-400">{H(fmtTRY(totalSubs))}</td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-red-400">{H(fmtTRY(totalOther))}</td>
              <td className={cn("px-4 py-3 text-right tabular-nums font-bold", totalNet >= 0 ? "text-green-400" : "text-red-400")}>
                {H(fmtTRY(totalNet))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>
  );
}
