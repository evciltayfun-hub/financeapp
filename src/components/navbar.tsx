"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TrendingUp, PlusCircle, Eye, EyeOff, LineChart, CreditCard, BarChart2, Globe, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { usePrivacy } from "@/lib/privacy-context";

const navItems = [
  { href: "/portfolio", label: "Portföy", icon: TrendingUp },
  { href: "/watchlist", label: "Takip", icon: LineChart },
  { href: "/subscription", label: "Abonelikler", icon: CreditCard },
  { href: "/budget",  label: "Gelir/Gider",  icon: BarChart2 },
  { href: "/travel",   label: "Seyahat",      icon: Globe    },
];

export default function Navbar() {
  const pathname = usePathname();
  const { hidden, toggle } = usePrivacy();
  const { resolvedTheme, setTheme } = useTheme();

  if (pathname === "/login") return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/portfolio" className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-teal-dim text-base">🌀</span>
            <span className="leading-tight">
              <span className="block text-[13px] font-extrabold tracking-[0.08em] text-foreground">LIFEOFTUFAO</span>
              <span className="block text-[10px] font-medium text-teal">Kişisel Finans & Yaşam</span>
            </span>
          </Link>
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    active
                      ? "bg-teal-dim text-teal"
                      : "text-muted-foreground hover:bg-teal-dim hover:text-teal"
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            title="Açık / koyu tema"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition-colors hover:text-teal"
          >
            <Sun size={14} className="hidden dark:block" />
            <Moon size={14} className="block dark:hidden" />
          </button>
          <button
            onClick={toggle}
            title={hidden ? "Rakamları göster" : "Rakamları gizle"}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
              hidden
                ? "border-teal/40 bg-teal-dim text-teal"
                : "border-border bg-secondary text-muted-foreground hover:text-teal"
            )}
          >
            {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <Link
            href="/portfolio/add"
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <PlusCircle size={14} />
            Varlık Ekle
          </Link>
        </div>
      </div>
    </nav>
  );
}
