import { PropertyCalculations } from "@/domains/property/types";
import { MarketData } from "@/domains/market/types";
import { InvestmentScoreBreakdown } from "./types";

function scoreNetYield(netYield: number): number {
  if (netYield >= 8) return 30;
  if (netYield >= 6) return 25;
  if (netYield >= 4) return 18;
  if (netYield >= 2) return 10;
  return 0;
}

function scoreCashflow(monthlyCashflow: number): number {
  if (monthlyCashflow >= 200) return 25;
  if (monthlyCashflow >= 0) return 15;
  if (monthlyCashflow >= -100) return 8;
  return 0;
}

function scorePriceVsMarket(
  purchasePrice: number,
  surface: number,
  marketData: MarketData | null
): number {
  if (!marketData?.medianPurchasePricePerM2 || surface <= 0) return 12;

  const propertyPricePerM2 = purchasePrice / surface;
  const ratio = propertyPricePerM2 / marketData.medianPurchasePricePerM2;

  if (ratio <= 0.85) return 25;
  if (ratio <= 1.0) return 18;
  if (ratio <= 1.15) return 10;
  return 0;
}

function scoreRentVsMarket(
  monthlyRent: number,
  surface: number,
  marketData: MarketData | null
): number {
  if (!marketData?.avgRentPerM2 || monthlyRent <= 0 || surface <= 0) return 10;

  const estimatedRent = marketData.avgRentPerM2 * surface;
  const ratio = monthlyRent / estimatedRent;

  if (ratio >= 1.1) return 20;
  if (ratio >= 0.95) return 15;
  if (ratio >= 0.8) return 8;
  return 0;
}

function getLabel(
  total: number
): InvestmentScoreBreakdown["label"] {
  if (total >= 71) return "Excellent";
  if (total >= 51) return "Bon";
  if (total >= 31) return "Moyen";
  return "Faible";
}

export function computeInvestmentScore(
  property: { purchase_price: number; surface: number; monthly_rent: number },
  calcs: PropertyCalculations,
  marketData: MarketData | null
): InvestmentScoreBreakdown {
  const netYieldScore = scoreNetYield(calcs.net_yield);
  const cashflowScore = scoreCashflow(calcs.monthly_cashflow);
  const priceVsMarketScore = scorePriceVsMarket(
    property.purchase_price,
    property.surface,
    marketData
  );
  const rentVsMarketScore = scoreRentVsMarket(
    property.monthly_rent,
    property.surface,
    marketData
  );

  const total =
    netYieldScore + cashflowScore + priceVsMarketScore + rentVsMarketScore;

  return {
    netYieldScore,
    cashflowScore,
    priceVsMarketScore,
    rentVsMarketScore,
    total,
    label: getLabel(total),
  };
}
