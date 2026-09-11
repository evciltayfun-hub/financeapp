"use client";

import { useEffect, useState, useCallback } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Plus, Minus, RotateCcw, Star, X, MapPin, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

type MapGeo = { rsmKey: string; properties: { name: string } };

interface TravelVisit {
  id: string;
  countryId: string;
  startDate: string | null;
  endDate: string | null;
  cities: string | null;
  notes: string | null;
  createdAt: string;
}

interface TravelCountry {
  id: string;
  countryName: string;
  isoCode: string | null;
  status: "planned" | "visited";
  isHome: boolean;
  notes: string | null;
  rating: number | null;
  visits: TravelVisit[];
}

function flag(iso: string | null) {
  if (!iso || iso === "-99" || iso.length !== 2) return "🌍";
  return iso.toUpperCase().replace(/./g, (c) => String.fromCodePoint(c.charCodeAt(0) + 0x1f1a5));
}

const NAME_TO_ISO: Record<string, string> = {
  "Turkey": "TR", "Türkiye": "TR", "United States of America": "US", "United States": "US",
  "United Kingdom": "GB", "Germany": "DE", "France": "FR", "Italy": "IT", "Spain": "ES",
  "Netherlands": "NL", "Belgium": "BE", "Switzerland": "CH", "Austria": "AT", "Portugal": "PT",
  "Greece": "GR", "Sweden": "SE", "Norway": "NO", "Denmark": "DK", "Finland": "FI",
  "Poland": "PL", "Czech Republic": "CZ", "Czechia": "CZ", "Hungary": "HU", "Romania": "RO",
  "Russia": "RU", "Ukraine": "UA", "Japan": "JP", "China": "CN", "South Korea": "KR",
  "India": "IN", "Thailand": "TH", "Vietnam": "VN", "Indonesia": "ID", "Malaysia": "MY",
  "Singapore": "SG", "Philippines": "PH", "Australia": "AU", "New Zealand": "NZ",
  "Brazil": "BR", "Argentina": "AR", "Chile": "CL", "Colombia": "CO", "Peru": "PE",
  "Mexico": "MX", "Canada": "CA", "Egypt": "EG", "Morocco": "MA", "South Africa": "ZA",
  "Nigeria": "NG", "Kenya": "KE", "Ethiopia": "ET", "Tanzania": "TZ",
  "Saudi Arabia": "SA", "United Arab Emirates": "AE", "Israel": "IL", "Iran": "IR",
  "Iraq": "IQ", "Jordan": "JO", "Lebanon": "LB", "Qatar": "QA", "Kuwait": "KW",
  "Pakistan": "PK", "Bangladesh": "BD", "Sri Lanka": "LK", "Nepal": "NP",
  "Croatia": "HR", "Serbia": "RS", "Bulgaria": "BG", "Slovakia": "SK", "Slovenia": "SI",
  "Ireland": "IE", "Iceland": "IS", "Luxembourg": "LU", "Malta": "MT", "Cyprus": "CY",
  "Albania": "AL", "Montenegro": "ME", "North Macedonia": "MK", "Bosnia and Herz.": "BA",
  "Cuba": "CU", "Dominican Rep.": "DO", "Jamaica": "JM",
  "Georgia": "GE", "Armenia": "AM", "Azerbaijan": "AZ", "Kazakhstan": "KZ",
  "Uzbekistan": "UZ", "Mongolia": "MN", "Myanmar": "MM", "Cambodia": "KH", "Laos": "LA",
  "Taiwan": "TW", "Hong Kong": "HK",
  "Libya": "LY", "Tunisia": "TN", "Algeria": "DZ", "Sudan": "SD", "Ghana": "GH",
  "Senegal": "SN", "Angola": "AO", "Mozambique": "MZ", "Zambia": "ZM", "Zimbabwe": "ZW",
  "Ecuador": "EC", "Bolivia": "BO", "Paraguay": "PY", "Uruguay": "UY", "Venezuela": "VE",
  "Guatemala": "GT", "Honduras": "HN", "Costa Rica": "CR", "Panama": "PA",
};

function getIso(name: string) { return NAME_TO_ISO[name] ?? ""; }

type Continent = "Avrupa" | "Asya" | "Afrika" | "Kuzey Amerika" | "Güney Amerika" | "Okyanusya";

