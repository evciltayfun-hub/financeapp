"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Check, X, MapPin, Calendar, Clock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───
interface TripExpense {
  id: string;
  tripId: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  isPaid: boolean;
  date: string | null;
  savingsAmount: number;
  savingsNote: string | null;
  savingsData: string | null;
  paymentMethod: string;
  createdAt: string;
}

interface TripPlan {
  id: string;
  title: string;
  destination: string;
  startDate: string | null;
  endDate: string | null;
  status: "draft" | "planned" | "completed";
  totalBudget: number | null;
  currency: string;
  notes: string | null;
  expenses: TripExpense[];
  createdAt: string;
}

// ─── Config ───
const CATEGORIES = [
  { key: "uçak",      label: "Uçak & Transfer",  emoji: "✈️",  cls: "border-sky-400    bg-sky-400/10    text-sky-300"    },
  { key: "konaklama", label: "Konaklama",          emoji: "🏨", cls: "border-violet-400 bg-violet-400/10 text-violet-300" },
  { key: "yeme-içme", label: "Yeme & İçme",        emoji: "🍽️", cls: "border-orange-400 bg-orange-400/10 text-orange-300" },
  { key: "aktivite",  label: "Aktiviteler",        emoji: "🎯", cls: "border-emerald-400 bg-emerald-400/10 text-emerald-300" },
  { key: "ulaşım",    label: "Yerel Ulaşım",       emoji: "🚌", cls: "border-cyan-400   bg-cyan-400/10   text-cyan-300"   },
  { key: "alışveriş", label: "Alışveriş",           emoji: "🛍️", cls: "border-pink-400   bg-pink-400/10   text-pink-300"   },
  { key: "sağlık",    label: "Sağlık & Sigorta",   emoji: "💊", cls: "border-red-400    bg-red-400/10    text-red-300"    },
  { key: "diğer",     label: "Diğer",               emoji: "📋", cls: "border-slate-400  bg-slate-400/10  text-slate-300"  },
];

function getCat(key: string) {
  return CATEGORIES.find(c => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

const STATUS_CONF = {
  draft:     { label: "Taslak",     cls: "bg-slate-500/20  text-slate-300  border-slate-500/40"  },
  planned:   { label: "Planlandı",  cls: "bg-blue-500/20   text-blue-300   border-blue-500/40"   },
  completed: { label: "Tamamlandı", cls: "bg-green-500/20  text-green-300  border-green-500/40"  },
} as const;

const CURRENCIES = ["TRY", "USD", "EUR", "GBP"];

// ─── Helpers ───
function fmtTL(n: number) {
  return "₺" + Math.round(n).toLocaleString("tr-TR");
}
function fmtAmt(amount: number, currency: string) {
  const sym: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€", GBP: "£" };
  return (sym[currency] ?? "") + amount.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T12:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}
function daysBetween(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
}
function daysUntil(start: string | null): number | null {
  if (!start) return null;
  return Math.round((new Date(start).getTime() - new Date().getTime()) / 86400000);
}

// ─── Modal ───
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/15 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 sticky top-0 bg-slate-900">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Form types ───
type TripFormData = {
  title: string; destination: string; startDate: string; endDate: string;
  status: "draft" | "planned" | "completed"; totalBudget: string; currency: string; notes: string;
};
type ExpFormData = {
  category: string; description: string; amount: string; currency: string; isPaid: boolean; date: string;
  savingsAmount: string; savingsNote: string; savingsData: string; paymentMethod: string;
};

const EMPTY_TRIP: TripFormData = { title: "", destination: "", startDate: "", endDate: "", status: "planned", totalBudget: "", currency: "TRY", notes: "" };
const EMPTY_EXP:  ExpFormData  = { category: "uçak", description: "", amount: "", currency: "TRY", isPaid: false, date: "", savingsAmount: "", savingsNote: "", savingsData: "", paymentMethod: "nakit" };

// ─── TripForm ───
function TripForm({ form, setForm, onSubmit, onCancel }: {
  form: TripFormData; setForm: (f: TripFormData) => void; onSubmit: () => void; onCancel: () => void;
}) {
  const inp = "w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 transition-colors";
  const lbl = "block text-xs text-white/50 mb-1";
  return (
    <div className="space-y-3">
      <div>
        <label className={lbl}>Başlık *</label>
        <input className={inp} placeholder="İtalya Tatili 2026" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <label className={lbl}>Destinasyon *</label>
        <input className={inp} placeholder="Roma, Floransa, İtalya" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Başlangıç Tarihi</label>
          <input type="date" className={inp} value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Bitiş Tarihi</label>
          <input type="date" className={inp} value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Durum</label>
          <select className={inp} value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TripFormData["status"] })}>
            <option value="draft">Taslak</option>
            <option value="planned">Planlandı</option>
            <option value="completed">Tamamlandı</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Bütçe Para Birimi</label>
          <select className={inp} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={lbl}>Toplam Bütçe ({form.currency})</label>
        <input type="number" className={inp} placeholder="0" value={form.totalBudget} onChange={e => setForm({ ...form, totalBudget: e.target.value })} />
      </div>
      <div>
        <label className={lbl}>Notlar</label>
        <textarea className={cn(inp, "resize-none h-20")} placeholder="..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">İptal</button>
        <button onClick={onSubmit} disabled={!form.title || !form.destination} className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white rounded-lg transition-colors">Kaydet</button>
      </div>
    </div>
  );
}

