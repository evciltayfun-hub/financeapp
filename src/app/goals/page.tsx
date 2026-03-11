"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthlyGoal } from "@/lib/types";
import { MONTH_NAMES } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Save, Check } from "lucide-react";
import { toast } from "sonner";

type RowData = {
  month: number;
  netSalary: number;
  spendingTarget: number;
  besInvestment: number;
  investmentTarget: number;
  actualInvestment: number;
  remainingCash: number;
  creditCardTL: number;
  creditCardEUR: number;
  netAmount: number;
  note: string;
  isChecked: boolean;
  extraAmount: number;
  isExtraChecked: boolean;
};

function makeEmpty(month: number): RowData {
  return {
    month,
    netSalary: 0,
    spendingTarget: 0,
    besInvestment: 0,
    investmentTarget: 0,
    actualInvestment: 0,
    remainingCash: 0,
    creditCardTL: 0,
    creditCardEUR: 0,
    netAmount: 0,
    note: "",
    isChecked: false,
    extraAmount: 0,
    isExtraChecked: false,
  };
}

function goalToRow(g: MonthlyGoal): RowData {
  return {
    month: g.month,
    netSalary: g.netSalary,
    spendingTarget: g.spendingTarget,
    besInvestment: g.besInvestment,
    investmentTarget: g.investmentTarget,
    actualInvestment: g.actualInvestment,
    remainingCash: g.remainingCash,
    creditCardTL: g.creditCardTL,
    creditCardEUR: g.creditCardEUR,
    netAmount: g.netAmount,
    note: g.note ?? "",
    isChecked: g.isChecked,
    extraAmount: g.extraAmount,
    isExtraChecked: g.isExtraChecked,
  };
}

// Inline editable number cell
function NumCell({
  value,
  onChange,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setDraft(value === 0 ? "" : String(value));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    const n = parseFloat(draft);
    onChange(isNaN(n) ? 0 : n);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-full text-right bg-blue-50 dark:bg-blue-950 border border-blue-400 rounded px-1 py-0.5 text-xs font-mono outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Tab") commit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <div
      className={`text-right text-xs font-mono cursor-text hover:bg-muted/60 rounded px-1 py-0.5 select-none ${className}`}
      onClick={start}
    >
      {value === 0 ? <span className="text-muted-foreground/40">—</span> : value.toLocaleString("tr-TR")}
    </div>
  );
}

