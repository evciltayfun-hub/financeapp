"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Asset, PriceData, AssetWithPrice, Lot } from "@/lib/types";
import { computeAssetWithPrice, formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import { RefreshCw, Trash2, PlusCircle, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function PortfolioPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, PriceData>>({});
  const [usdTry, setUsdTry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [addLotFor, setAddLotFor] = useState<Asset | null>(null);
  const [lotForm, setLotForm] = useState({ quantity: "", costPrice: "", purchaseDate: "", note: "" });

  const loadAssets = useCallback(async () => {
    const res = await fetch("/api/assets");
    const data = await res.json();
    setAssets(data);
    return data as Asset[];
  }, []);

  const fetchPrices = useCallback(async (assetList: Asset[]) => {
    if (assetList.length === 0) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assets: assetList.map((a) => ({ symbol: a.symbol, type: a.type })) }),
      });
      const data = await res.json();
      const map: Record<string, PriceData> = {};
      data.prices?.forEach((p: PriceData) => { map[p.symbol] = p; });
      setPriceMap(map);
      if (data.usdTry) setUsdTry(data.usdTry);
      toast.success("Fiyatlar güncellendi");
    } catch {
      toast.error("Fiyatlar alınamadı");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await loadAssets();
      await fetchPrices(list);
      setLoading(false);
    })();
  }, [loadAssets, fetchPrices]);

  const deleteAsset = async (id: string) => {
    if (!confirm("Bu varlığı ve tüm lotları silmek istediğinizden emin misiniz?")) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    toast.success("Varlık silindi");
    const list = await loadAssets();
    await fetchPrices(list);
  };

  const deleteLot = async (lotId: string) => {
    if (!confirm("Bu lotu silmek istediğinizden emin misiniz?")) return;
    await fetch(`/api/lots/${lotId}`, { method: "DELETE" });
    toast.success("Lot silindi");
    const list = await loadAssets();
    await fetchPrices(list);
  };

  const addLot = async () => {
    if (!addLotFor || !lotForm.quantity) return;
    const isBIST = addLotFor.type === "BIST";
    const payload = {
      assetId: addLotFor.id,
      quantity: lotForm.quantity,
      purchaseDate: lotForm.purchaseDate,
      note: lotForm.note,
      costPriceTL: isBIST ? lotForm.costPrice : "",
      costPriceUSD: !isBIST ? lotForm.costPrice : "",
    };
    const res = await fetch("/api/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      toast.success("Lot eklendi");
      setAddLotFor(null);
      setLotForm({ quantity: "", costPrice: "", purchaseDate: "", note: "" });
      const list = await loadAssets();
      await fetchPrices(list);
    } else {
      toast.error("Lot eklenemedi");
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedAssets((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const assetsWithPrice: AssetWithPrice[] = assets.map((a) =>
    computeAssetWithPrice(a, priceMap, usdTry || 1)
  );

  const tabs = [
    { value: "ALL", label: "Tümü" },
    { value: "BIST", label: "BIST" },
    { value: "US", label: "ABD" },
    { value: "CRYPTO", label: "Kripto" },
  ];

  const renderTable = (list: AssetWithPrice[]) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Sembol</TableHead>
            <TableHead>Tür</TableHead>
            <TableHead className="text-right">Güncel Fiyat</TableHead>
            <TableHead className="text-right">Adet</TableHead>
            <TableHead className="text-right">Ort. Maliyet</TableHead>
            <TableHead className="text-right">Toplam Maliyet</TableHead>
            <TableHead className="text-right">Değer</TableHead>
            <TableHead className="text-right">K/Z (TL)</TableHead>
            <TableHead className="text-right">K/Z (%)</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.map((asset) => (
            <>
              <TableRow
                key={asset.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleExpand(asset.id)}
              >
                <TableCell>
                  {expandedAssets.has(asset.id)
                    ? <ChevronDown size={14} className="text-muted-foreground" />
                    : <ChevronRight size={14} className="text-muted-foreground" />}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-bold">{asset.symbol}</p>
                    <p className="text-xs text-muted-foreground">{asset.name}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {asset.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {asset.currentPrice !== null
                    ? asset.type === "BIST"
                      ? `${asset.currentPrice.toFixed(2)} ₺`
                      : `$${asset.currentPrice.toFixed(2)}`
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatNumber(asset.totalQuantity, asset.type === "CRYPTO" ? 4 : 0)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  {asset.type === "BIST"
                    ? asset.avgCostTL !== null ? `${asset.avgCostTL.toFixed(2)} ₺` : "—"
                    : asset.avgCostUSD !== null ? `$${asset.avgCostUSD.toFixed(2)}` : "—"}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(asset.totalCostTL)}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-medium">
                  {asset.totalValueTL > 0 ? formatCurrency(asset.totalValueTL) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className={`text-right font-mono text-sm font-medium ${asset.totalProfitTL >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {asset.totalValueTL > 0 ? formatCurrency(asset.totalProfitTL) : "—"}
                </TableCell>
                <TableCell className={`text-right font-mono text-sm font-bold ${asset.profitPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {asset.totalValueTL > 0 ? formatPercent(asset.profitPercent) : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddLotFor(asset)}>
                      <PlusCircle size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteAsset(asset.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              {expandedAssets.has(asset.id) && asset.lots.map((lot: Lot) => {
                const avgCost = lot.costPriceTL ?? (lot.costPriceUSD ? lot.costPriceUSD * (usdTry || 1) : null);
                const lotCost = avgCost ? lot.quantity * avgCost : null;
                const lotValue = asset.currentPriceTL ? lot.quantity * asset.currentPriceTL : null;
                const lotProfit = lotCost && lotValue ? lotValue - lotCost : null;
                const lotPct = lotCost && lotProfit ? (lotProfit / lotCost) * 100 : null;

                return (
                  <TableRow key={lot.id} className="bg-muted/30 text-sm">
                    <TableCell></TableCell>
                    <TableCell colSpan={2} className="text-muted-foreground pl-8">
                      {new Date(lot.purchaseDate).toLocaleDateString("tr-TR")}
                      {lot.note && <span className="ml-2 italic text-xs">— {lot.note}</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {lot.costPriceTL ? `${lot.costPriceTL.toFixed(2)} ₺` : lot.costPriceUSD ? `$${lot.costPriceUSD.toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatNumber(lot.quantity, asset.type === "CRYPTO" ? 4 : 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {lotCost ? formatCurrency(lotCost) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {lotValue ? formatCurrency(lotValue) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs ${lotProfit !== null && lotProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {lotProfit !== null ? formatCurrency(lotProfit) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs font-bold ${lotPct !== null && lotPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {lotPct !== null ? formatPercent(lotPct) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLot(lot.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </>
          ))}
          {list.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                Bu kategoride varlık yok
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Portföy</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchPrices(assets)} disabled={refreshing} className="gap-1.5">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Yenile
          </Button>
          <Link href="/portfolio/add">
            <Button size="sm" className="gap-1.5">
              <PlusCircle size={14} />
              Varlık Ekle
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary */}
      {assets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {["BIST", "US", "CRYPTO"].map((type) => {
            const items = assetsWithPrice.filter((a) => a.type === type);
            const val = items.reduce((s, a) => s + a.totalValueTL, 0);
            const cost = items.reduce((s, a) => s + a.totalCostTL, 0);
            const pct = cost > 0 ? ((val - cost) / cost) * 100 : 0;
            if (items.length === 0) return null;
            return (
              <Card key={type} className="p-3">
                <p className="text-xs text-muted-foreground">{type}</p>
                <p className="font-bold">{formatCurrency(val)}</p>
                <p className={`text-xs font-medium ${pct >= 0 ? "text-green-600" : "text-red-600"}`}>{formatPercent(pct)}</p>
              </Card>
            );
          })}
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Toplam</p>
            <p className="font-bold">{formatCurrency(assetsWithPrice.reduce((s, a) => s + a.totalValueTL, 0))}</p>
            {usdTry > 0 && (
              <p className="text-xs text-muted-foreground">$1 = {usdTry.toFixed(2)} ₺</p>
            )}
          </Card>
        </div>
      )}

      <Tabs defaultValue="ALL">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {renderTable(t.value === "ALL" ? assetsWithPrice : assetsWithPrice.filter((a) => a.type === t.value))}
          </TabsContent>
        ))}
      </Tabs>

      {/* Add Lot Dialog */}
      <Dialog open={!!addLotFor} onOpenChange={(open) => !open && setAddLotFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lot Ekle — {addLotFor?.symbol}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Adet / Miktar *</Label>
                <Input
                  type="number"
                  placeholder="100"
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
                Alış Fiyatı {addLotFor?.type === "BIST" ? "(₺)" : "($)"}
              </Label>
              <Input
                type="number"
                placeholder={addLotFor?.type === "BIST" ? "156.40" : "182.50"}
                value={lotForm.costPrice}
                onChange={(e) => setLotForm((f) => ({ ...f, costPrice: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Not (opsiyonel)</Label>
              <Input
                placeholder="İlk alım..."
                value={lotForm.note}
                onChange={(e) => setLotForm((f) => ({ ...f, note: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLotFor(null)}>İptal</Button>
            <Button onClick={addLot} disabled={!lotForm.quantity}>Ekle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
