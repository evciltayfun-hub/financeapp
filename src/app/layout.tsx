import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Navbar from "@/components/navbar";
import { PrivacyProvider } from "@/lib/privacy-context";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "FinanceApp — Portföy Takibi",
  description: "BIST, Kripto ve ABD hisselerini tek yerden takip et",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <body className="font-sans bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <PrivacyProvider>
            <Navbar />
            <main className="min-h-screen">{children}</main>
          </PrivacyProvider>
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
