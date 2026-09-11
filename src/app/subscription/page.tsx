"use client";

import { useEffect, useState, useMemo } from "react";
import { Pencil, Power, Plus, Tv, Code2, ShieldCheck, Layers, Zap, BookOpen, Users, Dumbbell } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";
import { cn } from "@/lib/utils";

const HIDDEN = "••••••";

const CATEGORIES = ["Streaming", "Yazılım/SaaS", "Kişisel Gelişim/Eğitim", "Sosyal Medya", "Spor/Beslenme", "Bireysel Emeklilik", "Utilities", "Diğer"] as const;
type Category = (typeof CATEGORIES)[number];

const CAT_CONFIG: Record<Category, { color: string; bg: string; icon: React.ReactNode }> = {
  Streaming:                { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",   icon: <Tv size={14} /> },
  "Yazılım/SaaS":           { color: "#a78bfa", bg: "rgba(167,139,250,0.12)",  icon: <Code2 size={14} /> },
  "Kişisel Gelişim/Eğitim": { color: "#34d399", bg: "rgba(52,211,153,0.12)",   icon: <BookOpen size={14} /> },
  "Sosyal Medya":           { color: "#f472b6", bg: "rgba(244,114,182,0.12)",  icon: <Users size={14} /> },
  "Spor/Beslenme":          { color: "#fb923c", bg: "rgba(251,146,60,0.12)",   icon: <Dumbbell size={14} /> },
  "Bireysel Emeklilik":     { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",   icon: <ShieldCheck size={14} /> },
  Utilities:                { color: "#f87171", bg: "rgba(248,113,113,0.12)",  icon: <Zap size={14} /> },
  Diğer:                    { color: "#9ca3af", bg: "rgba(156,163,175,0.12)",  icon: <Layers size={14} /> },
};

const RATES: Record<string, number> = { "₺": 1, $: 44, "€": 48, "£": 56 };
const COFFEE_PRICE = 200; // TL
const COFFEE_EXCLUDED = ["Bireysel Emeklilik", "Utilities"];
const COFFEE_EXCLUDED_KEYWORDS = ["Motorsiklet", "Poliçe"];
const HISTORY_START_YM = 202601;

function getStoredCoffees(ym: number): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`coffee_${ym}`) ?? "0");
}

type SortKey = "default" | "name" | "price_desc" | "price_asc";
type PeriodFilter = "all" | "monthly" | "yearly";

const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

type Sub = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  period: string;
  paymentMonth: number | null;
  isActive: boolean;
  activatedFrom: number | null;
  deactivatedFrom: number | null;
};

type ModalForm = {
  id?: string;
  name: string;
  category: string;
  price: string;
  currency: string;
  period: string;
  paymentMonth: string;
};

const EMPTY: ModalForm = { name: "", category: "Streaming", price: "", currency: "₺", period: "monthly", paymentMonth: "" };

function fmtTRY(val: number) {
  return `₺${Math.round(val).toLocaleString("tr-TR")}`;
}

