"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Star, Check, Trash2, X, Clapperboard, Music, Theater, CalendarDays, MapPin, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

type Category = "sinema" | "tiyatro" | "konser";
type StatusFilter = "tumu" | "planlanan" | "gidilen";

interface CultureEvent {
  id: string;
  category: Category;
  title: string;
  subtitle: string | null;
  genre: string | null;
  venue: string | null;
  eventDate: string | null;
  notes: string | null;
  rating: number | null;
  isAttended: boolean;
  attendedAt: string | null;
}

const CAT_CONFIG: Record<Category, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  sinema:  { label: "Sinema",  icon: <Clapperboard size={13} />, color: "text-blue-400",   bg: "bg-blue-500/15",   border: "border-blue-500/30" },
  tiyatro: { label: "Tiyatro", icon: <Theater      size={13} />, color: "text-amber-400",  bg: "bg-amber-500/15",  border: "border-amber-500/30" },
  konser:  { label: "Konser",  icon: <Music         size={13} />, color: "text-green-400",  bg: "bg-green-500/15",  border: "border-green-500/30" },
};

function fmtDate(d: string | null) {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange?.(i)}
          onMouseEnter={() => onChange && setHover(i)}
          onMouseLeave={() => onChange && setHover(0)}
          className={cn("transition-colors", onChange ? "cursor-pointer" : "cursor-default")}
        >
          <Star
            size={14}
            className={cn(
              (hover || value) >= i ? "text-amber-400 fill-amber-400" : "text-white/20"
            )}
          />
        </button>
      ))}
    </div>
  );
}

interface AttendModalProps {
  event: CultureEvent;
  onSave: (id: string, data: { isAttended: boolean; attendedAt: string; rating: number; notes: string }) => void;
  onClose: () => void;
}

