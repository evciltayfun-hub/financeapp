"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-white">
          <Lock size={18} className="text-white/60" />
          <h1 className="font-semibold">LifeOfTufao</h1>
        </div>
        <input
          type="password"
          autoFocus
          placeholder="Şifre"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary transition-colors"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={!password || loading}
          className="w-full px-4 py-2 text-sm bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-semibold rounded-lg transition-colors"
        >
          {loading ? "..." : "Giriş"}
        </button>
      </form>
    </div>
  );
}