// "daily" = price × gün (sadece konaklama yemekleri), "flat" = tekil fiyat
type IncItem = { label: string; price: string; type: "flat" | "daily"; checked: boolean };

const CATEGORY_INCLUSIONS: Record<string, { label: string; type: "flat" | "daily"; default: number }[]> = {
  "konaklama": [
    { label: "Kahvaltı",     type: "daily", default: 150 },
    { label: "Öğle Yemeği",  type: "daily", default: 250 },
    { label: "Akşam Yemeği", type: "daily", default: 350 },
    { label: "Gym",          type: "flat",  default: 0   },
    { label: "Havuz",        type: "flat",  default: 0   },
    { label: "Spa",          type: "flat",  default: 0   },
    { label: "Transfer",     type: "flat",  default: 0   },
    { label: "Otopark",      type: "flat",  default: 0   },
    { label: "WiFi",         type: "flat",  default: 0   },
  ],
  "uçak": [
    { label: "Bagaj",         type: "flat", default: 0 },
    { label: "Lounge",        type: "flat", default: 0 },
    { label: "Yemek",         type: "flat", default: 0 },
    { label: "Koltuk Seçimi", type: "flat", default: 0 },
  ],
  "aktivite": [
    { label: "Rehber",   type: "flat", default: 0 },
    { label: "Ekipman",  type: "flat", default: 0 },
    { label: "Ulaşım",   type: "flat", default: 0 },
    { label: "Sigorta",  type: "flat", default: 0 },
  ],
  "ulaşım": [
    { label: "Bagaj",   type: "flat", default: 0 },
    { label: "Sigorta", type: "flat", default: 0 },
  ],
  "alışveriş": [
    { label: "İndirim", type: "flat", default: 0 },
    { label: "Kupon",   type: "flat", default: 0 },
  ],
  "sağlık": [
    { label: "Muayene", type: "flat", default: 0 },
    { label: "İlaç",    type: "flat", default: 0 },
  ],
  "yeme-içme": [],
  "diğer":     [],
};

function buildIncItems(category: string, savingsData: string | null): IncItem[] {
  if (savingsData) {
    try {
      const p = JSON.parse(savingsData);
      if (Array.isArray(p.items)) return p.items as IncItem[];
    } catch {}
  }
  return (CATEGORY_INCLUSIONS[category] ?? []).map(d => ({
    label: d.label, price: d.default > 0 ? d.default.toString() : "", type: d.type, checked: false,
  }));
}

