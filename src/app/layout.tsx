import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinanceApp — Portföy Takibi",
  description: "BIST, Kripto ve ABD hisselerini tek yerden takip et",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body className={`${geist.className} bg-background text-foreground antialiased`}>
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Toaster richColors />
      </body>
    </html>
  );
}
