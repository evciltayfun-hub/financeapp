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
  // Planlanan
  netSalary: number;
  spendingTarget: number;
  besInvestment: number;
  investmentTarget: number;
  // Gerçekler
  actualInvestment: number;
  remainingCash: number;
  creditCardTL: number;
  creditCardEUR: number;
  netAmount: number;
  note: string | null;
  isChecked: boolean;
  extraAmount: number;
  isExtraChecked: boolean;
}

export interface AssetWithPrice extends Asset {
  currentPrice: number | null;
  currentPriceTL: number | null;
  currentPriceUSD: number | null;
  totalCostTL: number;
  totalCostUSD: number;
  totalValueTL: number;
  totalValueUSD: number;
  totalProfitTL: number;
  totalProfitUSD: number;
  profitPercent: number;
  totalQuantity: number;
  avgCostTL: number | null;   // ortalama maliyet TL/adet
  avgCostUSD: number | null;  // ortalama maliyet USD/adet
}
