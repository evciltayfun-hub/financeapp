import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import { PrivacyProvider } from "@/lib/privacy-context";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "FinanceApp — Portföy Takibi",
  description: "BIST, Kripto ve ABD hisselerini tek yerden takip et",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`dark ${inter.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <PrivacyProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
        </PrivacyProvider>
        <Toaster richColors />
      </body>
    </html>
  );
}
