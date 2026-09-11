"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Lock, Eye, EyeOff, ArrowRight, TrendingUp, LineChart, CreditCard, BarChart2, Globe, Sun, Moon } from "lucide-react";

const SECTIONS = [
  { label: "Portföy", icon: TrendingUp },
  { label: "Takip", icon: LineChart },
  { label: "Abonelikler", icon: CreditCard },
  { label: "Gelir/Gider", icon: BarChart2 },
  { label: "Seyahat", icon: Globe },
];

export default function LoginPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (r.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await r.json().catch(() => ({}));
      setError(data.error ?? "Giriş başarısız");
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(700px circle at 15% 20%, var(--teal-dim), transparent 60%), radial-gradient(520px circle at 90% 85%, var(--teal-dim), transparent 60%)",
        }}
      />

      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        title="Açık / koyu tema"
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-teal"
      >
        <Sun size={15} className="hidden dark:block" />
        <Moon size={15} className="block dark:hidden" />
      </button>

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <div className="grid items-center gap-10 md:grid-cols-[1.15fr_1fr] md:gap-16">
          <div>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-dim text-3xl ring-1 ring-teal/20">🌀</span>
              <div>
                <h1 className="text-3xl font-extrabold tracking-[0.12em] text-foreground md:text-4xl">LIFEOFTUFAO</h1>
                <p className="text-sm font-semibold text-teal">Kişisel Finans & Yaşam</p>
              </div>
            </div>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              Portföyün, aboneliklerin, bütçen ve seyahatlerin — hepsi tek, sakin bir yerde.
            </p>
            <div className="mt-6 hidden flex-wrap gap-2 md:flex">
              {SECTIONS.map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  <Icon size={13} className="text-teal" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <form
            onSubmit={submit}
            className="w-full rounded-2xl border border-border bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.18)]"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-dim text-teal">
                <Lock size={18} />
              </span>
              <div>
                <h2 className="font-semibold text-foreground">Tekrar hoş geldin</h2>
                <p className="text-xs text-muted-foreground">Devam etmek için şifreni gir</p>
              </div>
            </div>

            <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Şifre
            </label>
            <div className="relative">
              <input
                id="password"
                type={show ? "text" : "password"}
                autoFocus
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-faint transition-colors focus:border-primary focus:outline-none focus:ring-3 focus:ring-teal-dim"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-teal"
              >
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={!password || loading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              {loading ? "Giriş yapılıyor…" : <>Giriş <ArrowRight size={15} /></>}
            </button>
          </form>
        </div>

        <p className="mt-14 text-center text-[11px] text-faint md:text-left">
          LIFEOFTUFAO · Kişisel Finans & Yaşam · Design by Tayfun Evcil
        </p>
      </div>
    </div>
  );
}
