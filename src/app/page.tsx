"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Asset, PriceData, AssetWithPrice } from "@/lib/types";
import { computeAssetWithPrice, formatCurrency, formatPercent } from "@/lib/utils";
import { RefreshCw, TrendingUp, TrendingDown, Wallet, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, PriceData>>({});
  const [usdTry, setUsdTry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAssets = useCallback(async () => {
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
        body: JSON.stringify({
          assets: assetList.map((a) => ({ symbol: a.symbol, type: a.type })),
        }),
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

  const init = useCallback(async () => {
    setLoading(true);
    const assetList = await fetchAssets();
    await fetchPrices(assetList);
    setLoading(false);
  }, [fetchAssets, fetchPrices]);

  useEffect(() => { init(); }, [init]);

  const assetsWithPrice: AssetWithPrice[] = assets.map((a) =>
    computeAssetWithPrice(a, priceMap, usdTry || 1)
  );

  const totalValue = assetsWithPrice.reduce((s, a) => s + a.totalValueTL, 0);
  const totalCost = assetsWithPrice.reduce((s, a) => s + a.totalCostTL, 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPct = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const byType = {
    BIST: assetsWithPrice.filter((a) => a.type === "BIST"),
    US: assetsWithPrice.filter((a) => a.type === "US"),
    CRYPTO: assetsWithPrice.filter((a) => a.type === "CRYPTO"),
  };

  const typeLabels = { BIST: "Borsa İstanbul", US: "ABD Hisseleri", CRYPTO: "Kripto" };
  const typeColors = {
    BIST: "bg-blue-500/10 text-blue-600 border-blue-200",
    US: "bg-purple-500/10 text-purple-600 border-purple-200",
    CRYPTO: "bg-orange-500/10 text-orange-600 border-orange-200",
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {usdTry > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              USD/TRY: {usdTry.toFixed(2)} ₺
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchPrices(assets)}
          disabled={refreshing}
          className="gap-1.5"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Yenile
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet size={14} /> Toplam Portföy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            <p className="text-sm text-muted-foreground mt-1">{assets.length} varlık</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign size={14} /> Toplam Maliyet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>

        <Card className={totalProfit >= 0 ? "border-green-200" : "border-red-200"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {totalProfit >= 0
                ? <TrendingUp size={14} className="text-green-500" />
                : <TrendingDown size={14} className="text-red-500" />}
              Kar / Zarar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(totalProfit)}
            </p>
            <p className={`text-sm font-medium mt-1 ${totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatPercent(totalProfitPct)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dağılım</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {Object.entries(byType).map(([type, items]) => {
              const val = items.reduce((s, a) => s + a.totalValueTL, 0);
              const pct = totalValue > 0 ? (val / totalValue) * 100 : 0;
              return (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{typeLabels[type as keyof typeof typeLabels]}</span>
                  <span className="font-medium">{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {Object.entries(byType).map(([type, items]) => {
        if (items.length === 0) return null;
        const typeValue = items.reduce((s, a) => s + a.totalValueTL, 0);
        const typeCost = items.reduce((s, a) => s + a.totalCostTL, 0);
        const typeProfit = typeValue - typeCost;
        const typePct = typeCost > 0 ? (typeProfit / typeCost) * 100 : 0;

        return (
          <div key={type}>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-semibold">{typeLabels[type as keyof typeof typeLabels]}</h2>
              <Badge variant="outline" className={typeColors[type as keyof typeof typeColors]}>
                {formatCurrency(typeValue)}
              </Badge>
              <span className={`text-sm font-medium ${typeProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatPercent(typePct)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((asset) => (
                <Card key={asset.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-base">{asset.symbol}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">{asset.name}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${asset.profitPercent >= 0 ? "text-green-600 border-green-200 bg-green-50" : "text-red-600 border-red-200 bg-red-50"}`}
                      >
                        {formatPercent(asset.profitPercent)}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Güncel fiyat</span>
                        <span className="font-medium">
                          {asset.currentPrice !== null
                            ? asset.type === "BIST"
                              ? `${asset.currentPrice.toFixed(2)} ₺`
                              : `$${asset.currentPrice.toFixed(asset.type === "CRYPTO" && asset.currentPrice > 1 ? 2 : 4)}`
                            : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Değer</span>
                        <span className="font-medium">{formatCurrency(asset.totalValueTL)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">K/Z</span>
                        <span className={`font-medium ${asset.totalProfitTL >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(asset.totalProfitTL)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {assets.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Henüz varlık eklenmedi</p>
          <p className="text-sm">Sağ üstten &quot;Varlık Ekle&quot; butonuyla başlayabilirsin</p>
        </div>
      )}
    </div>
  );
}