// Inline editable text cell
function TextCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const start = () => {
    setDraft(value);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commit = () => {
    onChange(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="w-full bg-blue-50 dark:bg-blue-950 border border-blue-400 rounded px-1 py-0.5 text-xs outline-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <div
      className="text-xs cursor-text hover:bg-muted/60 rounded px-1 py-0.5 select-none truncate max-w-[120px]"
      onClick={start}
      title={value}
    >
      {value || <span className="text-muted-foreground/40">—</span>}
    </div>
  );
}

export default function GoalsPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [rows, setRows] = useState<RowData[]>(() =>
    Array.from({ length: 12 }, (_, i) => makeEmpty(i + 1))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const loadGoals = useCallback(async (y: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/goals");
      const data: MonthlyGoal[] = await res.json();
      const yearData = data.filter((g) => g.year === y);
      const newRows = Array.from({ length: 12 }, (_, i) => {
        const found = yearData.find((g) => g.month === i + 1);
        return found ? goalToRow(found) : makeEmpty(i + 1);
      });
      setRows(newRows);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals(year);
  }, [year, loadGoals]);

  const updateRow = (monthIdx: number, patch: Partial<RowData>) => {
    setRows((prev) => {
      const next = [...prev];
      const updated = { ...next[monthIdx], ...patch };
      // Auto-calculate investmentTarget
      updated.investmentTarget =
        updated.netSalary - updated.spendingTarget - updated.besInvestment;
      next[monthIdx] = updated;
      return next;
    });
    setDirty(true);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const promises = rows.map((row) =>
        fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year, month: row.month, ...row }),
        })
      );
      const results = await Promise.all(promises);
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) {
        toast.error(`${failed} ay kaydedilemedi`);
      } else {
        toast.success("Tüm veriler kaydedildi");
        setDirty(false);
      }
    } catch {
      toast.error("Kaydetme başarısız");
    } finally {
      setSaving(false);
    }
  };

  // Column header style helpers
  const thPlan = "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 text-center text-xs font-semibold px-1.5 py-1 border border-purple-200 dark:border-purple-800";
  const thReal = "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 text-center text-xs font-semibold px-1.5 py-1 border border-green-200 dark:border-green-800";
  const thBase = "bg-muted text-muted-foreground text-center text-xs font-semibold px-1.5 py-1 border";

  if (loading) {
    return (
      <div className="max-w-full mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  return (
    <div className="px-2 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft size={14} />
          </Button>
          <h1 className="text-xl font-bold min-w-[80px] text-center">{year}</h1>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setYear((y) => y + 1)}>
            <ChevronRight size={14} />
          </Button>
          <span className="text-sm text-muted-foreground ml-2">Para Yönetim Planı</span>
        </div>
        <Button
          size="sm"
          onClick={saveAll}
          disabled={saving || !dirty}
          className="gap-1.5"
        >
          <Save size={13} />
          {saving ? "Kaydediliyor..." : dirty ? "Kaydet *" : "Kaydedildi"}
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border shadow-sm">
        <table className="w-full text-sm border-collapse min-w-[1100px]">
          <thead>
            <tr>
              <th className={thBase} rowSpan={2} style={{ minWidth: 70 }}>Ay</th>
              {/* PLANLANAN group */}
              <th className={thPlan} colSpan={4}>PLANLANAN</th>
              {/* GERÇEKLER group */}
              <th className={thReal} colSpan={7}>GERÇEKLER</th>
              {/* Extra */}
              <th className={thBase} colSpan={2}>EKSTRA</th>
            </tr>
            <tr>
              {/* PLANLANAN cols */}
              <th className={thPlan} style={{ minWidth: 90 }}>Net Maaş</th>
              <th className={thPlan} style={{ minWidth: 90 }}>Harcama Hedef</th>
              <th className={thPlan} style={{ minWidth: 80 }}>BES Yat.</th>
              <th className={thPlan} style={{ minWidth: 90 }}>Yatırıma Kalan</th>
              {/* GERÇEKLER cols */}
              <th className={thReal} style={{ minWidth: 90 }}>Yapılan Yatırım</th>
              <th className={thReal} style={{ minWidth: 75 }}>Yatırım Fark</th>
              <th className={thReal} style={{ minWidth: 80 }}>Kalan Nakit</th>
              <th className={thReal} style={{ minWidth: 80 }}>KK TL</th>
              <th className={thReal} style={{ minWidth: 70 }}>KK EUR</th>
              <th className={thReal} style={{ minWidth: 80 }}>NET</th>
              <th className={thReal} style={{ minWidth: 120 }}>Notlar</th>
              {/* Extra */}
              <th className={thBase} style={{ minWidth: 80 }}>Tutar</th>
              <th className={thBase} style={{ minWidth: 40 }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isCurrentMonth = year === currentYear && row.month === currentMonth;
              const investDiff = row.actualInvestment - row.investmentTarget;
              const rowBg = isCurrentMonth
                ? "bg-blue-50/60 dark:bg-blue-950/30"
                : idx % 2 === 0
                ? "bg-background"
                : "bg-muted/20";

              return (
                <tr key={row.month} className={`${rowBg} hover:bg-muted/40 transition-colors`}>
                  {/* Month label */}
                  <td className="border px-2 py-1 text-xs font-semibold text-center whitespace-nowrap">
                    {isCurrentMonth && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1 mb-0.5" />
                    )}
                    {MONTH_NAMES[idx]}
                  </td>

                  {/* PLANLANAN */}
                  <td className="border px-1 py-0.5">
                    <NumCell
                      value={row.netSalary}
                      onChange={(v) => updateRow(idx, { netSalary: v })}
                    />
                  </td>
                  <td className="border px-1 py-0.5">
                    <NumCell
                      value={row.spendingTarget}
                      onChange={(v) => updateRow(idx, { spendingTarget: v })}
                    />
                  </td>
                  <td className="border px-1 py-0.5">
                    <NumCell
                      value={row.besInvestment}
                      onChange={(v) => updateRow(idx, { besInvestment: v })}
                    />
                  </td>
                  <td className="border px-1 py-0.5 bg-purple-50/40 dark:bg-purple-950/20">
                    <div className="text-right text-xs font-mono px-1 py-0.5 font-semibold text-purple-700 dark:text-purple-300">
                      {row.investmentTarget === 0 ? (
                        <span className="text-muted-foreground/40">—</span>
                      ) : (
                        row.investmentTarget.toLocaleString("tr-TR")
                      )}
                    </div>
                  </td>

                  {/* GERÇEKLER */}
                  <td className="border px-1 py-0.5">
                    <NumCell
                      value={row.actualInvestment}
                      onChange={(v) => updateRow(idx, { actualInvestment: v })}
                    />
                  </td>
                  <td className="border px-1 py-0.5">
                    <div
                      className={`text-right text-xs font-mono px-1 py-0.5 font-semibold ${
                        row.investmentTarget === 0
                          ? "text-muted-foreground/40"
                          : investDiff >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {row.investmentTarget === 0 ? (
                        "—"
                      ) : (
                        `${investDiff >= 0 ? "+" : ""}${investDiff.toLocaleString("tr-TR")}`
                      )}
                    </div>
                  </td>
                  <td className="border px-1 py-0.5">
                    <NumCell
                      value={row.remainingCash}
                      onChange={(v) => updateRow(idx, { remainingCash: v })}
                    />
                  </td>
                  <td className="border px-1 py-0.5">
                    <NumCell
                      value={row.creditCardTL}
                      onChange={(v) => updateRow(idx, { creditCardTL: v })}
                      className={row.creditCardTL > 0 ? "text-red-600" : ""}
                    />
                  </td>
                  <td className="border px-1 py-0.5">
                    <NumCell
                      value={row.creditCardEUR}
                      onChange={(v) => updateRow(idx, { creditCardEUR: v })}
                      className={row.creditCardEUR > 0 ? "text-red-600" : ""}
                    />
                  </td>
                  <td className="border px-1 py-0.5 bg-green-50/40 dark:bg-green-950/20">
                    <NumCell
                      value={row.netAmount}
                      onChange={(v) => updateRow(idx, { netAmount: v })}
                      className={`font-semibold ${row.netAmount > 0 ? "text-green-600" : row.netAmount < 0 ? "text-red-600" : ""}`}
                    />
                  </td>
                  <td className="border px-1 py-0.5">
                    <TextCell
                      value={row.note}
                      onChange={(v) => updateRow(idx, { note: v })}
                    />
                  </td>

                  {/* Extra */}
                  <td className="border px-1 py-0.5">
                    <NumCell
                      value={row.extraAmount}
                      onChange={(v) => updateRow(idx, { extraAmount: v })}
                    />
                  </td>
                  <td className="border px-1 py-0.5 text-center">
                    <button
                      className={`w-5 h-5 rounded border flex items-center justify-center mx-auto transition-colors ${
                        row.isChecked
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-muted-foreground/30 hover:border-green-400"
                      }`}
                      onClick={() => updateRow(idx, { isChecked: !row.isChecked })}
                    >
                      {row.isChecked && <Check size={11} />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50 font-semibold border-t-2">
              <td className="border px-2 py-1.5 text-xs font-bold text-center">TOPLAM</td>
              {(
                [
                  "netSalary",
                  "spendingTarget",
                  "besInvestment",
                  "investmentTarget",
                  "actualInvestment",
                ] as const
              ).map((key) => (
                <td key={key} className="border px-1 py-1.5 text-right text-xs font-mono font-semibold">
                  {rows.reduce((s, r) => s + r[key], 0).toLocaleString("tr-TR")}
                </td>
              ))}
              {/* diff total */}
              <td className="border px-1 py-1.5 text-right text-xs font-mono font-semibold">
                {(() => {
                  const diff = rows.reduce(
                    (s, r) => s + (r.actualInvestment - r.investmentTarget),
                    0
                  );
                  return (
                    <span className={diff >= 0 ? "text-green-600" : "text-red-600"}>
                      {diff >= 0 ? "+" : ""}
                      {diff.toLocaleString("tr-TR")}
                    </span>
                  );
                })()}
              </td>
              {(["remainingCash", "creditCardTL", "creditCardEUR", "netAmount"] as const).map(
                (key) => (
                  <td key={key} className="border px-1 py-1.5 text-right text-xs font-mono font-semibold">
                    {rows.reduce((s, r) => s + r[key], 0).toLocaleString("tr-TR")}
                  </td>
                )
              )}
              <td className="border px-1 py-1.5"></td>
              <td className="border px-1 py-1.5 text-right text-xs font-mono font-semibold">
                {rows.reduce((s, r) => s + r.extraAmount, 0).toLocaleString("tr-TR")}
              </td>
              <td className="border px-1 py-1.5 text-center text-xs text-muted-foreground">
                {rows.filter((r) => r.isChecked).length}/12
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Hücreye tıklayarak düzenleme yapabilirsin. Değişiklikler <strong>Kaydet</strong> butonuyla kaydedilir.
      </p>
    </div>
  );
}
