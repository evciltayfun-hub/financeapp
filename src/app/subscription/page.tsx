"use client";

import { useEffect, useState, useMemo } from "react";
import { Pencil, Power, Plus, Tv, Cloud, Code2, ShieldCheck, Layers, Zap } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";
import { cn } from "@/lib/utils";

const HIDDEN = "••••••";

const CATEGORIES = ["Streaming", "Yazılım/SaaS", "Bulut/Depolama", "Bireysel Emeklilik", "Utilities", "Diğer"] as const;
type Category = (typeof CATEGORIES)[number];

const CAT_CONFIG: Record<Category, { color: string; bg: string; icon: React.ReactNode }> = {
  Streaming:            { color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  icon: <Tv size={14} /> },
  "Yazılım/SaaS":       { color: "#a78bfa", bg: "rgba(167,139,250,0.12)", icon: <Code2 size={14} /> },
  "Bulut/Depolama":     { color: "#34d399", bg: "rgba(52,211,153,0.12)",  icon: <Cloud size={14} /> },
  "Bireysel Emeklilik": { color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  icon: <ShieldCheck size={14} /> },
  Utilities:            { color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: <Zap size={14} /> },
  Diğer:                { color: "#9ca3af", bg: "rgba(156,163,175,0.12)", icon: <Layers size={14} /> },
};

const RATES: Record<string, number> = { "₺": 1, $: 44, "€": 48, "£": 56 };

type SortKey = "default" | "name" | "price_desc" | "price_asc";
type PeriodFilter = "all" | "monthly" | "yearly";

type Sub = {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  period: string;
  isActive: boolean;
};

type ModalForm = {
  id?: string;
  name: string;
  category: string;
  price: string;
  currency: string;
  period: string;
};

const EMPTY: ModalForm = { name: "", category: "Streaming", price: "", currency: "₺", period: "monthly" };

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

  useEffect(() => {
    fetch("/api/subscriptions")
      .then((r) => r.json())
      .then((d) => { setSubs(d); setLoading(false); });
  }, []);

  const toMonthlyTRY = (s: Sub) =>
    (s.period === "yearly" ? s.price / 12 : s.price) * (RATES[s.currency] ?? 1);

  const activeSubs = useMemo(() => subs.filter((s) => s.isActive), [subs]);
  const monthlyTotal = activeSubs.reduce((a, s) => a + toMonthlyTRY(s), 0);
  const yearlyTotal = monthlyTotal * 12;
  const monthlyOnlyTotal = activeSubs
    .filter((s) => s.period === "monthly")
    .reduce((a, s) => a + toMonthlyTRY(s), 0);

  const catTotals = activeSubs.reduce<Record<string, number>>((acc, s) => {
    acc[s.category] = (acc[s.category] ?? 0) + toMonthlyTRY(s);
    return acc;
  }, {});
  const maxCat = Math.max(...Object.values(catTotals), 1);

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
    setForm({ id: s.id, name: s.name, category: s.category, price: String(s.price), currency: s.currency, period: s.period });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.price) return;
    if (form.id) {
      const res = await fetch("/api/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: form.id, name: form.name, category: form.category, price: Number(form.price), currency: form.currency, period: form.period }),
      });
      const updated = await res.json();
      setSubs((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: Number(form.price) }),
      });
      const created = await res.json();
      setSubs((prev) => [created, ...prev]);
    }
    setForm(EMPTY);
    setModalOpen(false);
  }

  async function handleToggleActive(s: Sub) {
    const res = await fetch("/api/subscriptions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, isActive: !s.isActive }),
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
          <div className="rounded-xl border border-white/8 bg-[oklch(0.28_0_0)] p-4 space-y-4">
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

          {/* Kategori dağılımı */}
          {Object.keys(catTotals).length > 0 && (
            <div className="rounded-xl border border-white/8 bg-[oklch(0.28_0_0)] p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Kategori dağılımı</p>
              {Object.entries(catTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, val]) => {
                  const cfg = CAT_CONFIG[cat as Category] ?? CAT_CONFIG["Diğer"];
                  const pct = Math.round((val / maxCat) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: cfg.color }}>{cfg.icon}</span>
                          <span className="text-xs text-muted-foreground truncate max-w-[110px]">{cat}</span>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{H(fmtTRY(val))}</span>
                      </div>
                      <div className="bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: cfg.color }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
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
              <div className="rounded-xl border border-white/8 bg-[oklch(0.28_0_0)] py-12 text-center text-sm text-muted-foreground">
                Abonelik bulunamadı
              </div>
            )}
            {filtered.map((s) => {
              const cfg = CAT_CONFIG[s.category as Category] ?? CAT_CONFIG["Diğer"];
              const monthlyTRY = toMonthlyTRY(s);
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-[oklch(0.28_0_0)] transition-opacity group",
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
            className="bg-[oklch(0.26_0_0)] border border-white/10 rounded-2xl p-6 w-96 space-y-4 shadow-2xl"
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
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm bg-[oklch(0.26_0_0)]"
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
                  className="border border-white/10 rounded-xl px-3 py-2.5 text-sm bg-[oklch(0.26_0_0)]"
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
                    onClick={() => setForm({ ...form, period: p })}
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
