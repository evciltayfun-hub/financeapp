"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AssetType } from "@/lib/types";

const POPULAR = {
  BIST: [
    { symbol: "THYAO", name: "Türk Hava Yolları" },
    { symbol: "GARAN", name: "Garanti Bankası" },
    { symbol: "AKBNK", name: "Akbank" },
    { symbol: "EREGL", name: "Ereğli Demir Çelik" },
    { symbol: "BIMAS", name: "BİM Mağazaları" },
    { symbol: "SISE", name: "Şişecam" },
    { symbol: "KCHOL", name: "Koç Holding" },
    { symbol: "SAHOL", name: "Sabancı Holding" },
  ],
  US: [
    { symbol: "AAPL", name: "Apple" },
    { symbol: "MSFT", name: "Microsoft" },
    { symbol: "NVDA", name: "NVIDIA" },
    { symbol: "TSLA", name: "Tesla" },
    { symbol: "AMZN", name: "Amazon" },
    { symbol: "GOOGL", name: "Alphabet" },
    { symbol: "META", name: "Meta" },
    { symbol: "PLTR", name: "Palantir" },
  ],
  CRYPTO: [
    { symbol: "BTCUSD", name: "Bitcoin (USD)" },
    { symbol: "BTCUSDT", name: "Bitcoin (USDT)" },
    { symbol: "ETHUSD", name: "Ethereum (USD)" },
    { symbol: "ETHUSDT", name: "Ethereum (USDT)" },
    { symbol: "SOLUSDT", name: "Solana (USDT)" },
    { symbol: "XRPUSDT", name: "XRP (USDT)" },
    { symbol: "BNBUSDT", name: "BNB (USDT)" },
    { symbol: "DOGEUSDT", name: "Dogecoin (USDT)" },
    { symbol: "ADAUSDT", name: "Cardano (USDT)" },
    { symbol: "AVAXUSDT", name: "Avalanche (USDT)" },
    { symbol: "LINKUSDT", name: "Chainlink (USDT)" },
  ],
};

export default function AddAssetPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [assetForm, setAssetForm] = useState({ symbol: "", name: "", type: "" as AssetType | "" });
  const [lotForm, setLotForm] = useState({ quantity: "", costPrice: "", purchaseDate: "", note: "" });
  const [loading, setLoading] = useState(false);

  const isBIST = assetForm.type === "BIST";

  const handleSubmit = async () => {
    if (!lotForm.quantity) {
      toast.error("Adet giriniz");
      return;
    }
    setLoading(true);
    try {
      const assetRes = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assetForm),
      });
      const asset = await assetRes.json();
      if (!assetRes.ok) throw new Error(asset.error);

      const lotPayload = {
        assetId: asset.id,
        quantity: lotForm.quantity,
        costPriceTL: isBIST ? lotForm.costPrice : null,
        costPriceUSD: !isBIST ? lotForm.costPrice : null,
        purchaseDate: lotForm.purchaseDate,
        note: lotForm.note,
      };

      const lotRes = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lotPayload),
      });
      if (!lotRes.ok) throw new Error("Lot eklenemedi");

      toast.success(`${assetForm.symbol} portföye eklendi!`);
      router.push("/portfolio");
    } catch (e) {
      toast.error(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Varlık Ekle</h1>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Varlık Bilgileri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Piyasa Türü *</Label>
              <Select
                value={assetForm.type}
                onValueChange={(v) => setAssetForm({ symbol: "", name: "", type: v as AssetType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BIST">🇹🇷 Borsa İstanbul (BIST)</SelectItem>
                  <SelectItem value="US">🇺🇸 ABD Borsası (NYSE/NASDAQ)</SelectItem>
                  <SelectItem value="CRYPTO">₿ Kripto Para</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assetForm.type && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Hızlı seçim</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR[assetForm.type as keyof typeof POPULAR]?.map((p) => (
                      <button
                        key={p.symbol}
                        onClick={() => setAssetForm((f) => ({ ...f, symbol: p.symbol, name: p.name }))}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          assetForm.symbol === p.symbol
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary hover:text-primary"
                        }`}
                      >
                        {p.symbol}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Sembol *</Label>
                    <Input
                      placeholder={assetForm.type === "BIST" ? "THYAO" : assetForm.type === "CRYPTO" ? "BTC" : "AAPL"}
                      value={assetForm.symbol}
                      onChange={(e) => setAssetForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>İsim *</Label>
                    <Input
                      placeholder="Türk Hava Yolları"
                      value={assetForm.name}
                      onChange={(e) => setAssetForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            <Button
              onClick={() => {
                if (!assetForm.symbol || !assetForm.name || !assetForm.type) {
                  toast.error("Tüm alanları doldurun");
                  return;
                }
                setStep(2);
              }}
              className="w-full"
              disabled={!assetForm.type}
            >
              Devam →
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              2. Lot Bilgileri — <span className="text-primary">{assetForm.symbol}</span>
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                ({isBIST ? "TL ile işlem görür" : "USD ile işlem görür"})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Adet / Miktar *</Label>
                <Input
                  type="number"
                  placeholder={assetForm.type === "CRYPTO" ? "0.05" : "100"}
                  value={lotForm.quantity}
                  onChange={(e) => setLotForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Alış Tarihi</Label>
                <Input
                  type="date"
                  value={lotForm.purchaseDate}
                  onChange={(e) => setLotForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>
                Alış Fiyatı ({isBIST ? "₺ TL" : "$ USD"}) *
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {isBIST ? "₺" : "$"}
                </span>
                <Input
                  type="number"
                  className="pl-7"
                  placeholder={isBIST ? "156.40" : "182.50"}
                  value={lotForm.costPrice}
                  onChange={(e) => setLotForm((f) => ({ ...f, costPrice: e.target.value }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {isBIST
                  ? "Toplam değer USD karşılığı güncel kurdan hesaplanacak"
                  : "Toplam değer TL karşılığı güncel kurdan hesaplanacak"}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>Not (opsiyonel)</Label>
              <Input
                placeholder="İlk alım, DCA..."
                value={lotForm.note}
                onChange={(e) => setLotForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Geri</Button>
              <Button onClick={handleSubmit} disabled={loading || !lotForm.quantity} className="flex-1">
                {loading ? "Kaydediliyor..." : "Portföye Ekle"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