const ISO_TO_CONTINENT: Record<string, Continent> = {
  // Avrupa
  TR:"Avrupa", GB:"Avrupa", DE:"Avrupa", FR:"Avrupa", IT:"Avrupa", ES:"Avrupa",
  NL:"Avrupa", BE:"Avrupa", CH:"Avrupa", AT:"Avrupa", PT:"Avrupa", GR:"Avrupa",
  SE:"Avrupa", NO:"Avrupa", DK:"Avrupa", FI:"Avrupa", PL:"Avrupa", CZ:"Avrupa",
  HU:"Avrupa", RO:"Avrupa", UA:"Avrupa", HR:"Avrupa", RS:"Avrupa", BG:"Avrupa",
  SK:"Avrupa", SI:"Avrupa", IE:"Avrupa", IS:"Avrupa", LU:"Avrupa", MT:"Avrupa",
  CY:"Avrupa", AL:"Avrupa", ME:"Avrupa", MK:"Avrupa", BA:"Avrupa", RU:"Avrupa",
  LI:"Avrupa", MC:"Avrupa", SM:"Avrupa", AD:"Avrupa", VA:"Avrupa", MD:"Avrupa",
  BY:"Avrupa", LT:"Avrupa", LV:"Avrupa", EE:"Avrupa",
  // Asya
  JP:"Asya", CN:"Asya", KR:"Asya", IN:"Asya", TH:"Asya", VN:"Asya", ID:"Asya",
  MY:"Asya", SG:"Asya", PH:"Asya", SA:"Asya", AE:"Asya", IL:"Asya", IR:"Asya",
  IQ:"Asya", JO:"Asya", LB:"Asya", QA:"Asya", KW:"Asya", PK:"Asya", BD:"Asya",
  LK:"Asya", NP:"Asya", GE:"Asya", AM:"Asya", AZ:"Asya", KZ:"Asya", UZ:"Asya",
  MN:"Asya", MM:"Asya", KH:"Asya", LA:"Asya", TW:"Asya", HK:"Asya", MO:"Asya",
  BH:"Asya", OM:"Asya", YE:"Asya", SY:"Asya", AF:"Asya", TJ:"Asya", TM:"Asya",
  KG:"Asya", KP:"Asya", BN:"Asya", TL:"Asya", MV:"Asya", BT:"Asya",
  // Afrika
  EG:"Afrika", MA:"Afrika", ZA:"Afrika", NG:"Afrika", KE:"Afrika", ET:"Afrika",
  TZ:"Afrika", LY:"Afrika", TN:"Afrika", DZ:"Afrika", SD:"Afrika", GH:"Afrika",
  SN:"Afrika", AO:"Afrika", MZ:"Afrika", ZM:"Afrika", ZW:"Afrika", BW:"Afrika",
  NA:"Afrika", CI:"Afrika", CM:"Afrika", ML:"Afrika", BF:"Afrika", NE:"Afrika",
  TD:"Afrika", SO:"Afrika", MG:"Afrika", RW:"Afrika", BI:"Afrika", SS:"Afrika",
  CF:"Afrika", CG:"Afrika", CD:"Afrika", GA:"Afrika", GQ:"Afrika", ST:"Afrika",
  GW:"Afrika", GN:"Afrika", SL:"Afrika", LR:"Afrika", MR:"Afrika", GM:"Afrika",
  CV:"Afrika", DJ:"Afrika", ER:"Afrika", UG:"Afrika", MW:"Afrika", LS:"Afrika",
  SZ:"Afrika", KM:"Afrika", MU:"Afrika", SC:"Afrika",
  // Kuzey Amerika
  US:"Kuzey Amerika", CA:"Kuzey Amerika", MX:"Kuzey Amerika", CU:"Kuzey Amerika",
  DO:"Kuzey Amerika", JM:"Kuzey Amerika", CR:"Kuzey Amerika", PA:"Kuzey Amerika",
  GT:"Kuzey Amerika", HN:"Kuzey Amerika", SV:"Kuzey Amerika", NI:"Kuzey Amerika",
  BZ:"Kuzey Amerika", HT:"Kuzey Amerika", TT:"Kuzey Amerika", BB:"Kuzey Amerika",
  LC:"Kuzey Amerika", VC:"Kuzey Amerika", GD:"Kuzey Amerika", AG:"Kuzey Amerika",
  DM:"Kuzey Amerika", KN:"Kuzey Amerika", BS:"Kuzey Amerika",
  // Güney Amerika
  BR:"Güney Amerika", AR:"Güney Amerika", CL:"Güney Amerika", CO:"Güney Amerika",
  PE:"Güney Amerika", EC:"Güney Amerika", BO:"Güney Amerika", PY:"Güney Amerika",
  UY:"Güney Amerika", VE:"Güney Amerika", GY:"Güney Amerika", SR:"Güney Amerika",
  // Okyanusya
  AU:"Okyanusya", NZ:"Okyanusya", PG:"Okyanusya", FJ:"Okyanusya", SB:"Okyanusya",
  VU:"Okyanusya", WS:"Okyanusya", KI:"Okyanusya", TO:"Okyanusya", FM:"Okyanusya",
  PW:"Okyanusya", MH:"Okyanusya", NR:"Okyanusya", TV:"Okyanusya",
};

