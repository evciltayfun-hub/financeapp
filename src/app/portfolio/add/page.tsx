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
  ],
  US: [
    { symbol: "AAPL", name: "Apple" },
    { symbol: "MSFT", name: "Microsoft" },
    { symbol: "NVDA", name: "NVIDIA" },
    { symbol: "TSLA", name: "Tesla" },
    { symbol: "AMZN", name: "Amazon" },
    { symbol: "GOOGL", name: "Alphabet" },
  ],
  CRYPTO: [
    { symbol: "BTC", name: "Bitcoin" },
    { symbol: "ETH", name: "Ethereum" },
    { symbol: "BNB", name: "BNB" },
    { symbol: "SOL", name: "Solana" },
    { symbol: "XRP", name: "XRP" },
    { symbol: "DOGE", name: "Dogecoin" },
  ],
};

export default function AddAssetPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [assetForm, setAssetForm] = useState({ symbol: "", name: "", type: "" as AssetType | "" });
  const [lotForm, setLotForm] = useState({ quantity: "", costPriceTL: "", costPriceUSD: "", purchaseDate: "", note: "" });
  const [loading, setLoading] = useState(false);

  const selectPopular = (symbol: string, name: string) => {
    setAssetForm((f) => ({ ...f, symbol, name }));
  };

  const handleAssetNext = () => {
    if (!assetForm.symbol || !assetForm.name || !assetForm.type) {
      toast.error("Tüm alanları doldurun");
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!lotForm.quantity) {
      toast.error("Adet giriniz");
      return;
    }
    setLoading(true);
    try {
      // Create/find asset
      const assetRes = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assetForm),
      });
      const asset = await assetRes.json();
      if (!assetRes.ok) throw new Error(asset.error);

      // Add lot
      const lotRes = await fetch("/api/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, ...lotForm }),
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
                onValueChange={(v) => setAssetForm((f) => ({ ...f, type: v as AssetType, symbol: "", name: "" }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seçin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BIST">Borsa İstanbul (BIST)</SelectItem>
                  <SelectItem value="US">ABD Borsası (NYSE/NASDAQ)</SelectItem>
                  <SelectItem value="CRYPTO">Kripto Para</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {assetForm.type && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-muted-foreground text-xs">Popüler seçimler</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR[assetForm.type as keyof typeof POPULAR]?.map((p) => (
                      <button
                        key={p.symbol}
                        onClick={() => selectPopular(p.symbol, p.name)}
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

            <Button onClick={handleAssetNext} className="w-full" disabled={!assetForm.type}>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Alış Fiyatı (TL)</Label>
                <Input
                  type="number"
                  placeholder="156.40"
                  value={lotForm.costPriceTL}
                  onChange={(e) => setLotForm((f) => ({ ...f, costPriceTL: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Alış Fiyatı (USD)</Label>
                <Input
                  type="number"
                  placeholder="182.50"
                  value={lotForm.costPriceUSD}
                  onChange={(e) => setLotForm((f) => ({ ...f, costPriceUSD: e.target.value }))}
                />
              </div>
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
