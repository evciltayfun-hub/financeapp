import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Asset, AssetWithPrice, PriceData } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: "TRY" | "USD" = "TRY"): string {
  if (currency === "TRY") {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function computeAssetWithPrice(
  asset: Asset,
  priceMap: Record<string, PriceData>,
  usdTry: number
): AssetWithPrice {
  const priceData = priceMap[asset.symbol];
  const currentPrice = priceData?.price ?? null;

  const totalQuantity = asset.lots.reduce((sum, l) => sum + l.quantity, 0);

  let totalCostTL = 0;
  for (const lot of asset.lots) {
    if (lot.costPriceTL !== null) {
      totalCostTL += lot.quantity * lot.costPriceTL;
    } else if (lot.costPriceUSD !== null) {
      totalCostTL += lot.quantity * lot.costPriceUSD * usdTry;
    }
  }

  let currentPriceTL: number | null = null;
  let totalValueTL = 0;

  if (currentPrice !== null) {
    if (asset.type === "BIST") {
      currentPriceTL = currentPrice;
    } else {
      currentPriceTL = currentPrice * usdTry;
    }
    totalValueTL = totalQuantity * currentPriceTL;
  }

  const totalProfitTL = totalValueTL - totalCostTL;
  const profitPercent = totalCostTL > 0 ? (totalProfitTL / totalCostTL) * 100 : 0;

  return {
    ...asset,
    currentPrice,
    currentPriceTL,
    totalCostTL,
    totalValueTL,
    totalProfitTL,
    profitPercent,
    totalQuantity,
  };
}

export const MONTH_NAMES = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