const CONTINENT_TOTALS: Record<Continent, number> = {
  "Avrupa": 44, "Asya": 48, "Afrika": 54,
  "Kuzey Amerika": 23, "Güney Amerika": 12, "Okyanusya": 14,
};

const CONTINENT_COLORS: Record<Continent, string> = {
  "Avrupa":        "bg-blue-500",
  "Asya":          "bg-orange-500",
  "Afrika":        "bg-yellow-500",
  "Kuzey Amerika": "bg-green-500",
  "Güney Amerika": "bg-emerald-400",
  "Okyanusya":     "bg-cyan-500",
};

function fmtDate(d: string | null) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRange(v: TravelVisit) {
  if (!v.startDate && !v.endDate) return "Tarih belirtilmedi";
  if (!v.endDate) return fmtDate(v.startDate);
  return `${fmtDate(v.startDate)} – ${fmtDate(v.endDate)}`;
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          className={cn("transition-colors", onChange ? "cursor-pointer" : "cursor-default")}
        >
          <Star size={14} className={cn((hover || value) >= i ? "text-amber-400 fill-amber-400" : "text-white/20")} />
        </button>
      ))}
    </div>
  );
}

const EMPTY_VISIT = { startDate: "", endDate: "", cities: "", notes: "" };

interface DetailModalProps {
  country: TravelCountry;
  onSave: (id: string, data: Partial<TravelCountry>) => void;
  onDelete: (id: string) => void;
  onAddVisit: (countryId: string, data: typeof EMPTY_VISIT) => Promise<TravelVisit>;
  onDeleteVisit: (visitId: string, countryId: string) => void;
  onClose: () => void;
}

