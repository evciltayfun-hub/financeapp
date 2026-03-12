"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { Fragment } from "react";
import { Asset, PriceData, AssetWithPrice, Lot } from "@/lib/types";
import { computeAssetWithPrice, formatCurrency, formatPercent, formatNumber } from "@/lib/utils";
import { RefreshCw, Trash2, PlusCircle, ChevronDown, ChevronRight, Wallet, ArrowUpDown, ArrowUp, ArrowDown, StickyNote, Send } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { usePrivacy } from "@/lib/privacy-context";

const HIDDEN = "••••••";

type CashBalance = { id: string; currency: string; amount: number; label: string };
type PortfolioNote = { id: string; content: string; createdAt: string };

export default function PortfolioPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, PriceData>>({});
  const [usdTry, setUsdTry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedAssets, setExpandedAssets] = useState<Set<string>>(new Set());
  const [addLotFor, setAddLotFor] = useState<Asset | null>(null);
  const [lotForm, setLotForm] = useState({ quantity: "", costPrice: "", purchaseDate: "", note: "" });
  const [cashBalances, setCashBalances] = useState<CashBalance[]>([]);
  const [showCashDialog, setShowCashDialog] = useState(false);
  const [cashForm, setCashForm] = useState({ currency: "TRY", amount: "", label: "" });
  const [notes, setNotes] = useState<PortfolioNote[]>([]);
  const [newNote, setNewNote] = useState("");
  type SortKey = "symbol" | "type" | "currentPrice" | "totalQuantity" | "avgCost" | "totalCost" | "totalValue" | "profit" | "profitPercent";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const { hidden } = usePrivacy();
  const H = (val: string) => hidden ? HIDDEN : val;

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

  const loadCash = useCallback(async () => {
    const res = await fetch("/api/cash");
    const data = await res.json();
    setCashBalances(Array.isArray(data) ? data : []);
  }, []);

  const loadNotes = useCallback(async () => {
    const res = await fetch("/api/notes");
    const data = await res.json();
    setNotes(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await loadAssets();
      await Promise.all([fetchPrices(list), loadCash(), loadNotes()]);
      setLoading(false);
    })();
  }, [loadAssets, fetchPrices, loadCash, loadNotes]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote }),
    });
    if (res.ok) {
      setNewNote("");
      await loadNotes();
    }
  };

  const deleteNote = async (id: string) => {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    await loadNotes();
  };

  const saveCash = async () => {
    if (!cashForm.amount) return;
    const res = await fetch("/api/cash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency: cashForm.currency, amount: cashForm.amount, label: cashForm.label }),
    });
    if (res.ok) {
      toast.success("Nakit güncellendi");
      setShowCashDialog(false);
      setCashForm({ currency: "TRY", amount: "", label: "" });
      await loadCash();
    } else {
      toast.error("Kaydedilemedi");
    }
  };

  const deleteCash = async (id: string) => {
    await fetch(`/api/cash/${id}`, { method: "DELETE" });
    toast.success("Nakit silindi");
    await loadCash();
  };

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

  const typeRowStyle: Record<string, React.CSSProperties> = {
    BIST:   { backgroundColor: "oklch(0.32 0.06 145)" },
    US:     { backgroundColor: "oklch(0.32 0.06 255)" },
    CRYPTO: { backgroundColor: "oklch(0.32 0.07 52)"  },
  };
  const typeBadgeStyle: Record<string, React.CSSProperties> = {
    BIST:   { borderColor: "oklch(0.55 0.18 145)", color: "oklch(0.72 0.18 145)" },
    US:     { borderColor: "oklch(0.55 0.18 255)", color: "oklch(0.72 0.18 255)" },
    CRYPTO: { borderColor: "oklch(0.60 0.20 52)",  color: "oklch(0.72 0.20 52)"  },
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown size={12} className="ml-1 opacity-30 inline" />;
    return sortDir === "asc"
      ? <ArrowUp size={12} className="ml-1 opacity-80 inline" />
      : <ArrowDown size={12} className="ml-1 opacity-80 inline" />;
  };

  const sortedList = (list: AssetWithPrice[]) => {
    if (!sortKey) return list;
    return [...list].sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === "symbol") return sortDir === "asc" ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
      if (sortKey === "type")   return sortDir === "asc" ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
      if (sortKey === "currentPrice")  { av = a.currentPrice ?? 0; bv = b.currentPrice ?? 0; }
      if (sortKey === "totalQuantity") { av = a.totalQuantity; bv = b.totalQuantity; }
      if (sortKey === "avgCost")       { av = a.type === "BIST" ? (a.avgCostTL ?? 0) : (a.avgCostUSD ?? 0); bv = b.type === "BIST" ? (b.avgCostTL ?? 0) : (b.avgCostUSD ?? 0); }
      if (sortKey === "totalCost")     { av = a.totalCostUSD; bv = b.totalCostUSD; }
      if (sortKey === "totalValue")    { av = a.totalValueUSD; bv = b.totalValueUSD; }
      if (sortKey === "profit")        { av = a.type === "BIST" ? a.totalProfitTL : a.totalProfitUSD; bv = b.type === "BIST" ? b.totalProfitTL : b.totalProfitUSD; }
      if (sortKey === "profitPercent") { av = a.profitPercent; bv = b.profitPercent; }
      return sortDir === "asc" ? av - bv : bv - av;
    });
  };

  const Th = ({ k, right, children }: { k: SortKey; right?: boolean; children: React.ReactNode }) => (
    <TableHead
      className={`${right ? "text-right" : ""} cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap`}
      onClick={() => handleSort(k)}
    >
      {children}<SortIcon k={k} />
    </TableHead>
  );

  const renderTable = (list: AssetWithPrice[]) => (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <Th k="symbol">Sembol</Th>
            <Th k="type">Tür</Th>
            <Th k="currentPrice" right>Güncel Fiyat</Th>
            <Th k="totalQuantity" right>Adet</Th>
            <Th k="avgCost" right>Ort. Maliyet</Th>
            <Th k="totalCost" right>Toplam Maliyet</Th>
            <Th k="totalValue" right>Değer</Th>
            <Th k="profit" right>K/Z</Th>
            <Th k="profitPercent" right>K/Z (%)</Th>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedList(list).map((asset) => (
            <Fragment key={asset.id}>
              <TableRow
                className="cursor-pointer hover:brightness-125 transition-all"
                style={typeRowStyle[asset.type] ?? {}}
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
                  <Badge variant="outline" className="text-xs font-semibold" style={typeBadgeStyle[asset.type]}>
                    {asset.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {asset.currentPrice !== null
                    ? H(asset.type === "BIST" ? `${asset.currentPrice.toFixed(2)} ₺` : `$${asset.currentPrice.toFixed(2)}`)
                    : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {H(formatNumber(asset.totalQuantity, asset.type === "CRYPTO" ? 4 : 0))}
                </TableCell>
                <TableCell className="text-right font-mono text-sm text-muted-foreground">
                  {H(asset.type === "BIST"
                    ? asset.avgCostTL !== null ? `${asset.avgCostTL.toFixed(2)} ₺` : "—"
                    : asset.avgCostUSD !== null ? `$${asset.avgCostUSD.toFixed(2)}` : "—")}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {asset.type === "BIST" ? (
                    H(formatCurrency(asset.totalCostTL))
                  ) : (
                    <div>
                      <div>{H(`$${asset.totalCostUSD.toFixed(2)}`)}</div>
                      <div className="text-muted-foreground">{H(formatCurrency(asset.totalCostTL))}</div>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-medium">
                  {asset.type === "BIST" ? (
                    asset.totalValueTL > 0 ? H(formatCurrency(asset.totalValueTL)) : <span className="text-muted-foreground">—</span>
                  ) : (
                    asset.totalValueUSD > 0 ? (
                      <div>
                        <div>{H(`$${asset.totalValueUSD.toFixed(2)}`)}</div>
                        <div className="text-muted-foreground">{H(formatCurrency(asset.totalValueTL))}</div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-medium">
                  {(asset.type === "BIST" ? asset.totalValueTL : asset.totalValueUSD) > 0 ? (
                    asset.type === "BIST" ? (
                      <span className={asset.totalProfitTL >= 0 ? "text-green-600" : "text-red-600"}>
                        {H(formatCurrency(asset.totalProfitTL))}
                      </span>
                    ) : (
                      <div>
                        <div className={asset.totalProfitUSD >= 0 ? "text-green-600" : "text-red-600"}>
                          {H(`$${asset.totalProfitUSD.toFixed(2)}`)}
                        </div>
                        <div className={`${asset.totalProfitTL >= 0 ? "text-green-600" : "text-red-600"} opacity-60`}>
                          {H(formatCurrency(asset.totalProfitTL))}
                        </div>
                      </div>
                    )
                  ) : "—"}
                </TableCell>
                <TableCell className={`text-right font-mono text-sm font-bold ${asset.profitPercent >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {asset.totalValueTL > 0 ? H(formatPercent(asset.profitPercent)) : "—"}
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
                const isUSD = asset.type !== "BIST";
                const lotCostPrice = isUSD ? lot.costPriceUSD : lot.costPriceTL;
                const lotCurrentPrice = isUSD ? asset.currentPriceUSD : asset.currentPriceTL;
                const lotCost = lotCostPrice != null ? lot.quantity * lotCostPrice : null;
                const lotValue = lotCurrentPrice != null ? lot.quantity * lotCurrentPrice : null;
                const lotProfit = lotCost != null && lotValue != null ? lotValue - lotCost : null;
                const lotPct = lotCost != null && lotProfit != null && lotCost > 0 ? (lotProfit / lotCost) * 100 : null;
                const fmt = (v: number) => isUSD ? `$${v.toFixed(2)}` : formatCurrency(v);

                return (
                  <TableRow key={lot.id} className="bg-muted/30 text-sm">
                    <TableCell></TableCell>
                    <TableCell colSpan={2} className="text-muted-foreground pl-8">
                      {new Date(lot.purchaseDate).toLocaleDateString("tr-TR")}
                      {lot.note && <span className="ml-2 italic text-xs">— {lot.note}</span>}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {lotCostPrice != null ? H(fmt(lotCostPrice)) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {H(formatNumber(lot.quantity, asset.type === "CRYPTO" ? 4 : 0))}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {lotCost != null ? H(fmt(lotCost)) : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {lotValue != null ? H(fmt(lotValue)) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs ${lotProfit !== null && lotProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {lotProfit !== null ? H(fmt(lotProfit)) : "—"}
                    </TableCell>
                    <TableCell className={`text-right font-mono text-xs font-bold ${lotPct !== null && lotPct >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {lotPct !== null ? H(formatPercent(lotPct)) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLot(lot.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </Fragment>
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
      {(assets.length > 0 || cashBalances.length > 0) && (() => {
        // Cash totals
        const usdRate = usdTry || 1;
        const cashTotalUSD = cashBalances.reduce((s, c) => {
          if (c.currency === "USD") return s + c.amount;
          if (c.currency === "TRY") return s + c.amount / usdRate;
          if (c.currency === "EUR") return s + c.amount * 1.08; // approx EUR/USD
          return s;
        }, 0);
        const cashTotalTL = cashBalances.reduce((s, c) => {
          if (c.currency === "TRY") return s + c.amount;
          if (c.currency === "USD") return s + c.amount * usdRate;
          if (c.currency === "EUR") return s + c.amount * 1.08 * usdRate;
          return s;
        }, 0);
        const cardStyle: Record<string, React.CSSProperties> = {
          BIST: {
            background: "linear-gradient(135deg, oklch(0.45 0.18 145) 0%, oklch(0.32 0.10 145) 100%)",
            borderColor: "oklch(0.55 0.20 145)",
          },
          US: {
            background: "linear-gradient(135deg, oklch(0.42 0.18 255) 0%, oklch(0.30 0.10 255) 100%)",
            borderColor: "oklch(0.55 0.20 255)",
          },
          CRYPTO: {
            background: "linear-gradient(135deg, oklch(0.48 0.20 52) 0%, oklch(0.33 0.11 52) 100%)",
            borderColor: "oklch(0.60 0.22 52)",
          },
        };
        const grandTotalUSD = assetsWithPrice.reduce((s, a) => s + a.totalValueUSD, 0) + cashTotalUSD;
        const grandTotalTL  = assetsWithPrice.reduce((s, a) => s + a.totalValueTL,  0) + cashTotalTL;

        return (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {["BIST", "US", "CRYPTO"].map((type) => {
              const items = assetsWithPrice.filter((a) => a.type === type);
              const valTL = items.reduce((s, a) => s + a.totalValueTL, 0);
              const valUSD = items.reduce((s, a) => s + a.totalValueUSD, 0);
              const costTL = items.reduce((s, a) => s + a.totalCostTL, 0);
              const costUSD = items.reduce((s, a) => s + a.totalCostUSD, 0);
              const profitTL = valTL - costTL;
              const profitUSD = valUSD - costUSD;
              const pct = type === "BIST"
                ? (costTL > 0 ? ((valTL - costTL) / costTL) * 100 : 0)
                : (costUSD > 0 ? ((valUSD - costUSD) / costUSD) * 100 : 0);
              if (items.length === 0) return null;
              return (
                <Card key={type} className="p-4" style={cardStyle[type]}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/50">{type}</p>
                  <p className="text-2xl font-bold mt-1">{H(`$${valUSD.toFixed(2)}`)}</p>
                  <p className="text-base font-semibold text-white/60">{H(formatCurrency(valTL))}</p>
                  <p className={`text-sm font-medium mt-1 ${pct >= 0 ? "text-green-400" : "text-red-400"}`}>{H(formatPercent(pct))}</p>
                  <p className={`text-sm ${(type === "BIST" ? profitTL : profitUSD) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    K/Z: {H(type === "BIST" ? formatCurrency(profitTL) : `$${profitUSD.toFixed(2)}`)}
                  </p>
                </Card>
              );
            })}

            {/* Nakit Kartı */}
            <Card className="p-4" style={{ background: "linear-gradient(135deg, oklch(0.38 0.10 220) 0%, oklch(0.27 0.05 220) 100%)", borderColor: "oklch(0.55 0.16 220)" }}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1">
                  <Wallet size={11} /> Nakit
                </p>
                <Button
                  variant="ghost" size="icon"
                  className="h-5 w-5 text-white/50 hover:text-white hover:bg-white/10"
                  onClick={() => { setCashForm({ currency: "TRY", amount: "", label: "" }); setShowCashDialog(true); }}
                >
                  <PlusCircle size={12} />
                </Button>
              </div>
              {cashBalances.length === 0 ? (
                <p className="text-sm text-white/40 mt-2">Nakit yok</p>
              ) : (
                <div className="mt-1 space-y-0.5">
                  {cashBalances.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-sm group">
                      <span className="text-white/60">{c.label || c.currency}</span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">
                          {H(c.currency === "TRY" ? formatCurrency(c.amount) : c.currency === "USD" ? `$${c.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}` : `€${c.amount.toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`)}
                        </span>
                        <button onClick={() => { setCashForm({ currency: c.currency, amount: String(c.amount), label: c.label }); setShowCashDialog(true); }} className="opacity-0 group-hover:opacity-100 text-white/40 hover:text-white transition-opacity text-xs">✏</button>
                        <button onClick={() => deleteCash(c.id)} className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-opacity text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-base font-bold">{H(`$${cashTotalUSD.toFixed(2)}`)}</p>
                <p className="text-sm text-white/60">{H(formatCurrency(cashTotalTL))}</p>
              </div>
            </Card>

            {/* Toplam (varlık + nakit) */}
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Toplam</p>
              <p className="text-2xl font-bold mt-1">{H(`$${grandTotalUSD.toFixed(2)}`)}</p>
              <p className="text-base font-semibold text-muted-foreground">{H(formatCurrency(grandTotalTL))}</p>
              {usdTry > 0 && (
                <p className="text-xs text-muted-foreground mt-1">$1 = {H(`${usdTry.toFixed(2)} ₺`)}</p>
              )}
            </Card>

            {/* Dağılım */}
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Dağılım</p>
              {["BIST", "US", "CRYPTO"].map((type) => {
                const items = assetsWithPrice.filter((a) => a.type === type);
                if (items.length === 0) return null;
                const val = items.reduce((s, a) => s + a.totalValueTL, 0);
                const pct = grandTotalTL > 0 ? (val / grandTotalTL) * 100 : 0;
                return (
                  <div key={type} className="flex items-center justify-between text-sm py-0.5">
                    <span className="text-muted-foreground">{type}</span>
                    <span className="font-semibold">{pct.toFixed(1)}%</span>
                  </div>
                );
              })}
              {cashTotalTL > 0 && (
                <div className="flex items-center justify-between text-sm py-0.5">
                  <span className="text-muted-foreground">Nakit</span>
                  <span className="font-semibold">{grandTotalTL > 0 ? ((cashTotalTL / grandTotalTL) * 100).toFixed(1) : "0.0"}%</span>
                </div>
              )}
            </Card>
          </div>
        );
      })()}

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

      {/* Notlar */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2 text-muted-foreground">
          <StickyNote size={16} /> Notlar
        </h2>
        <div className="flex gap-2">
          <textarea
            className="flex-1 min-h-[72px] rounded-md border bg-card text-foreground px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            placeholder="Not ekle... (Ctrl+Enter ile kaydet)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote(); }}
          />
          <Button size="sm" className="self-end gap-1.5" onClick={addNote} disabled={!newNote.trim()}>
            <Send size={13} /> Ekle
          </Button>
        </div>
        {notes.length > 0 && (
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="group flex gap-3 rounded-md border bg-card px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {new Date(n.createdAt).toLocaleString("tr-TR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                  </p>
                </div>
                <button
                  onClick={() => deleteNote(n.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity shrink-0 mt-0.5"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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

      {/* Cash Dialog */}
      <Dialog open={showCashDialog} onOpenChange={(open) => !open && setShowCashDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nakit Ekle / Güncelle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Para Birimi</Label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={cashForm.currency}
                onChange={(e) => setCashForm((f) => ({ ...f, currency: e.target.value }))}
              >
                <option value="TRY">TRY — Türk Lirası</option>
                <option value="USD">USD — Amerikan Doları</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Miktar</Label>
              <Input
                type="number"
                placeholder="10000"
                value={cashForm.amount}
                onChange={(e) => setCashForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Etiket (opsiyonel)</Label>
              <Input
                placeholder="Vadesiz hesap, Cüzdan..."
                value={cashForm.label}
                onChange={(e) => setCashForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashDialog(false)}>İptal</Button>
            <Button onClick={saveCash} disabled={!cashForm.amount}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
