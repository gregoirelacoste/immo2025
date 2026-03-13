import { PropertyCalculations } from "@/domains/property/types";
import { MarketData } from "@/domains/market/types";
import { InvestmentScoreBreakdown } from "./types";

// --- Financial criteria (70 pts total) ---

function scoreNetYield(netYield: number): number {
  if (netYield >= 8) return 25;
  if (netYield >= 6) return 20;
  if (netYield >= 4) return 14;
  if (netYield >= 2) return 8;
  return 0;
}

function scoreCashflow(monthlyCashflow: number): number {
  if (monthlyCashflow >= 200) return 25;
  if (monthlyCashflow >= 100) return 20;
  if (monthlyCashflow >= 0) return 14;
  if (monthlyCashflow >= -100) return 7;
  return 0;
}

function scorePriceVsMarket(
  purchasePrice: number,
  surface: number,
  marketData: MarketData | null
): number {
  if (!marketData?.medianPurchasePricePerM2 || surface <= 0) return 10; // neutral

  const propertyPricePerM2 = purchasePrice / surface;
  const ratio = propertyPricePerM2 / marketData.medianPurchasePricePerM2;

  if (ratio <= 0.85) return 20;
  if (ratio <= 1.0) return 15;
  if (ratio <= 1.15) return 8;
  return 0;
}

// --- Terrain criteria (30 pts total) ---

function scoreVisit(visitRating?: number): number {
  if (visitRating == null) return 15; // neutral if no visit
  // Map 1-5 rating to 0-30
  const clamped = Math.max(1, Math.min(5, visitRating));
  const mapped: Record<number, number> = { 1: 0, 2: 8, 3: 15, 4: 23, 5: 30 };
  return mapped[clamped] ?? 15;
}

// --- Label ---

function getLabel(total: number): InvestmentScoreBreakdown["label"] {
  if (total >= 71) return "Excellent";
  if (total >= 51) return "Bon";
  if (total >= 31) return "Moyen";
  return "Faible";
}

// --- Main scoring function ---

export function computeInvestmentScore(
  property: { purchase_price: number; surface: number },
  calcs: PropertyCalculations,
  marketData: MarketData | null,
  visitRating?: number
): InvestmentScoreBreakdown {
  const netYieldScore = scoreNetYield(calcs.net_yield);
  const cashflowScore = scoreCashflow(calcs.monthly_cashflow);
  const priceVsMarketScore = scorePriceVsMarket(property.purchase_price, property.surface, marketData);
  const financialTotal = netYieldScore + cashflowScore + priceVsMarketScore;

  const visitScore = scoreVisit(visitRating);
  const terrainTotal = visitScore;

  const total = financialTotal + terrainTotal;

  return {
    netYieldScore,
    cashflowScore,
    priceVsMarketScore,
    financialTotal,
    visitScore,
    terrainTotal,
    total,
    label: getLabel(total),
  };
}