// ─── ExpenseForm ───
function ExpenseForm({ form, setForm, onSubmit, onCancel, tripDays }: {
  form: ExpFormData; setForm: React.Dispatch<React.SetStateAction<ExpFormData>>; onSubmit: () => void; onCancel: () => void; tripDays: number | null;
}) {
  const inp = "w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 transition-colors";
  const lbl = "block text-xs text-white/50 mb-1";

  const isHotel = form.category === "konaklama";
  const catDefs = CATEGORY_INCLUSIONS[form.category] ?? [];

  const [incItems, setIncItems] = useState<IncItem[]>(() => buildIncItems(form.category, form.savingsData));
  const [incDays, setIncDays] = useState<string>(() => {
    if (form.savingsData) {
      try { return JSON.parse(form.savingsData).days ?? tripDays?.toString() ?? "1"; } catch {}
    }
    return tripDays?.toString() ?? "1";
  });
  const [mealPerMeal, setMealPerMeal] = useState("");
  const [mealCount, setMealCount] = useState("3");
  const [prevCat, setPrevCat] = useState(form.category);

  // Reset inclusions when category changes
  if (form.category !== prevCat) {
    setPrevCat(form.category);
    const fresh = buildIncItems(form.category, null);
    setIncItems(fresh);
    setForm({ ...form, savingsAmount: "", savingsNote: "", savingsData: "" });
  }

  function calcTotal(items: IncItem[], days: string) {
    return items.filter(i => i.checked).reduce((s, i) => {
      const p = parseFloat(i.price) || 0;
      return s + (i.type === "daily" ? p * (parseInt(days) || 1) : p);
    }, 0);
  }

  function syncSavings(items: IncItem[], days: string) {
    const total = calcTotal(items, days);
    const note  = items.filter(i => i.checked).map(i => i.label).join(", ");
    const data  = JSON.stringify({ days, items });
    setForm(f => ({ ...f, savingsAmount: total > 0 ? total.toString() : "", savingsNote: note, savingsData: data }));
  }

  function toggleItem(label: string) {
    const updated = incItems.map(i => i.label === label ? { ...i, checked: !i.checked } : i);
    setIncItems(updated);
    syncSavings(updated, incDays);
  }

  function updatePrice(label: string, value: string) {
    const updated = incItems.map(i => i.label === label ? { ...i, price: value } : i);
    setIncItems(updated);
    syncSavings(updated, incDays);
  }

  function updateIncDays(days: string) {
    setIncDays(days);
    syncSavings(incItems, days);
  }

  const totalSavings = calcTotal(incItems, incDays);

  function applyMealCalc() {
    const total = (parseFloat(mealPerMeal) || 0) * (parseInt(mealCount) || 0) * (parseInt(incDays) || 1);
    if (total > 0) setForm(f => ({ ...f, amount: total.toString() }));
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={lbl}>Kategori</label>
        <select className={inp} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
        </select>
      </div>
      <div>
        <label className={lbl}>Açıklama *</label>
        <input className={inp} placeholder="İstanbul → Roma uçak bileti" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>

      {/* Meal calculator — only for yeme-içme */}
      {form.category === "yeme-içme" && (
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-3">
          <div className="text-xs font-medium text-orange-300 mb-2">🍽️ Öğün Hesaplayıcı</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className={lbl}>Öğün başı (₺)</label>
              <input type="number" className={inp} placeholder="200" value={mealPerMeal} onChange={e => setMealPerMeal(e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Günlük öğün sayısı</label>
              <input type="number" className={inp} placeholder="3" value={mealCount} onChange={e => setMealCount(e.target.value)} />
              <p className="text-xs text-white/30 mt-0.5">Kahvaltı dahilse 2 gir</p>
            </div>
          </div>
          {mealPerMeal && mealCount && incDays && (
            <div className="flex items-center justify-between bg-orange-500/10 rounded px-2 py-1.5">
              <span className="text-xs text-white/50">
                {mealCount} öğün × ₺{mealPerMeal} × {incDays} gün =&nbsp;
                <span className="text-white font-semibold">
                  ₺{((parseFloat(mealPerMeal)||0)*(parseInt(mealCount)||0)*(parseInt(incDays)||1)).toLocaleString("tr-TR")}
                </span>
              </span>
              <button onClick={applyMealCalc} type="button"
                className="text-xs font-medium text-orange-400 hover:text-orange-300 transition-colors ml-2">
                Tutara Uygula →
              </button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Tutar *</label>
          <input type="number" className={inp} placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Para Birimi</label>
          <select className={inp} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={lbl}>Tarih (isteğe bağlı)</label>
        <input type="date" className={inp} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
      </div>

      {/* Savings / Inclusions */}
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between bg-white/5 px-3 py-2 border-b border-white/10">
          <span className="text-xs font-medium text-white/70">🎁 Tasarruf</span>
          {isHotel && (
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <span>Konaklama süresi (gün):</span>
              <input type="number" value={incDays} onChange={e => updateIncDays(e.target.value)}
                placeholder={tripDays?.toString() ?? "1"}
                className="w-12 bg-white/5 border border-white/15 rounded px-1.5 py-0.5 text-center text-white text-xs focus:outline-none focus:border-blue-400 transition-colors" />
            </div>
          )}
        </div>

        {catDefs.length > 0 ? (
          <div className="p-2 space-y-1">
            {incItems.map(item => {
              const p = parseFloat(item.price) || 0;
              const lineTotal = item.type === "daily" ? p * (parseInt(incDays) || 1) : p;
              return (
                <div key={item.label} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-white/3 transition-colors">
                  <button type="button" onClick={() => toggleItem(item.label)}
                    className={cn("w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                      item.checked ? "bg-green-500 border-green-500" : "border-white/25 hover:border-green-400")}>
                    {item.checked && <Check size={9} className="text-white" />}
                  </button>
                  <span className={cn("text-sm flex-1 transition-colors", item.checked ? "text-white" : "text-white/40")}>
                    {item.label}
                  </span>
                  <div className="flex items-center gap-1 text-xs">
                    <input type="number" value={item.price} onChange={e => updatePrice(item.label, e.target.value)}
                      className={cn("w-16 bg-white/5 border rounded px-1.5 py-0.5 text-right text-xs focus:outline-none transition-colors",
                        item.checked ? "border-white/20 text-white focus:border-green-400" : "border-white/10 text-white/25")} />
                    <span className="text-white/30">
                      {item.type === "daily" ? `₺/g × ${incDays}g` : "₺"}
                    </span>
                  </div>
                  <span className={cn("text-xs w-20 text-right tabular-nums transition-colors",
                    item.checked ? "text-green-400 font-medium" : "text-white/20")}>
                    = ₺{lineTotal.toLocaleString("tr-TR")}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          /* Manual savings input for yeme-içme / diğer */
          <div className="p-3 space-y-2">
            <div>
              <label className={lbl}>Tasarruf notu (isteğe bağlı)</label>
              <input className={inp} placeholder="örn. promosyon, indirim…" value={form.savingsNote}
                onChange={e => setForm({ ...form, savingsNote: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Tasarruf tutarı (₺)</label>
              <input type="number" className={inp} placeholder="0" value={form.savingsAmount}
                onChange={e => setForm({ ...form, savingsAmount: e.target.value })} />
            </div>
          </div>
        )}

        {totalSavings > 0 && catDefs.length > 0 && (
          <div className="flex items-center justify-between bg-green-500/10 border-t border-green-500/20 px-3 py-2">
            <span className="text-xs text-green-400">
              Toplam Tasarruf{isHotel ? ` (${incDays} gün)` : ""}
            </span>
            <span className="text-sm font-bold text-green-300">₺{Math.round(totalSavings).toLocaleString("tr-TR")}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setForm({ ...form, isPaid: !form.isPaid })}
            className={cn("w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors",
              form.isPaid ? "bg-green-500 border-green-500" : "border-white/30 hover:border-green-400")}>
            {form.isPaid && <Check size={11} className="text-white" />}
          </button>
          <span className="text-sm text-white/70">Ödendi</span>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button type="button"
            onClick={() => setForm({ ...form, paymentMethod: "nakit" })}
            className={cn("px-2.5 py-1 rounded-l-lg border text-xs font-medium transition-colors",
              form.paymentMethod === "nakit"
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300"
                : "bg-white/5 border-white/15 text-white/40 hover:text-white/70")}>
            💵 Nakit
          </button>
          <button type="button"
            onClick={() => setForm({ ...form, paymentMethod: "kredi kartı" })}
            className={cn("px-2.5 py-1 rounded-r-lg border-t border-r border-b text-xs font-medium transition-colors",
              form.paymentMethod === "kredi kartı"
                ? "bg-blue-500/20 border-blue-500/50 text-blue-300"
                : "bg-white/5 border-white/15 text-white/40 hover:text-white/70")}>
            💳 Kredi Kartı
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">İptal</button>
        <button onClick={onSubmit} disabled={!form.description || !form.amount}
          className="px-4 py-2 text-sm bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white rounded-lg transition-colors">
          Kaydet
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function PlannerPage() {
  const [trips,      setTrips]      = useState<TripPlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter,     setFilter]     = useState<"all" | "draft" | "planned" | "completed">("all");
  const [catFilter,  setCatFilter]  = useState("all");
  const [usdTry,     setUsdTry]     = useState(35);
  const [eurTry,     setEurTry]     = useState(38);

  const [tripModal,     setTripModal]     = useState<"add" | "edit" | null>(null);
  const [expModal,      setExpModal]      = useState<"add" | "edit" | null>(null);
  const [tripForm,      setTripForm]      = useState<TripFormData>(EMPTY_TRIP);
  const [expForm,       setExpForm]       = useState<ExpFormData>(EMPTY_EXP);
  const [editingExpId,  setEditingExpId]  = useState<string | null>(null);

  const selectedTrip = trips.find(t => t.id === selectedId) ?? null;

  const toTry = useCallback((amount: number, currency: string): number => {
    if (currency === "TRY") return amount;
    if (currency === "USD") return amount * usdTry;
    if (currency === "EUR") return amount * eurTry;
    if (currency === "GBP") return amount * eurTry * 1.18;
    return amount;
  }, [usdTry, eurTry]);

  // Fetch exchange rates
  useEffect(() => {
    fetch("/api/market")
      .then(r => r.json())
      .then((items: { label: string; price: number | null }[]) => {
        const usd = items.find(i => i.label === "USD/TRY")?.price;
        const eur = items.find(i => i.label === "EUR/TRY")?.price;
        if (usd) setUsdTry(usd);
        if (eur) setEurTry(eur);
      }).catch(() => {});
  }, []);

  const fetchTrips = useCallback(async () => {
    const r = await fetch("/api/trips");
    if (!r.ok) return;
    const data: TripPlan[] = await r.json();
    setTrips(data);
    if (!selectedId && data.length > 0) setSelectedId(data[0].id);
  }, [selectedId]);

  useEffect(() => { fetchTrips(); }, []); // eslint-disable-line

  // Stats
  function getStats(trip: TripPlan) {
    const total    = trip.expenses.reduce((s, e) => s + toTry(e.amount, e.currency), 0);
    const paid     = trip.expenses.filter(e => e.isPaid).reduce((s, e) => s + toTry(e.amount, e.currency), 0);
    const savings  = trip.expenses.reduce((s, e) => s + (e.savingsAmount ?? 0), 0);
    const budget   = trip.totalBudget ? toTry(trip.totalBudget, trip.currency) : null;
    const remaining = budget !== null ? budget - total : null;
    const pct      = budget && budget > 0 ? Math.min(100, (total / budget) * 100) : 0;
    return { total, paid, savings, budget, remaining, pct };
  }

  function getCatTotals(trip: TripPlan) {
    return trip.expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + toTry(e.amount, e.currency);
      return acc;
    }, {} as Record<string, number>);
  }

  // CRUD – Trips
  async function createTrip() {
    const r = await fetch("/api/trips", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...tripForm, totalBudget: tripForm.totalBudget ? parseFloat(tripForm.totalBudget) : null, startDate: tripForm.startDate || null, endDate: tripForm.endDate || null }),
    });
    if (r.ok) {
      const t: TripPlan = await r.json();
      await fetchTrips();
      setSelectedId(t.id);
      setTripModal(null);
      setTripForm(EMPTY_TRIP);
    }
  }

  async function updateTrip() {
    if (!selectedId) return;
    await fetch(`/api/trips/${selectedId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...tripForm, totalBudget: tripForm.totalBudget ? parseFloat(tripForm.totalBudget) : null, startDate: tripForm.startDate || null, endDate: tripForm.endDate || null }),
    });
    await fetchTrips();
    setTripModal(null);
  }

  async function deleteTrip(id: string) {
    if (!confirm("Bu geziyi silmek istiyor musunuz?")) return;
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    setSelectedId(trips.find(t => t.id !== id)?.id ?? null);
    await fetchTrips();
  }

  function openEditTrip() {
    if (!selectedTrip) return;
    setTripForm({
      title: selectedTrip.title, destination: selectedTrip.destination,
      startDate: selectedTrip.startDate ?? "", endDate: selectedTrip.endDate ?? "",
      status: selectedTrip.status, totalBudget: selectedTrip.totalBudget?.toString() ?? "",
      currency: selectedTrip.currency, notes: selectedTrip.notes ?? "",
    });
    setTripModal("edit");
  }

  // CRUD – Expenses
  async function createExpense() {
    if (!selectedId) return;
    await fetch(`/api/trips/${selectedId}/expenses`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...expForm, amount: parseFloat(expForm.amount), date: expForm.date || null, savingsAmount: parseFloat(expForm.savingsAmount) || 0, savingsNote: expForm.savingsNote || null, savingsData: expForm.savingsData || null, paymentMethod: expForm.paymentMethod }),
    });
    await fetchTrips();
    setExpModal(null);
    setExpForm(EMPTY_EXP);
  }

  async function updateExpense() {
    if (!selectedId || !editingExpId) return;
    await fetch(`/api/trips/${selectedId}/expenses/${editingExpId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...expForm, amount: parseFloat(expForm.amount), date: expForm.date || null, savingsAmount: parseFloat(expForm.savingsAmount) || 0, savingsNote: expForm.savingsNote || null, savingsData: expForm.savingsData || null, paymentMethod: expForm.paymentMethod }),
    });
    await fetchTrips();
    setExpModal(null);
    setEditingExpId(null);
  }

  async function deleteExpense(expId: string) {
    if (!selectedId) return;
    await fetch(`/api/trips/${selectedId}/expenses/${expId}`, { method: "DELETE" });
    await fetchTrips();
  }

  async function clearSavings(expId: string) {
    if (!selectedId) return;
    await fetch(`/api/trips/${selectedId}/expenses/${expId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ savingsAmount: 0, savingsNote: null, savingsData: null }),
    });
    await fetchTrips();
  }

  async function togglePaid(e: TripExpense) {
    if (!selectedId) return;
    await fetch(`/api/trips/${selectedId}/expenses/${e.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: !e.isPaid }),
    });
    await fetchTrips();
  }

  function openEditExpense(e: TripExpense) {
    setExpForm({ category: e.category, description: e.description, amount: e.amount.toString(), currency: e.currency, isPaid: e.isPaid, date: e.date ?? "", savingsAmount: e.savingsAmount ? e.savingsAmount.toString() : "", savingsNote: e.savingsNote ?? "", savingsData: e.savingsData ?? "", paymentMethod: e.paymentMethod ?? "nakit" });
    setEditingExpId(e.id);
    setExpModal("edit");
  }

  const filteredTrips    = trips.filter(t => filter === "all" || t.status === filter);
  const filteredExpenses = selectedTrip
    ? (catFilter === "all" ? selectedTrip.expenses : selectedTrip.expenses.filter(e => e.category === catFilter))
    : [];
  const stats    = selectedTrip ? getStats(selectedTrip) : null;
  const catTotals = selectedTrip ? getCatTotals(selectedTrip) : {};
  const tripDays  = selectedTrip ? daysBetween(selectedTrip.startDate, selectedTrip.endDate) : null;
  const daysLeft  = selectedTrip ? daysUntil(selectedTrip.startDate) : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white overflow-hidden">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-72 flex-shrink-0 border-r border-white/10 flex flex-col bg-black/20">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-sm flex items-center gap-2">🧳 Seyahat Planlayıcı</h1>
            <button
              onClick={() => { setTripForm(EMPTY_TRIP); setTripModal("add"); }}
              className="bg-blue-500 hover:bg-blue-400 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Plus size={12} /> Yeni Gezi
            </button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["all", "planned", "completed", "draft"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-2 py-0.5 rounded text-xs transition-colors",
                  filter === f ? "bg-white/20 text-white" : "text-white/40 hover:text-white/70")}>
                {f === "all" ? "Tümü" : STATUS_CONF[f].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTrips.length === 0 && (
            <p className="text-center text-white/30 text-sm py-10">Gezi bulunamadı</p>
          )}
          {filteredTrips.map(trip => {
            const s = getStats(trip);
            const d = daysBetween(trip.startDate, trip.endDate);
            return (
              <button key={trip.id} onClick={() => setSelectedId(trip.id)}
                className={cn("w-full text-left p-3 rounded-xl border transition-all",
                  selectedId === trip.id ? "bg-white/15 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10")}>
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="font-medium text-sm leading-tight">{trip.title}</span>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded border flex-shrink-0", STATUS_CONF[trip.status].cls)}>
                    {STATUS_CONF[trip.status].label}
                  </span>
                </div>
                <div className="text-white/50 text-xs flex items-center gap-1 mb-2">
                  <MapPin size={10} /> {trip.destination} {d && <span>· {d}g</span>}
                </div>
                {s.budget !== null ? (
                  <>
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                      <span>{fmtTL(s.total)}</span>
                      <span>{fmtTL(s.budget)}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all",
                        s.pct > 90 ? "bg-red-400" : s.pct > 70 ? "bg-amber-400" : "bg-blue-400")}
                        style={{ width: `${s.pct}%` }} />
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-white/30 italic">Bütçe belirlenmedi</div>
                )}
                {trip.startDate && (
                  <div className="text-white/30 text-xs mt-1.5">
                    {fmtDate(trip.startDate)}{trip.endDate && ` – ${fmtDate(trip.endDate)}`}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <main className="flex-1 overflow-y-auto">
        {!selectedTrip ? (
          <div className="flex flex-col items-center justify-center h-full text-white/25 gap-3">
            <span className="text-6xl">🗺️</span>
            <p className="text-lg">Bir gezi seçin veya yeni ekleyin</p>
          </div>
        ) : (
          <div className="p-6 max-w-4xl mx-auto">

            {/* HEADER */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h2 className="text-2xl font-bold">{selectedTrip.title}</h2>
                  <span className={cn("text-xs px-2 py-0.5 rounded border", STATUS_CONF[selectedTrip.status].cls)}>
                    {STATUS_CONF[selectedTrip.status].label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-white/50 text-sm">
                  {selectedTrip.destination && (
                    <span className="flex items-center gap-1.5"><MapPin size={13} /> {selectedTrip.destination}</span>
                  )}
                  {selectedTrip.startDate && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} />
                      {fmtDate(selectedTrip.startDate)}
                      {selectedTrip.endDate && <> – {fmtDate(selectedTrip.endDate)}</>}
                    </span>
                  )}
                  {tripDays && (
                    <span className="flex items-center gap-1.5"><Clock size={13} /> {tripDays} gün</span>
                  )}
                  {daysLeft !== null && daysLeft >= 0 && selectedTrip.status !== "completed" && (
                    <span className={cn("flex items-center gap-1 font-medium",
                      daysLeft === 0 ? "text-yellow-400" : daysLeft <= 7 ? "text-red-400" : daysLeft <= 30 ? "text-amber-400" : "text-emerald-400")}>
                      <ChevronRight size={13} />
                      {daysLeft === 0 ? "Bugün!" : `${daysLeft} gün kaldı`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={openEditTrip}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 transition-colors">
                  <Pencil size={15} />
                </button>
                <button onClick={() => deleteTrip(selectedTrip.id)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-300 border border-white/10 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            {/* BUDGET CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-xs text-white/40 mb-1.5">Toplam Bütçe</div>
                <div className="text-xl font-bold text-blue-300">
                  {stats?.budget != null ? fmtTL(stats.budget) : "—"}
                </div>
                {selectedTrip.totalBudget && selectedTrip.currency !== "TRY" && (
                  <div className="text-xs text-white/30 mt-0.5">{fmtAmt(selectedTrip.totalBudget, selectedTrip.currency)}</div>
                )}
                {tripDays && stats?.budget != null && (
                  <div className="text-xs text-white/30 mt-1">{fmtTL(stats.budget / tripDays)}/gün</div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-xs text-white/40 mb-1.5">Harcanan</div>
                <div className={cn("text-xl font-bold",
                  stats && stats.pct > 90 ? "text-red-300" : stats && stats.pct > 70 ? "text-amber-300" : "text-white")}>
                  {stats ? fmtTL(stats.total) : "—"}
                </div>
                {stats?.budget != null && (
                  <div className="text-xs text-white/30 mt-0.5">%{stats.pct.toFixed(1)} kullanıldı</div>
                )}
                <div className="text-xs text-white/30 mt-1">✓ {fmtTL(stats?.paid ?? 0)} ödendi</div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-xs text-white/40 mb-1.5">
                  {stats?.remaining != null && stats.remaining < 0 ? "⚠ Bütçe Aşımı" : "Kalan"}
                </div>
                <div className={cn("text-xl font-bold",
                  stats?.remaining == null ? "text-white/40" :
                  stats.remaining < 0 ? "text-red-400" : "text-emerald-300")}>
                  {stats?.remaining != null ? fmtTL(Math.abs(stats.remaining)) : "—"}
                </div>
                {stats?.remaining != null && stats.remaining > 0 && tripDays && (
                  <div className="text-xs text-white/30 mt-1">{fmtTL(stats.remaining / tripDays)}/gün kalan</div>
                )}
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-xs text-white/40 mb-1.5">Günlük Ortalama</div>
                <div className="text-xl font-bold text-amber-300">
                  {tripDays && stats && stats.total > 0 ? fmtTL(stats.total / tripDays) : "—"}
                </div>
                {tripDays && (
                  <div className="text-xs text-white/30 mt-0.5">{tripDays} gün üzerinden</div>
                )}
                {tripDays && stats?.budget != null && stats.total > 0 && (
                  <div className="text-xs text-white/30 mt-1">
                    hedef {fmtTL(stats.budget / tripDays)}/gün
                  </div>
                )}
                {stats && stats.savings > 0 && tripDays && (
                  <div className="text-xs text-green-400 mt-1">
                    +{fmtTL(stats.savings / tripDays)}/gün dahil
                  </div>
                )}
              </div>
            </div>

            {/* PROGRESS BAR */}
            {stats?.budget != null && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                <div className="flex justify-between text-xs text-white/40 mb-2">
                  <span>{fmtTL(stats.total)} harcandı</span>
                  <span>%{stats.pct.toFixed(1)} · {fmtTL(stats.budget)} bütçe</span>
                </div>
                <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500",
                    stats.pct > 100 ? "bg-gradient-to-r from-red-600 to-red-400" :
                    stats.pct > 90  ? "bg-gradient-to-r from-red-500 to-red-400" :
                    stats.pct > 70  ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                                      "bg-gradient-to-r from-blue-600 to-blue-400")}
                    style={{ width: `${Math.min(100, stats.pct)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-white/30 mt-1.5">
                  <span>{fmtTL(stats.paid)} ödendi · {fmtTL(stats.total - stats.paid)} bekliyor</span>
                  {stats.savings > 0 && (
                    <span className="text-green-400">✓ {fmtTL(stats.savings)} dahil/tasarruf</span>
                  )}
                </div>
              </div>
            )}

            {/* TASARRUFLAR */}
            {stats && stats.savings > 0 && (
              <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-green-400 flex items-center gap-2">
                    🎁 Dahil Hizmetler & Tasarruflar
                  </h3>
                  <div className="text-right">
                    <span className="text-base font-bold text-green-300">{fmtTL(stats.savings)}</span>
                    {stats.total > 0 && (
                      <div className="text-xs text-green-400/60">
                        %{Math.round((stats.savings / stats.total) * 100)} harcama üzerinden
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedTrip.expenses.filter(e => e.savingsAmount > 0).map(exp => {
                    const cat = getCat(exp.category);
                    let parsedItems: { label: string; price: string; type: "flat" | "daily"; checked: boolean }[] = [];
                    let parsedDays = 1;
                    if (exp.savingsData) {
                      try {
                        const p = JSON.parse(exp.savingsData);
                        parsedDays = parseInt(p.days) || 1;
                        parsedItems = (p.items ?? []).filter((i: { checked: boolean }) => i.checked);
                      } catch {}
                    }
                    return (
                      <div key={exp.id} className="border border-white/8 rounded-lg overflow-hidden">
                        {/* Header row */}
                        <div className="flex items-center gap-3 px-3 py-2 bg-white/3">
                          <span className="text-sm flex-shrink-0">{cat.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white/80 truncate font-medium">{exp.description}</div>
                          </div>
                          <span className="text-sm font-bold text-green-300 tabular-nums flex-shrink-0">
                            +{fmtTL(exp.savingsAmount)}
                          </span>
                          <button onClick={() => openEditExpense(exp)}
                            className="text-white/30 hover:text-green-400 transition-colors flex-shrink-0 ml-1">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => clearSavings(exp.id)}
                            className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {/* Item breakdown */}
                        {parsedItems.length > 0 ? (
                          <div className="px-3 py-1.5 space-y-0.5">
                            {parsedItems.map(item => {
                              const p = parseFloat(item.price) || 0;
                              const lineTotal = item.type === "daily" ? p * parsedDays : p;
                              return (
                                <div key={item.label} className="flex items-center justify-between text-xs">
                                  <span className="text-white/40">{item.label}</span>
                                  <span className="text-white/50 tabular-nums">
                                    {item.type === "daily"
                                      ? `₺${p.toLocaleString("tr-TR")} × ${parsedDays}g`
                                      : `₺${p.toLocaleString("tr-TR")}`}
                                    <span className="text-green-400/70 ml-1">= {fmtTL(lineTotal)}</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : exp.savingsNote ? (
                          <div className="px-3 py-1.5 text-xs text-white/40">{exp.savingsNote}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                {tripDays && (
                  <div className="mt-2 pt-2 border-t border-green-500/15 flex justify-between text-xs text-green-400/60">
                    <span>Günlük ortalama tasarruf</span>
                    <span className="font-medium text-green-400">{fmtTL(stats.savings / tripDays)}/gün</span>
                  </div>
                )}
              </div>
            )}

            {/* CATEGORY BREAKDOWN */}
            {Object.keys(catTotals).length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-medium text-white/60 mb-3">Kategori Dağılımı</h3>
                <div className="space-y-2.5">
                  {CATEGORIES.filter(c => catTotals[c.key]).sort((a, b) => (catTotals[b.key] ?? 0) - (catTotals[a.key] ?? 0)).map(cat => {
                    const amt    = catTotals[cat.key] ?? 0;
                    const maxAmt = Math.max(...Object.values(catTotals));
                    const barPct = maxAmt > 0 ? (amt / maxAmt) * 100 : 0;
                    const total  = stats?.total ?? 1;
                    const share  = total > 0 ? (amt / total) * 100 : 0;
                    return (
                      <div key={cat.key} className="flex items-center gap-3">
                        <span className="text-base w-6 text-center">{cat.emoji}</span>
                        <span className="w-32 text-xs text-white/50 truncate">{cat.label}</span>
                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-blue-400/80 transition-all duration-500"
                            style={{ width: `${barPct}%` }} />
                        </div>
                        <span className="text-xs text-white/70 w-28 text-right tabular-nums">{fmtTL(amt)}</span>
                        <span className="text-xs text-white/30 w-10 text-right tabular-nums">%{share.toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* EXPENSES TABLE */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white/60">
                  Giderler
                  <span className="ml-2 text-xs text-white/30">({selectedTrip.expenses.length})</span>
                </h3>
                <button
                  onClick={() => { setExpForm(EMPTY_EXP); setExpModal("add"); }}
                  className="bg-blue-500 hover:bg-blue-400 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                  <Plus size={12} /> Gider Ekle
                </button>
              </div>

              {/* Category filter chips */}
              {selectedTrip.expenses.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  <button onClick={() => setCatFilter("all")}
                    className={cn("px-2.5 py-0.5 rounded-full text-xs border transition-colors",
                      catFilter === "all" ? "bg-white/20 border-white/30 text-white" : "border-white/10 text-white/40 hover:text-white/70")}>
                    Tümü
                  </button>
                  {CATEGORIES.filter(c => selectedTrip.expenses.some(e => e.category === c.key)).map(c => (
                    <button key={c.key} onClick={() => setCatFilter(c.key)}
                      className={cn("px-2.5 py-0.5 rounded-full text-xs border transition-colors",
                        catFilter === c.key ? "bg-white/20 border-white/30 text-white" : "border-white/10 text-white/40 hover:text-white/70")}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              )}

              {filteredExpenses.length === 0 ? (
                <p className="text-center text-white/25 text-sm py-8">
                  {selectedTrip.expenses.length === 0 ? "Henüz gider yok — ilk gideri ekleyin!" : "Bu kategoride gider yok"}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {filteredExpenses.map(exp => {
                    const cat = getCat(exp.category);
                    const borderCls = cat.cls.split(" ").find(c => c.startsWith("border-")) ?? "border-slate-400";
                    return (
                      <div key={exp.id}
                        className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-2 hover:bg-white/5 transition-colors group", borderCls)}>
                        {/* Paid toggle */}
                        <button onClick={() => togglePaid(exp)}
                          className={cn("w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors",
                            exp.isPaid ? "bg-green-500 border-green-500" : "border-white/30 hover:border-green-400")}>
                          {exp.isPaid && <Check size={10} className="text-white" />}
                        </button>
                        {/* Emoji */}
                        <span className="text-sm flex-shrink-0">{cat.emoji}</span>
                        {/* Description + date */}
                        <div className="flex-1 min-w-0">
                          <div className={cn("text-sm", exp.isPaid ? "line-through text-white/35" : "text-white")}>
                            {exp.description}
                          </div>
                          {exp.date && (
                            <div className="text-xs text-white/30">{fmtDate(exp.date)}</div>
                          )}
                        </div>
                        {/* Payment method badge */}
                        <span className={cn("text-xs px-1.5 py-0.5 rounded border flex-shrink-0",
                          exp.paymentMethod === "kredi kartı"
                            ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400")}>
                          {exp.paymentMethod === "kredi kartı" ? "💳" : "💵"}
                        </span>
                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <div className={cn("text-sm font-medium tabular-nums",
                            exp.isPaid ? "text-white/35" : "text-white")}>
                            {fmtAmt(exp.amount, exp.currency)}
                          </div>
                          {exp.currency !== "TRY" && (
                            <div className="text-xs text-white/30 tabular-nums">
                              {fmtTL(toTry(exp.amount, exp.currency))}
                            </div>
                          )}
                          {exp.savingsAmount > 0 && (
                            <div className="text-xs text-green-400 tabular-nums" title={exp.savingsNote ?? "Dahil hizmetler"}>
                              ✓ {fmtTL(exp.savingsAmount)} dahil
                            </div>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity flex-shrink-0">
                          <button onClick={() => openEditExpense(exp)}
                            className="p-1 rounded text-white/40 hover:text-white transition-colors">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deleteExpense(exp.id)}
                            className="p-1 rounded text-white/40 hover:text-red-400 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Expense total footer */}
              {selectedTrip.expenses.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm">
                  <span className="text-white/40">Toplam ({selectedTrip.expenses.length} gider)</span>
                  <span className="font-semibold text-white">{fmtTL(stats?.total ?? 0)}</span>
                </div>
              )}
            </div>

            {/* NOTES */}
            {selectedTrip.notes && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-4">
                <div className="text-xs text-white/40 mb-1.5">Notlar</div>
                <p className="text-sm text-white/70 whitespace-pre-wrap">{selectedTrip.notes}</p>
              </div>
            )}

          </div>
        )}
      </main>

      {/* MODALS */}
      {tripModal && (
        <Modal title={tripModal === "add" ? "Yeni Gezi" : "Geziyi Düzenle"} onClose={() => setTripModal(null)}>
          <TripForm form={tripForm} setForm={setTripForm}
            onSubmit={tripModal === "add" ? createTrip : updateTrip}
            onCancel={() => setTripModal(null)} />
        </Modal>
      )}
      {expModal && (
        <Modal title={expModal === "add" ? "Gider Ekle" : "Gider Düzenle"}
          onClose={() => { setExpModal(null); setEditingExpId(null); }}>
          <ExpenseForm form={expForm} setForm={setExpForm} tripDays={tripDays}
            onSubmit={expModal === "add" ? createExpense : updateExpense}
            onCancel={() => { setExpModal(null); setEditingExpId(null); }} />
        </Modal>
      )}
    </div>
  );
}
