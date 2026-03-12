import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import { PrivacyProvider } from "@/lib/privacy-context";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FinanceApp — Portföy Takibi",
  description: "BIST, Kripto ve ABD hisselerini tek yerden takip et",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body className={`${geist.className} bg-background text-foreground antialiased`}>
        <PrivacyProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </PrivacyProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}