export default function SubscriptionPage() {
  const { hidden } = usePrivacy();
  const H = (val: string) => (hidden ? HIDDEN : val);

  const [subs, setSubs] = useState<Sub[]>([]);
  const [form, setForm] = useState<ModalForm>(EMPTY);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [catFilter, setCatFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [onlyActive, setOnlyActive] = useState(false);
  const [savedCoffees, setSavedCoffees] = useState(0);

  const now = new Date();
  const currentYM = now.getFullYear() * 100 + (now.getMonth() + 1);
  const [viewYM, setViewYM] = useState(currentYM);

  const viewYear = Math.floor(viewYM / 100);
  const viewMonthIdx = (viewYM % 100) - 1; // 0-indexed
  const daysInViewMonth = new Date(viewYear, viewMonthIdx + 1, 0).getDate();

  function prevYM(ym: number) {
    const m = ym % 100;
    return m === 1 ? (Math.floor(ym / 100) - 1) * 100 + 12 : ym - 1;
  }
  function nextYM(ym: number) {
    const m = ym % 100;
    return m === 12 ? (Math.floor(ym / 100) + 1) * 100 + 1 : ym + 1;
  }

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then((d) => { setSubs(d); setLoading(false); });
  }, []);

  useEffect(() => {
    setSavedCoffees(getStoredCoffees(viewYM));
  }, [viewYM]);

  function updateSaved(n: number) {
    setSavedCoffees(n);
    localStorage.setItem(`coffee_${viewYM}`, String(n));
  }

  const toMonthlyTRY = (s: Sub) =>
    (s.period === "yearly" ? s.price / 12 : s.price) * (RATES[s.currency] ?? 1);

  const activeSubs = useMemo(() => subs.filter((s) => s.isActive), [subs]);
  const monthlyTotal = activeSubs.reduce((a, s) => a + toMonthlyTRY(s), 0);
  const yearlyTotal = monthlyTotal * 12;
  const monthlyOnlyTotal = activeSubs
    .filter((s) => s.period === "monthly")
    .reduce((a, s) => a + toMonthlyTRY(s), 0);

  const coffeeBaseTotal = activeSubs
    .filter((s) => !COFFEE_EXCLUDED.includes(s.category))
    .filter((s) => !COFFEE_EXCLUDED_KEYWORDS.some((k) => s.name.includes(k)))
    .reduce((a, s) => a + toMonthlyTRY(s), 0);
  const totalSubCups = Math.ceil(coffeeBaseTotal / COFFEE_PRICE);
  const savedTRY = savedCoffees * COFFEE_PRICE;

  const historyMonths = useMemo(() => {
    const list = [];
    let ym = HISTORY_START_YM;
    while (ym <= currentYM) {
      const year = Math.floor(ym / 100);
      const month = (ym % 100) - 1;
      const days = new Date(year, month + 1, 0).getDate();
      const saved = ym === viewYM ? savedCoffees : getStoredCoffees(ym);
      list.push({ ym, month, year, saved, days, isCurrent: ym === currentYM, isView: ym === viewYM });
      const m = ym % 100;
      ym = m === 12 ? (Math.floor(ym / 100) + 1) * 100 + 1 : ym + 1;
    }
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedCoffees, viewYM]);

  const toActualTRY = (s: Sub) => s.price * (RATES[s.currency] ?? 1);

  const monthlySubs = activeSubs.filter((s) => s.period === "monthly");
  const yearlySubs  = activeSubs.filter((s) => s.period === "yearly");

  const monthlyCatTotals = monthlySubs.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + toActualTRY(s);
    return acc;
  }, {});
  const yearlyCatTotals = yearlySubs.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + toActualTRY(s);
    return acc;
  }, {});

  const monthlyGrandTotal = Object.values(monthlyCatTotals).reduce((a, b) => a + b, 0);
  const yearlyGrandTotal  = Object.values(yearlyCatTotals).reduce((a, b) => a + b, 0);
  const maxMonthlyCat = Math.max(...Object.values(monthlyCatTotals), 1);
  const maxYearlyCat  = Math.max(...Object.values(yearlyCatTotals), 1);

  const filtered = useMemo(() => {
    let list = [...subs];
    if (periodFilter !== "all") list = list.filter((s) => s.period === periodFilter);
    if (catFilter !== "all") list = list.filter((s) => s.category === catFilter);
    if (onlyActive) list = list.filter((s) => s.isActive);
    if (sortKey === "name") list.sort((a, b) => a.name.localeCompare(b.name, "tr"));
    else if (sortKey === "price_desc") list.sort((a, b) => toMonthlyTRY(b) - toMonthlyTRY(a));
    else if (sortKey === "price_asc") list.sort((a, b) => toMonthlyTRY(a) - toMonthlyTRY(b));
    return list;
  }, [subs, periodFilter, catFilter, onlyActive, sortKey]);

  function openAdd() { setForm(EMPTY); setModalOpen(true); }
  function openEdit(s: Sub) {
    setForm({ id: s.id, name: s.name, category: s.category, price: String(s.price), currency: s.currency, period: s.period, paymentMonth: s.paymentMonth ? String(s.paymentMonth) : "" });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.price) return;
    if (form.id) {
      const res = await fetch("/api/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id, name: form.name, category: form.category, price: Number(form.price), currency: form.currency, period: form.period, paymentMonth: form.period === "yearly" && form.paymentMonth ? Number(form.paymentMonth) : null }),
      });
      const updated = await res.json();
      setSubs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price), paymentMonth: form.period === "yearly" && form.paymentMonth ? Number(form.paymentMonth) : null }),
      });
      const created = await res.json();
      setSubs((prev) => [created, ...prev]);
    }
    setForm(EMPTY);
    setModalOpen(false);
  }

  async function handleToggleActive(s: Sub) {
    const now = new Date();
    const ym = now.getFullYear() * 100 + (now.getMonth() + 1);
    const willBeActive = !s.isActive;
    const payload = willBeActive
      ? { id: s.id, isActive: true, activatedFrom: ym, deactivatedFrom: null }
      : { id: s.id, isActive: false, deactivatedFrom: ym };
      // Note: activatedFrom is intentionally NOT cleared on deactivation
    const res = await fetch("/api/subscriptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await res.json();
    setSubs((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/subscriptions?id=${id}`, { method: "DELETE" });
    setSubs((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex items-center justify-center">
        <div className="text-muted-foreground text-sm">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Abonelikler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{activeSubs.length} aktif · {subs.length} toplam</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
        >
          <Plus size={14} />
          Yeni ekle
        </button>
      </div>

      {/* Ana layout: sol panel + sağ liste */}
      <div className="flex gap-6 items-start">

        {/* SOL: özet + kategori dağılımı */}
        <div className="w-72 shrink-0 space-y-4">
          {/* Özet kartlar */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Aylık ödemeler</p>
              <p className="text-2xl font-bold">{H(fmtTRY(monthlyOnlyTotal))}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Sadece aylık üyelikler</p>
            </div>
            <div className="border-t border-white/6 pt-4">
              <p className="text-xs text-muted-foreground mb-1">Aylık eşdeğer</p>
              <p className="text-2xl font-bold">{H(fmtTRY(monthlyTotal))}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">Yıllıklar dahil (÷12)</p>
            </div>
            <div className="border-t border-white/6 pt-4">
              <p className="text-xs text-muted-foreground mb-1">Yıllık toplam</p>
              <p className="text-2xl font-bold">{H(fmtTRY(yearlyTotal))}</p>
            </div>
          </div>

          {/* Kategori dağılımı — aylık + yıllık */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ödeme Dağılımı</p>

            {/* Aylık ödemeler */}
            {Object.keys(monthlyCatTotals).length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-blue-400/70 uppercase tracking-wider">Aylık</p>
                {Object.entries(monthlyCatTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
                  const cfg = CAT_CONFIG[cat as Category] ?? CAT_CONFIG["Diğer"];
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: cfg.color }}>{cfg.icon}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">{cat}</span>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{H(fmtTRY(val))}</span>
                      </div>
                      <div className="bg-white/5 rounded-full h-1 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.round((val / maxMonthlyCat) * 100)}%`, background: cfg.color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-1 border-t border-white/6">
                  <span className="text-[10px] text-muted-foreground/60">Aylık toplam</span>
                  <span className="text-sm font-bold tabular-nums">{H(fmtTRY(monthlyGrandTotal))}</span>
                </div>
              </div>
            )}

            {/* Yıllık ödemeler (tek seferlik) */}
            {Object.keys(yearlyCatTotals).length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/6">
                <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider">Yıllık (tek ödeme)</p>
                {Object.entries(yearlyCatTotals).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
                  const cfg = CAT_CONFIG[cat as Category] ?? CAT_CONFIG["Diğer"];
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: cfg.color }}>{cfg.icon}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">{cat}</span>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{H(fmtTRY(val))}</span>
                      </div>
                      <div className="bg-white/5 rounded-full h-1 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.round((val / maxYearlyCat) * 100)}%`, background: cfg.color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between items-center pt-1 border-t border-white/6">
                  <span className="text-[10px] text-muted-foreground/60">Yıllık toplam</span>
                  <span className="text-sm font-bold tabular-nums">{H(fmtTRY(yearlyGrandTotal))}</span>
                </div>
              </div>
            )}

            {/* Genel toplam */}
            <div className="space-y-1.5 pt-2 border-t border-white/6">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Aylık × 12</span>
                <span className="tabular-nums text-muted-foreground">{H(fmtTRY(monthlyGrandTotal * 12))}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Yıllık (tek ödemeler)</span>
                <span className="tabular-nums text-muted-foreground">{H(fmtTRY(yearlyGrandTotal))}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-white/6">
                <span>Genel yıllık</span>
                <span className="tabular-nums">{H(fmtTRY(monthlyGrandTotal * 12 + yearlyGrandTotal))}</span>
              </div>
            </div>
          </div>
          {/* Kahve Hesabı */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {/* Başlık + navigasyon */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">☕ Kahve Hesabı</p>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => viewYM > HISTORY_START_YM && setViewYM(prevYM(viewYM))}
                  disabled={viewYM <= HISTORY_START_YM}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >‹</button>
                <span className="text-xs font-semibold">
                  {MONTHS[viewMonthIdx]} {viewYear}
                  {viewYM === currentYM && <span className="ml-1.5 text-[9px] text-amber-400/70 font-normal">bu ay</span>}
                </span>
                <button
                  onClick={() => viewYM < currentYM && setViewYM(nextYM(viewYM))}
                  disabled={viewYM >= currentYM}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/8 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                >›</button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
                1 ☕ = ₺{COFFEE_PRICE} · Bu ay içmediğin kahveleri seç ({daysInViewMonth} gün)
              </p>
            </div>

            {/* İnteraktif kahve seçici — gün sayısı kadar kupa */}
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: daysInViewMonth }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => updateSaved(savedCoffees === i + 1 ? 0 : i + 1)}
                  title={`${i + 1} kahve = ${fmtTRY((i + 1) * COFFEE_PRICE)}`}
                  className={cn(
                    "text-sm leading-none transition-all hover:scale-125 active:scale-110",
                    i < savedCoffees ? "opacity-100 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]" : "opacity-20 hover:opacity-60"
                  )}
                >
                  ☕
                </button>
              ))}
            </div>

            {/* İstatistikler */}
            <div className="space-y-2 pt-2 border-t border-white/6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Abonelikler (baz)</span>
                <span className="tabular-nums">{totalSubCups} ☕ = {H(fmtTRY(coffeeBaseTotal))}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">İçmediğin</span>
                <span className={cn("tabular-nums font-medium", savedCoffees > 0 ? "text-amber-400" : "text-muted-foreground/50")}>
                  {savedCoffees} ☕ = {H(fmtTRY(savedTRY))}
                </span>
              </div>
              {savedCoffees > 0 && (
                <>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round((savedTRY / coffeeBaseTotal) * 100))}%`,
                        background: savedTRY >= coffeeBaseTotal ? "#4ade80" : "#fbbf24",
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-center font-medium" style={{ color: savedTRY >= coffeeBaseTotal ? "#4ade80" : "#fbbf24" }}>
                    {savedTRY >= coffeeBaseTotal
                      ? `Tüm abonelikleri karşıladın! 🎉`
                      : `Aboneliklerin %${Math.round((savedTRY / coffeeBaseTotal) * 100)}'ini karşıladın`}
                  </p>
                </>
              )}
            </div>

            {/* Aylık geçmiş — Oca 2026'dan itibaren */}
            <div className="pt-2 border-t border-white/6 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-2">Aylara Göre</p>
              {historyMonths.map(({ ym, month, year, saved, days, isCurrent, isView }) => {
                const pct = totalSubCups > 0 ? Math.min(100, Math.round((saved / totalSubCups) * 100)) : 0;
                const isCurrentYear = year === now.getFullYear();
                const barColor = saved >= totalSubCups ? "#4ade80" : isView ? "#fbbf24" : "#60a5fa";
                return (
                  <button
                    key={ym}
                    onClick={() => setViewYM(ym)}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors",
                      isView ? "bg-white/6" : "hover:bg-white/4",
                      !isCurrent && !isView && "opacity-60"
                    )}
                  >
                    <span className="text-[10px] w-10 shrink-0 text-left text-muted-foreground">
                      {MONTHS[month].slice(0, 3)}{!isCurrentYear && ` '${String(year).slice(2)}`}
                    </span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <span className="text-[10px] tabular-nums text-muted-foreground w-10 text-right shrink-0">
                      {saved > 0 ? `${saved}/${days}` : "—"}
                    </span>
                    {pct > 0 && (
                      <span className="text-[10px] tabular-nums w-6 text-right shrink-0" style={{ color: barColor }}>
                        %{pct}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Baz notları */}
            <div className="rounded-lg bg-white/4 border border-white/6 px-3 py-2 space-y-1">
              <p className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider mb-1.5">Baz hesabına dahil değil</p>
              <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-yellow-400/50 shrink-0 inline-block" />
                Bireysel Emeklilik <span className="text-muted-foreground/30">(kategori)</span>
              </p>
              <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400/50 shrink-0 inline-block" />
                Utilities <span className="text-muted-foreground/30">(kategori)</span>
              </p>
              <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-white/30 shrink-0 inline-block" />
                Motorsiklet içeren abonelikler
              </p>
              <p className="text-[10px] text-muted-foreground/50 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-white/30 shrink-0 inline-block" />
                Poliçe içeren abonelikler
              </p>
            </div>
          </div>
        </div>

        {/* SAĞ: filtreler + liste */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Filtreler */}
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "monthly", "yearly"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setPeriodFilter(v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  periodFilter === v ? "bg-white text-black" : "bg-white/6 text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                {v === "all" ? "Tümü" : v === "monthly" ? "Aylık" : "Yıllık"}
              </button>
            ))}
            <div className="w-px h-4 bg-white/10 mx-1" />
            {["all", ...CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  catFilter === c ? "bg-white text-black" : "bg-white/6 text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                {c === "all" ? "Tümü" : c}
              </button>
            ))}
            <div className="flex-1" />
            <button
              onClick={() => setOnlyActive(!onlyActive)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                onlyActive ? "bg-white text-black" : "bg-white/6 text-muted-foreground hover:text-foreground hover:bg-white/10"
              )}
            >
              Sadece aktif
            </button>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-xs border border-white/10 rounded-lg px-2 py-1.5 bg-white/6 text-muted-foreground"
            >
              <option value="default">Son eklenen</option>
              <option value="name">Ad (A-Z)</option>
              <option value="price_desc">Fiyat ↓</option>
              <option value="price_asc">Fiyat ↑</option>
            </select>
          </div>

          {/* Liste */}
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="rounded-xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
                Abonelik bulunamadı
              </div>
            )}
            {filtered.map((s) => {
              const cfg = CAT_CONFIG[s.category as Category] ?? CAT_CONFIG["Diğer"];
              const monthlyTRY = toMonthlyTRY(s);
              const cups = Math.ceil(monthlyTRY / COFFEE_PRICE);
              const displayCups = Math.min(cups, 10);
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card transition-opacity group",
                    !s.isActive && "opacity-40"
                  )}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: cfg.bg, color: cfg.color }}
                  >
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                        {s.category}
                      </span>
                      <span>·</span>
                      <span>{s.period === "monthly" ? "Aylık" : "Yıllık"}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">
                      {H(`${s.currency}${s.price.toLocaleString("tr-TR")}`)}
                      <span className="text-xs text-muted-foreground font-normal ml-1">/{s.period === "monthly" ? "ay" : "yıl"}</span>
                    </p>
                    {s.period === "yearly" && (
                      <p className="text-xs text-muted-foreground tabular-nums">{H(fmtTRY(monthlyTRY))}/ay</p>
                    )}
                    <p className="text-[11px] text-amber-400/60 mt-0.5 tracking-wide">
                      {"☕".repeat(displayCups)}{cups > 10 ? ` +${cups - 10}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(s)} title="Düzenle" className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(s)}
                      title={s.isActive ? "Deaktif et" : "Aktif et"}
                      className={cn("p-1.5 rounded-lg transition-colors", s.isActive ? "text-green-400 hover:text-green-300 hover:bg-white/8" : "text-muted-foreground hover:text-foreground hover:bg-white/8")}
                    >
                      <Power size={13} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-white/8 transition-colors text-xs">✕</button>
                  </div>
                </div>
              );
            })}

            {filtered.length > 0 && (
              <button
                onClick={openAdd}
                className="w-full py-3 rounded-xl border border-dashed border-white/15 text-sm text-muted-foreground hover:bg-white/4 hover:border-white/25 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                Yeni abonelik ekle
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-card border border-white/10 rounded-2xl p-6 w-96 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold">{form.id ? "Aboneliği düzenle" : "Yeni abonelik"}</h3>

            <div className="space-y-3">
              <input
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm bg-white/5 placeholder:text-muted-foreground focus:outline-none focus:border-white/25"
                placeholder="Servis adı (örn. Netflix, Figma)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />

              <select
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm bg-background"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  className="col-span-2 border border-white/10 rounded-xl px-4 py-2.5 text-sm bg-white/5 placeholder:text-muted-foreground focus:outline-none focus:border-white/25"
                  placeholder="Tutar"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
                <select
                  className="border border-white/10 rounded-xl px-3 py-2.5 text-sm bg-background"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {["₺", "$", "€", "£"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["monthly", "yearly"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setForm({ ...form, period: p, paymentMonth: "" })}
                    className={cn(
                      "py-2.5 rounded-xl text-sm font-medium transition-colors border",
                      form.period === p
                        ? "bg-white text-black border-white"
                        : "border-white/10 text-muted-foreground hover:bg-white/8"
                    )}
                  >
                    {p === "monthly" ? "Aylık" : "Yıllık"}
                  </button>
                ))}
              </div>

              {form.period === "yearly" && (
                <select
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm bg-background"
                  value={form.paymentMonth}
                  onChange={(e) => setForm({ ...form, paymentMonth: e.target.value })}
                >
                  <option value="">Ödeme ayı seç (opsiyonel)</option>
                  {MONTHS.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 text-sm border border-white/10 rounded-xl text-muted-foreground hover:bg-white/6 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 text-sm rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors"
              >
                {form.id ? "Kaydet" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
