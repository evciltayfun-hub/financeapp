"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { TrendingUp, PlusCircle, Eye, EyeOff, LineChart } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";

const navItems = [
  { href: "/portfolio", label: "Portföy", icon: TrendingUp },
  { href: "/watchlist", label: "Takip", icon: LineChart },
];

export default function Navbar() {
  const pathname = usePathname();
  const { hidden, toggle } = usePrivacy();

  return (
    <nav className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-bold text-lg tracking-tight">💹 FinanceApp</span>
          <div className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  pathname === href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            title={hidden ? "Rakamları göster" : "Rakamları gizle"}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
              hidden
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
          <Link
            href="/portfolio/add"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <PlusCircle size={15} />
            Varlık Ekle
          </Link>
        </div>
      </div>
    </nav>
  );
}
