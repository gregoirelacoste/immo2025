export interface MarketData {
  avgPurchasePricePerM2: number | null;
  medianPurchasePricePerM2: number | null;
  transactionCount: number;
  communeName: string;
  period: string;
  avgRentPerM2: number | null;
  rentSource: "reference" | "dvf-estimate" | null;
}
