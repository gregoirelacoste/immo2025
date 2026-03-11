import { PropertyCalculations } from "@/domains/property/types";
import { MarketData } from "@/domains/market/types";
import { InvestmentScoreBreakdown } from "./types";
import { SocioEconomicData } from "./socioeconomic-types";

// --- Financial criteria (50 pts) ---

function scoreNetYield(netYield: number): number {
  if (netYield >= 8) return 20;
  if (netYield >= 6) return 16;
  if (netYield >= 4) return 12;
  if (netYield >= 2) return 7;
  return 0;
}

function scoreCashflow(monthlyCashflow: number): number {
  if (monthlyCashflow >= 200) return 15;
  if (monthlyCashflow >= 0) return 10;
  if (monthlyCashflow >= -100) return 5;
  return 0;
}

function scorePriceVsMarket(
  purchasePrice: number,
  surface: number,
  marketData: MarketData | null
): number {
  if (!marketData?.medianPurchasePricePerM2 || surface <= 0) return 8; // neutral

  const propertyPricePerM2 = purchasePrice / surface;
  const ratio = propertyPricePerM2 / marketData.medianPurchasePricePerM2;

  if (ratio <= 0.85) return 15;
  if (ratio <= 1.0) return 11;
  if (ratio <= 1.15) return 6;
  return 0;
}

function scoreRentVsMarket(
  monthlyRent: number,
  surface: number,
  marketData: MarketData | null
): number {
  if (!marketData?.avgRentPerM2 || monthlyRent <= 0 || surface <= 0) return 5; // neutral

  const estimatedRent = marketData.avgRentPerM2 * surface;
  const ratio = monthlyRent / estimatedRent;

  if (ratio >= 1.1) return 10;
  if (ratio >= 0.95) return 7;
  if (ratio >= 0.8) return 4;
  return 0;
}

// --- Socio-economic criteria (50 pts) ---

function scoreDemographic(socio: SocioEconomicData | null): number {
  if (!socio?.population) return 5; // neutral

  let score = 0;

  // Population size (bigger = more demand)
  if (socio.population >= 100000) score += 4;
  else if (socio.population >= 30000) score += 3;
  else if (socio.population >= 10000) score += 2;
  else score += 1;

  // Age distribution bonus
  if (socio.ageDistribution) {
    const age = socio.ageDistribution;
    // Young population (20-39) = strong rental demand
    if (age.age20to39Pct > 30) score += 4;
    else if (age.age20to39Pct > 25) score += 3;
    else score += 1;

    // Very elderly population = lower rental demand
    if (age.over60Pct > 40) score -= 1;
  } else {
    score += 2; // neutral for age
  }

  return Math.max(0, Math.min(10, score));
}

function scoreIncome(socio: SocioEconomicData | null): number {
  if (!socio?.medianIncome) return 5; // neutral

  let score = 0;

  // Median income (higher = tenants can pay more, but too high = buy instead of rent)
  // Sweet spot: 20k-30k (good paying tenants, still renters)
  if (socio.medianIncome >= 18000 && socio.medianIncome <= 35000) score += 6;
  else if (socio.medianIncome >= 15000) score += 4;
  else score += 2;

  // Low poverty rate = stable tenants
  if (socio.povertyRate != null) {
    if (socio.povertyRate < 10) score += 4;
    else if (socio.povertyRate < 15) score += 3;
    else if (socio.povertyRate < 20) score += 2;
    else score += 0;
  } else {
    score += 2;
  }

  return Math.min(10, score);
}

function scoreEmployment(socio: SocioEconomicData | null): number {
  if (!socio) return 5; // neutral

  let score = 5; // base

  // Unemployment rate
  if (socio.unemploymentRate != null) {
    if (socio.unemploymentRate < 7) score = 8;
    else if (socio.unemploymentRate < 10) score = 6;
    else if (socio.unemploymentRate < 13) score = 4;
    else score = 2;
  }

  // Jobs bonus
  if (socio.totalJobs != null) {
    if (socio.totalJobs > 10000) score += 2;
    else if (socio.totalJobs > 3000) score += 1;
  }

  return Math.min(10, score);
}

function scoreAttractiveness(socio: SocioEconomicData | null): number {
  if (!socio) return 5; // neutral

  let score = 0;

  // Schools nearby
  if (socio.schoolCount != null) {
    if (socio.schoolCount >= 10) score += 3;
    else if (socio.schoolCount >= 5) score += 2;
    else if (socio.schoolCount >= 1) score += 1;
  } else {
    score += 1;
  }

  // University nearby (strong for small surfaces / coloc)
  if (socio.universityNearby === true) score += 2;
  else if (socio.universityNearby === null) score += 1;

  // Equipment score
  if (socio.equipmentScore != null) {
    score += Math.min(3, Math.round(socio.equipmentScore / 3));
  } else {
    score += 1;
  }

  // Natural risks penalty
  if (socio.riskLevel === "élevé") score -= 1;
  else if (socio.riskLevel === null || socio.riskLevel === "faible") score += 2;
  else score += 1; // moyen

  return Math.max(0, Math.min(10, score));
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
  property: { purchase_price: number; surface: number; monthly_rent: number },
  calcs: PropertyCalculations,
  marketData: MarketData | null,
  socioData: SocioEconomicData | null = null
): InvestmentScoreBreakdown {
  const netYieldScore = scoreNetYield(calcs.net_yield);
  const cashflowScore = scoreCashflow(calcs.monthly_cashflow);
  const priceVsMarketScore = scorePriceVsMarket(property.purchase_price, property.surface, marketData);
  const rentVsMarketScore = scoreRentVsMarket(property.monthly_rent, property.surface, marketData);
  const demographicScore = scoreDemographic(socioData);
  const incomeScore = scoreIncome(socioData);
  const employmentScore = scoreEmployment(socioData);
  const attractivenessScore = scoreAttractiveness(socioData);

  const total =
    netYieldScore + cashflowScore + priceVsMarketScore + rentVsMarketScore +
    demographicScore + incomeScore + employmentScore + attractivenessScore;

  return {
    netYieldScore,
    cashflowScore,
    priceVsMarketScore,
    rentVsMarketScore,
    demographicScore,
    incomeScore,
    employmentScore,
    attractivenessScore,
    total,
    label: getLabel(total),
  };
}
