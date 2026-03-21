export interface MarketData {
  avgPurchasePricePerM2: number | null;
  medianPurchasePricePerM2: number | null;
  transactionCount: number;
  communeName: string;
  period: string;
  avgRentPerM2: number | null;
  rentSource: "reference" | "dvf-estimate" | "locality" | null;
  // Extended fields from locality data
  avgCondoChargesPerM2: number | null;
  avgPropertyTaxPerM2: number | null;
  vacancyRate: number | null;
  avgAirbnbNightPrice: number | null;
  avgAirbnbOccupancyRate: number | null;
  // Prix segmentés par nombre de pièces
  avgPriceT1PerM2: number | null;
  avgPriceT2PerM2: number | null;
  avgPriceT3PerM2: number | null;
  avgPriceT4PlusPerM2: number | null;
  // Dégressivité loyer (loi de puissance)
  rentElasticityAlpha: number | null;
  rentReferenceSurface: number | null;
  // Cashflow local typique
  typicalCashflowPerM2: number | null; // €/m²/mois — négatif dans marchés tendus
}