function DetailModal({ country, onSave, onDelete, onAddVisit, onDeleteVisit, onClose }: DetailModalProps) {
  const [notes, setNotes] = useState(country.notes ?? "");
  const [rating, setRating] = useState(country.rating ?? 0);
  const [isHome, setIsHome] = useState(country.isHome);
  const [addingVisit, setAddingVisit] = useState(false);
  const [newVisit, setNewVisit] = useState({ ...EMPTY_VISIT });
  const [visits, setVisits] = useState<TravelVisit[]>(country.visits);
  const [saving, setSaving] = useState(false);

  async function handleAddVisit() {
    setSaving(true);
    const created = await onAddVisit(country.id, newVisit);
    setVisits((prev) => [...prev, created].sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? "")));
    setNewVisit({ ...EMPTY_VISIT });
    setAddingVisit(false);
    setSaving(false);
  }

  function handleDeleteVisit(visitId: string) {
    setVisits((prev) => prev.filter((v) => v.id !== visitId));
    onDeleteVisit(visitId, country.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-white/15 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{flag(country.isoCode)}</span>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">{country.countryName}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn("text-xs px-2 py-0.5 rounded-full",
                  country.status === "visited" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                )}>
                  {country.status === "visited" ? "✓ Gidildi" : "⭐ Planlanan"}
                </span>
                {country.isHome && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">🏠 Ev</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onDelete(country.id)} className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Ülkeyi sil"><Trash2 size={14} /></button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/25 hover:text-white/60 transition-colors"><X size={14} /></button>
          </div>
        </div>

        {/* Home toggle */}
        <div className="flex items-center gap-2 mb-5 p-3 rounded-xl bg-white/5 border border-border">
          <span className="text-base">🏠</span>
          <span className="text-sm text-white/60 flex-1">Yaşadığım ülke (Ev)</span>
          <button
            onClick={() => setIsHome(!isHome)}
            className={cn(
              "relative w-10 h-5 rounded-full transition-colors",
              isHome ? "bg-violet-500" : "bg-white/15"
            )}
          >
            <span className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
              isHome ? "translate-x-5" : "translate-x-0.5"
            )} />
          </button>
        </div>

        {/* Visits section */}
        {country.status === "visited" && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays size={10} />Ziyaretler
              </label>
              {!addingVisit && (
                <button onClick={() => setAddingVisit(true)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
                  <Plus size={12} />Ziyaret Ekle
                </button>
              )}
            </div>

            {/* Existing visits */}
            <div className="space-y-2">
              {visits.map((v) => (
                <div key={v.id} className="bg-white/5 border border-border rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white/80">{fmtRange(v)}</div>
                      {v.cities && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
                          <MapPin size={10} />{v.cities}
                        </div>
                      )}
                      {v.notes && <div className="text-xs text-white/35 mt-1 italic">{v.notes}</div>}
                    </div>
                    <button onClick={() => handleDeleteVisit(v.id)} className="p-1 text-white/20 hover:text-red-400 transition-colors shrink-0">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}

              {visits.length === 0 && !addingVisit && (
                <div className="text-xs text-white/25 text-center py-3">Henüz ziyaret eklenmemiş</div>
              )}
            </div>

            {/* Add visit form */}
            {addingVisit && (
              <div className="mt-2 bg-white/5 border border-white/15 rounded-xl p-3 space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-white/35 uppercase tracking-wider mb-1 block">Başlangıç</label>
                    <input type="date" value={newVisit.startDate}
                      onChange={(e) => setNewVisit((v) => ({ ...v, startDate: e.target.value }))}
                      className="w-full bg-white/8 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/25" />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/35 uppercase tracking-wider mb-1 block">Bitiş</label>
                    <input type="date" value={newVisit.endDate}
                      onChange={(e) => setNewVisit((v) => ({ ...v, endDate: e.target.value }))}
                      className="w-full bg-white/8 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white/25" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-white/35 uppercase tracking-wider mb-1 block">Şehirler</label>
                  <input value={newVisit.cities} onChange={(e) => setNewVisit((v) => ({ ...v, cities: e.target.value }))}
                    placeholder="Paris, Lyon..."
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/25" />
                </div>
                <div>
                  <label className="text-[10px] text-white/35 uppercase tracking-wider mb-1 block">Not</label>
                  <input value={newVisit.notes} onChange={(e) => setNewVisit((v) => ({ ...v, notes: e.target.value }))}
                    placeholder="İsteğe bağlı..."
                    className="w-full bg-white/8 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/25" />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setAddingVisit(false); setNewVisit({ ...EMPTY_VISIT }); }}
                    className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/40 text-xs transition-colors hover:bg-white/10">İptal</button>
                  <button onClick={handleAddVisit} disabled={saving}
                    className="flex-1 py-1.5 rounded-lg bg-blue-500/25 hover:bg-blue-500/35 text-blue-300 text-xs font-medium transition-colors disabled:opacity-40">
                    {saving ? "…" : "Ekle"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rating */}
        {country.status === "visited" && (
          <div className="mb-4">
            <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">Genel Puan</label>
            <Stars value={rating} onChange={setRating} />
          </div>
        )}

        {/* Notes */}
        <div className="mb-5">
          <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Notlar</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
            placeholder="Anılar, öneriler, hatırlatmalar..."
            className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 resize-none" />
        </div>

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors">Kapat</button>
          <button
            onClick={() => { onSave(country.id, { notes, rating, isHome }); onClose(); }}
            className="flex-1 py-2 rounded-lg bg-blue-500/25 hover:bg-blue-500/35 text-blue-300 text-sm font-medium transition-colors"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TravelPage() {
  const [countries, setCountries] = useState<TravelCountry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [zoom, setZoom]           = useState(1);
  const [center, setCenter]       = useState<[number, number]>([20, 20]);
  const [detail, setDetail]       = useState<TravelCountry | null>(null);
  const [tooltip, setTooltip]     = useState<{ name: string; x: number; y: number } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/travel");
    setCountries(await res.json());
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const byName = Object.fromEntries(countries.map((c) => [c.countryName, c]));

  async function handleCountryClick(geoName: string) {
    const existing = byName[geoName];
    if (!existing) {
      const iso = getIso(geoName);
      const res = await fetch("/api/travel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryName: geoName, isoCode: iso, status: "planned" }),
      });
      const created = await res.json();
      setCountries((prev) => [...prev, created]);
    } else if (existing.isHome) {
      setDetail(existing); // Home country: open detail instead of cycling
    } else if (existing.status === "planned") {
      const res = await fetch(`/api/travel/${existing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "visited" }),
      });
      const updated = await res.json();
      setCountries((prev) => prev.map((c) => (c.id === existing.id ? { ...c, ...updated } : c)));
    } else {
      await fetch(`/api/travel/${existing.id}`, { method: "DELETE" });
      setCountries((prev) => prev.filter((c) => c.id !== existing.id));
    }
  }

  async function handleSaveDetail(id: string, data: Partial<TravelCountry>) {
    const res = await fetch(`/api/travel/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setCountries((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    setDetail((d) => d ? { ...d, ...updated } : null);
  }

  async function handleDelete(id: string) {
    await fetch(`/api/travel/${id}`, { method: "DELETE" });
    setCountries((prev) => prev.filter((c) => c.id !== id));
    setDetail(null);
  }

  async function handleAddVisit(countryId: string, data: { startDate: string; endDate: string; cities: string; notes: string }) {
    const res = await fetch("/api/travel/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countryId, ...data }),
    });
    const visit: TravelVisit = await res.json();
    setCountries((prev) => prev.map((c) => c.id === countryId ? { ...c, visits: [...c.visits, visit] } : c));
    return visit;
  }

  function handleDeleteVisit(visitId: string, countryId: string) {
    fetch(`/api/travel/visits/${visitId}`, { method: "DELETE" });
    setCountries((prev) => prev.map((c) =>
      c.id === countryId ? { ...c, visits: c.visits.filter((v) => v.id !== visitId) } : c
    ));
  }

  // Sidebar data
  const home    = countries.filter((c) => c.isHome);
  const visited = countries.filter((c) => c.status === "visited" && !c.isHome);
  const planned = countries.filter((c) => c.status === "planned" && !c.isHome);

  // Total visited including home
  const totalVisitedCount = countries.filter((c) => c.status === "visited").length;
  const WORLD_COUNTRIES = 195;
  const worldPct = Math.round((totalVisitedCount / WORLD_COUNTRIES) * 100);

  // Per-continent stats
  const continentVisited: Partial<Record<Continent, number>> = {};
  for (const c of countries.filter((x) => x.status === "visited")) {
    const iso = c.isoCode ?? getIso(c.countryName);
    const cont = ISO_TO_CONTINENT[iso];
    if (cont) continentVisited[cont] = (continentVisited[cont] ?? 0) + 1;
  }
  const continentOrder: Continent[] = ["Avrupa", "Asya", "Afrika", "Kuzey Amerika", "Güney Amerika", "Okyanusya"];

  // Group visits by year (newest first) — include home countries too
  const yearGroups: Record<string, { country: TravelCountry; visit: TravelVisit }[]> = {};
  const noDateVisited: TravelCountry[] = [];

  for (const c of countries.filter((c) => c.status === "visited")) {
    if (c.visits.length === 0) { noDateVisited.push(c); continue; }
    for (const v of c.visits) {
      const yr = v.startDate ? v.startDate.slice(0, 4) : "?";
      if (!yearGroups[yr]) yearGroups[yr] = [];
      yearGroups[yr].push({ country: c, visit: v });
    }
  }
  const sortedYears = Object.keys(yearGroups).sort((a, b) => b.localeCompare(a));

  function getFill(geoName: string) {
    const c = byName[geoName];
    if (!c) return "#21262d";
    if (c.isHome) return "#a78bfa";
    if (c.status === "visited") return "#00c9a7";
    return "#e3b341";
  }
  function getHover(geoName: string) {
    const c = byName[geoName];
    if (!c) return "#30363d";
    if (c.isHome) return "#c4b5fd";
    if (c.status === "visited") return "#2ee6c4";
    return "#f0c75e";
  }

  const totalVisits = countries.reduce((s, c) => s + c.visits.length, 0);

  return (
    <div className="h-[calc(100vh-56px)] flex bg-background">

      {/* LEFT sidebar */}
      <div className="w-68 shrink-0 flex flex-col border-r border-border bg-card/60 overflow-hidden" style={{ width: 272 }}>
        <div className="px-4 py-4 border-b border-border">
          <h1 className="text-lg font-bold text-white">✈️ Seyahat</h1>
          <p className="text-xs text-white/40 mt-0.5">Haritaya tıkla, dünyayı keşfet</p>
        </div>

        {/* Legend */}
        <div className="px-4 py-2.5 border-b border-white/6 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/50">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#a78bfa" }} />Ev</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#00c9a7" }} />Gidilen</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#e3b341" }} />Planlanan</span>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 border-b border-white/6 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-400">{totalVisitedCount}</div>
              <div className="text-[9px] text-green-400/60 mt-0.5">Ülke</div>
            </div>
            <div className="bg-blue-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-400">{totalVisits}</div>
              <div className="text-[9px] text-blue-400/60 mt-0.5">Ziyaret</div>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-amber-400">{planned.length}</div>
              <div className="text-[9px] text-amber-400/60 mt-0.5">Planlanan</div>
            </div>
          </div>
          {/* World % bar */}
          <div className="bg-white/5 rounded-lg px-3 py-2">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] text-white/40">Dünya'nın</span>
              <span className="text-[11px] font-bold text-white/70">%{worldPct} <span className="text-white/30 font-normal">({totalVisitedCount}/{WORLD_COUNTRIES})</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.max(worldPct, 0.5)}%` }} />
            </div>
          </div>

          {/* Continent breakdown */}
          <div className="bg-white/5 rounded-lg px-3 py-2 space-y-1.5">
            <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Kıta kırılımı</div>
            {continentOrder.map((cont) => {
              const n = continentVisited[cont] ?? 0;
              const total = CONTINENT_TOTALS[cont];
              const pct = Math.round((n / total) * 100);
              return (
                <div key={cont}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] text-white/50">{cont}</span>
                    <span className="text-[10px] text-white/50">{n}/{total} <span className="text-white/30">%{pct}</span></span>
                  </div>
                  <div className="h-1 rounded-full bg-white/8 overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all", CONTINENT_COLORS[cont])} style={{ width: n > 0 ? `${Math.max(pct, 2)}%` : "0%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Lists */}
        <div className="flex-1 overflow-y-auto">
          {/* Home */}
          {home.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] font-semibold text-violet-400/70 uppercase tracking-wider border-b border-white/5 flex items-center gap-1.5">
                🏠 Yaşadığım
              </div>
              {home.map((c) => (
                <SidebarItem key={c.id} country={c} onClick={() => setDetail(c)} accent="violet" />
              ))}
            </div>
          )}

          {/* Year groups */}
          {sortedYears.map((yr) => (
            <div key={yr}>
              <div className="px-4 py-2 text-[10px] font-semibold text-green-400/60 uppercase tracking-wider border-b border-white/5 border-t border-white/5">
                📅 {yr} <span className="text-white/20 font-normal">({yearGroups[yr].length} ziyaret)</span>
              </div>
              {yearGroups[yr].map(({ country: c, visit: v }) => (
                <button
                  key={`${c.id}-${v.id}`}
                  onClick={() => setDetail(c)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors text-left group"
                >
                  <span className="text-base shrink-0">{flag(c.isoCode)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 font-medium truncate">{c.countryName}</div>
                    <div className="text-[10px] text-white/30 truncate">{fmtRange(v)}</div>
                    {v.cities && <div className="text-[10px] text-white/25 truncate">{v.cities}</div>}
                  </div>
                  <Pencil size={10} className="text-white/20 group-hover:text-white/40 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          ))}

          {/* Visited without dates */}
          {noDateVisited.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] font-semibold text-green-400/40 uppercase tracking-wider border-b border-white/5 border-t border-white/5">
                ✓ Tarihsiz
              </div>
              {noDateVisited.map((c) => (
                <SidebarItem key={c.id} country={c} onClick={() => setDetail(c)} accent="green" />
              ))}
            </div>
          )}

          {/* Planned */}
          {planned.length > 0 && (
            <div>
              <div className="px-4 py-2 text-[10px] font-semibold text-amber-400/60 uppercase tracking-wider border-b border-white/5 border-t border-white/5">
                ⭐ Planlanan ({planned.length})
              </div>
              {planned.map((c) => (
                <SidebarItem key={c.id} country={c} onClick={() => setDetail(c)} accent="amber" />
              ))}
            </div>
          )}

          {countries.length === 0 && !loading && (
            <div className="px-4 py-8 text-center text-white/25 text-xs">Haritadan ülkelere tıkla</div>
          )}
        </div>
      </div>

      {/* RIGHT: Map */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
          <button onClick={() => setZoom((z) => Math.min(z * 1.5, 8))} className="w-8 h-8 rounded-lg bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-colors"><Plus size={14} /></button>
          <button onClick={() => setZoom((z) => Math.max(z / 1.5, 1))} className="w-8 h-8 rounded-lg bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-colors"><Minus size={14} /></button>
          <button onClick={() => { setZoom(1); setCenter([20, 20]); }} className="w-8 h-8 rounded-lg bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-colors"><RotateCcw size={12} /></button>
        </div>

        <div className="absolute bottom-4 left-4 z-10 text-[10px] text-white/25 space-y-0.5">
          <div>1. tık → Planlandı &nbsp;|&nbsp; 2. tık → Gidildi &nbsp;|&nbsp; 3. tık → Kaldır</div>
          <div>Ev ülkesine tıklamak detay açar</div>
        </div>

        {tooltip && (
          <div className="absolute z-20 pointer-events-none bg-black/80 backdrop-blur text-white text-xs px-2.5 py-1.5 rounded-lg border border-white/10"
            style={{ left: tooltip.x + 10, top: tooltip.y - 30 }}>
            <span className="mr-1.5">{flag(getIso(tooltip.name))}</span>
            {tooltip.name}
            {byName[tooltip.name] && (
              <span className={cn("ml-2 font-semibold",
                byName[tooltip.name].isHome ? "text-violet-400" :
                byName[tooltip.name].status === "visited" ? "text-green-400" : "text-amber-400"
              )}>
                {byName[tooltip.name].isHome ? "🏠" : byName[tooltip.name].status === "visited" ? "✓" : "⭐"}
              </span>
            )}
          </div>
        )}

        <ComposableMap projection="geoNaturalEarth1" style={{ width: "100%", height: "100%" }} projectionConfig={{ scale: 160 }}>
          <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) => { setZoom(z); setCenter(coordinates); }}>
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: MapGeo[] }) => geographies.map((geo) => {
                const name = geo.properties.name;
                const fill = getFill(name);
                return (
                  <Geography key={geo.rsmKey} geography={geo} fill={fill} stroke="#0d1117" strokeWidth={0.4}
                    onClick={() => handleCountryClick(name)}
                    onMouseEnter={(e: React.MouseEvent) => setTooltip({ name, x: e.clientX, y: e.clientY })}
                    onMouseMove={(e: React.MouseEvent) => setTooltip({ name, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      default: { fill, outline: "none", cursor: "pointer" },
                      hover:   { fill: getHover(name), outline: "none", cursor: "pointer" },
                      pressed: { fill: getHover(name), outline: "none" },
                    }}
                  />
                );
              })}
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {detail && (
        <DetailModal
          country={detail}
          onSave={handleSaveDetail}
          onDelete={handleDelete}
          onAddVisit={handleAddVisit}
          onDeleteVisit={handleDeleteVisit}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function SidebarItem({ country, onClick, accent }: { country: TravelCountry; onClick: () => void; accent: string }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors text-left group">
      <span className="text-base shrink-0">{flag(country.isoCode)}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-white/80 font-medium truncate">{country.countryName}</div>
        {country.visits.length > 1 && (
          <div className={cn("text-[10px]",
            accent === "violet" ? "text-violet-400/60" :
            accent === "green" ? "text-green-400/60" : "text-amber-400/60"
          )}>{country.visits.length} ziyaret</div>
        )}
      </div>
      {(country.rating ?? 0) > 0 && (
        <div className="flex shrink-0">
          {Array.from({ length: country.rating! }).map((_, i) => (
            <Star key={i} size={9} className="text-amber-400 fill-amber-400" />
          ))}
        </div>
      )}
      <Pencil size={10} className="text-white/20 group-hover:text-white/40 shrink-0 transition-colors" />
    </button>
  );
}