function AttendModal({ event, onSave, onClose }: AttendModalProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState(event.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white">Gittim! ✓</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={16} /></button>
        </div>
        <p className="text-sm text-white/60 mb-4 font-medium">{event.title}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Gittiğim Tarih</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Puanım</label>
            <Stars value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Not</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nasıldı? Notlarını buraya yaz..."
              rows={3}
              className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors">İptal</button>
          <button
            onClick={() => onSave(event.id, { isAttended: true, attendedAt: date, rating, notes })}
            className="flex-1 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium transition-colors"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_FORM = { category: "sinema" as Category, title: "", subtitle: "", genre: "", venue: "", eventDate: "", notes: "" };

interface EventFormModalProps {
  initial?: typeof EMPTY_FORM & { id?: string };
  onSave: (data: typeof EMPTY_FORM) => void;
  onClose: () => void;
  mode: "add" | "edit";
}

function EventFormModal({ initial, onSave, onClose, mode }: EventFormModalProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const subtitleLabel = form.category === "sinema" ? "Yönetmen" : form.category === "konser" ? "Sanatçı / Grup" : "Oyun Yazarı";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white">{mode === "edit" ? "Etkinliği Düzenle" : "Yeni Etkinlik"}</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors"><X size={16} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Kategori</label>
            <div className="flex gap-2">
              {(["sinema", "tiyatro", "konser"] as Category[]).map((c) => {
                const cfg = CAT_CONFIG[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("category", c)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      form.category === c ? `${cfg.bg} ${cfg.color} ${cfg.border}` : "bg-white/5 text-white/40 border-white/10 hover:bg-white/8"
                    )}
                  >
                    {cfg.icon}{cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Başlık</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Film / Oyun / Konser adı" className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">{subtitleLabel}</label>
              <input value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25" />
            </div>
            {form.category === "sinema" ? (
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Tür</label>
                <input value={form.genre} onChange={(e) => set("genre", e.target.value)} placeholder="Aksiyon, Dram..." className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25" />
              </div>
            ) : (
              <div>
                <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Mekan</label>
                <input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Salon / Tiyatro adı" className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25" />
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Tarih</label>
            <input type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/25" />
          </div>
          <div>
            <label className="text-xs text-white/40 uppercase tracking-wider mb-1.5 block">Not</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="İsteğe bağlı..." className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/25 resize-none" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-colors">İptal</button>
          <button onClick={() => form.title.trim() && onSave(form)} disabled={!form.title.trim()} className="flex-1 py-2 rounded-lg bg-white/15 hover:bg-white/20 text-white text-sm font-medium transition-colors disabled:opacity-40">
            {mode === "edit" ? "Kaydet" : "Ekle"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, onAttend, onDelete, onUndo, onEdit }: {
  event: CultureEvent;
  onAttend: (e: CultureEvent) => void;
  onDelete: (id: string) => void;
  onUndo: (id: string) => void;
  onEdit: (e: CultureEvent) => void;
}) {
  const cfg = CAT_CONFIG[event.category];
  const isPast = event.eventDate ? new Date(event.eventDate) < new Date() : false;

  return (
    <div className={cn(
      "group relative rounded-xl border bg-card p-4 flex flex-col gap-3 transition-all hover:border-white/15",
      event.isAttended ? "border-border opacity-90" : "border-border"
    )}>
      {/* Attended badge */}
      {event.isAttended && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30">
          <Check size={10} className="text-green-400" />
          <span className="text-[10px] text-green-400 font-medium">Gidildi</span>
        </div>
      )}

      {/* Hover actions: edit + delete (only when not attended) */}
      {!event.isAttended && (
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
          <button
            onClick={() => onEdit(event)}
            className="p-1 rounded text-white/25 hover:text-blue-400 transition-colors"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(event.id)}
            className="p-1 rounded text-white/25 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* Header: category */}
      <div className="flex items-center gap-1.5">
        <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
          {cfg.icon}{cfg.label.toUpperCase()}
        </span>
        {isPast && !event.isAttended && (
          <span className="text-[10px] text-orange-400/70 font-medium">Gösterimde</span>
        )}
      </div>

      {/* Title */}
      <div>
        <h3 className={cn("font-bold text-base leading-tight", event.isAttended ? "text-white/70" : "text-white")}>{event.title}</h3>
        {event.subtitle && <p className="text-xs text-white/40 mt-0.5">{event.subtitle}</p>}
        {event.genre && <p className="text-[11px] text-white/30 mt-1">{event.genre}</p>}
      </div>

      {/* Date & venue */}
      <div className="flex flex-col gap-1">
        {event.eventDate && (
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <CalendarDays size={11} />
            <span>{fmtDate(event.eventDate)}</span>
          </div>
        )}
        {event.venue && (
          <div className="flex items-center gap-1.5 text-xs text-white/35">
            <MapPin size={11} />
            <span>{event.venue}</span>
          </div>
        )}
      </div>

      {/* Attended info */}
      {event.isAttended ? (
        <div className="border-t border-white/6 pt-3 space-y-1.5">
          {event.attendedAt && (
            <p className="text-[11px] text-white/35">{fmtDate(event.attendedAt)} tarihinde gidildi</p>
          )}
          {(event.rating ?? 0) > 0 && <Stars value={event.rating!} />}
          {event.notes && <p className="text-xs text-white/45 italic leading-relaxed">"{event.notes}"</p>}
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => onUndo(event.id)}
              className="text-[10px] text-white/20 hover:text-white/40 transition-colors"
            >
              Geri al
            </button>
            <button
              onClick={() => onEdit(event)}
              className="text-[10px] text-white/20 hover:text-blue-400 transition-colors flex items-center gap-0.5"
            >
              <Pencil size={10} /> Düzenle
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onAttend(event)}
          className={cn(
            "mt-auto w-full py-2 rounded-lg text-sm font-medium transition-all border",
            "bg-white/5 hover:bg-green-500/15 text-white/50 hover:text-green-400 border-border hover:border-green-500/30"
          )}
        >
          ✓ Gittim
        </button>
      )}
    </div>
  );
}

export default function CulturePage() {
  const [events, setEvents]             = useState<CultureEvent[]>([]);
  const [loading, setLoading]           = useState(true);
  const [category, setCategory]         = useState<Category | "tumu">("tumu");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("tumu");
  const [attendModal, setAttendModal]   = useState<CultureEvent | null>(null);
  const [showAdd, setShowAdd]           = useState(false);
  const [editEvent, setEditEvent]       = useState<CultureEvent | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/culture");
    setEvents(await res.json());
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function handleAttendSave(id: string, data: object) {
    const res = await fetch(`/api/culture/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const updated = await res.json();
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
    setAttendModal(null);
  }

  async function handleUndo(id: string) {
    const res = await fetch(`/api/culture/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAttended: false, attendedAt: null, rating: null }) });
    const updated = await res.json();
    setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }

  async function handleDelete(id: string) {
    await fetch(`/api/culture/${id}`, { method: "DELETE" });
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleAdd(form: typeof EMPTY_FORM) {
    const res = await fetch("/api/culture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const created = await res.json();
    setEvents((prev) => [...prev, created]);
    setShowAdd(false);
  }

  async function handleEdit(form: typeof EMPTY_FORM) {
    if (!editEvent) return;
    const res = await fetch(`/api/culture/${editEvent.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setEvents((prev) => prev.map((e) => (e.id === editEvent.id ? updated : e)));
    setEditEvent(null);
  }

  const filtered = events.filter((e) => {
    if (category !== "tumu" && e.category !== category) return false;
    if (statusFilter === "planlanan" && e.isAttended) return false;
    if (statusFilter === "gidilen"   && !e.isAttended) return false;
    return true;
  });

  const stats = {
    total:    events.length,
    attended: events.filter((e) => e.isAttended).length,
    sinema:   events.filter((e) => e.category === "sinema").length,
    tiyatro:  events.filter((e) => e.category === "tiyatro").length,
    konser:   events.filter((e) => e.category === "konser").length,
  };

  const editInitial = editEvent ? {
    category: editEvent.category,
    title:     editEvent.title,
    subtitle:  editEvent.subtitle ?? "",
    genre:     editEvent.genre    ?? "",
    venue:     editEvent.venue    ?? "",
    eventDate: editEvent.eventDate ?? "",
    notes:     editEvent.notes    ?? "",
  } : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kültür & Sanat</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gitmek istediğin etkinlikleri takip et</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors">
          <Plus size={15} />Etkinlik Ekle
        </button>
      </div>

      <div className="flex gap-5">
        {/* LEFT sidebar */}
        <div className="w-52 shrink-0 space-y-4">
          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            {([["tumu", "Tümü"], ["sinema", "Sinema"], ["tiyatro", "Tiyatro"], ["konser", "Konser"]] as const).map(([val, label]) => {
              const cfg = val !== "tumu" ? CAT_CONFIG[val as Category] : null;
              return (
                <button
                  key={val}
                  onClick={() => setCategory(val)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left",
                    category === val ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
                  )}
                >
                  {cfg ? <span className={cfg.color}>{cfg.icon}</span> : <span className="w-[13px]" />}
                  <span>{label}</span>
                  <span className="ml-auto text-xs text-white/25">
                    {val === "tumu" ? stats.total : stats[val as Category]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-border bg-card p-3 space-y-1">
            {([["tumu", "Tümü"], ["planlanan", "Planlanan"], ["gidilen", "Gidilen"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left",
                  statusFilter === val ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70 hover:bg-white/5"
                )}
              >
                {val === "gidilen" ? <Check size={12} className="text-green-400" /> : <span className="w-3" />}
                {label}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium">İstatistik</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Toplam</span>
                <span className="text-white font-semibold">{stats.total}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Gidilen</span>
                <span className="text-green-400 font-semibold">{stats.attended}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Planlanan</span>
                <span className="text-white/60 font-semibold">{stats.total - stats.attended}</span>
              </div>
              {stats.attended > 0 && (
                <div className="pt-1 border-t border-white/6">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/40">Tamamlanma</span>
                    <span className="text-amber-400 font-semibold">%{Math.round((stats.attended / stats.total) * 100)}</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full bg-amber-400/60 rounded-full transition-all" style={{ width: `${(stats.attended / stats.total) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: card grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-52 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-white/25 gap-3">
              <Clapperboard size={32} className="opacity-30" />
              <p className="text-sm">Etkinlik yok</p>
              <button onClick={() => setShowAdd(true)} className="text-xs text-white/40 hover:text-white/60 underline underline-offset-2">Ekle</button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  onAttend={setAttendModal}
                  onDelete={handleDelete}
                  onUndo={handleUndo}
                  onEdit={setEditEvent}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {attendModal && (
        <AttendModal event={attendModal} onSave={handleAttendSave} onClose={() => setAttendModal(null)} />
      )}
      {showAdd && (
        <EventFormModal mode="add" onSave={handleAdd} onClose={() => setShowAdd(false)} />
      )}
      {editEvent && (
        <EventFormModal mode="edit" initial={editInitial} onSave={handleEdit} onClose={() => setEditEvent(null)} />
      )}
    </div>
  );
}
