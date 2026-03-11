export type AssetType = "BIST" | "US" | "CRYPTO";

export interface Lot {
  id: string;
  assetId: string;
  quantity: number;
  costPriceTL: number | null;
  costPriceUSD: number | null;
  purchaseDate: string;
  note: string | null;
}

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  lots: Lot[];
}

export interface PriceData {
  symbol: string;
  price: number | null;
  currency: string;
}

export interface MonthlyGoal {
  id: string;
  year: number;
  month: number;
  incomeTarget: number;
  savingTarget: number;
  actualIncome: number;
  actualExpense: number;
  note: string | null;
}

export interface AssetWithPrice extends Asset {
  currentPrice: number | null;
  currentPriceTL: number | null;
  totalCostTL: number;
  totalValueTL: number;
  totalProfitTL: number;
  profitPercent: number;
  totalQuantity: number;
}
