import { PropertyCalculations, ExitSimulation } from "@/domains/property/types";
import { MarketData } from "@/domains/market/types";
import { SocioEconomicData } from "./socioeconomic-types";
import { InvestmentScoreBreakdown } from "./types";

// --- Utility: continuous linear interpolation ---

/** Interpolate linearly between thresholds. Returns value clamped to [0, max]. */
function lerp(value: number, lowThreshold: number, highThreshold: number, max: number): number {
  if (value <= lowThreshold) return 0;
  if (value >= highThreshold) return max;
  return Math.round(((value - lowThreshold) / (highThreshold - lowThreshold)) * max * 10) / 10;
}

/** Inverse lerp: higher input = lower score (e.g. unemployment, risk) */
function lerpInverse(value: number, lowThreshold: number, highThreshold: number, max: number): number {
  if (value <= lowThreshold) return max;
  if (value >= highThreshold) return 0;
  return Math.round(((highThreshold - value) / (highThreshold - lowThreshold)) * max * 10) / 10;
}

// --- Financial criteria (50 pts total) ---

/**
 * Net yield: 0-12 pts
 * Uses local market context when available to adjust expectations.
 * Base: 2% → 0 pts, 8% → 12 pts (continuous)
 * With market data: bonus/malus via local context.
 */
function scoreNetYield(netYield: number, marketData: MarketData | null, purchasePrice: number, surface: number): number {
  // Base score: absolute yield (0-9 pts)
  const baseScore = lerp(netYield, 1, 8, 9);

  // Local context bonus (0-3 pts): compare to estimated local yield
  let localBonus = 1.5; // neutral if no market data
  if (marketData?.avgRentPerM2 && marketData.medianPurchasePricePerM2 && surface > 0) {
    const localAnnualRentPerM2 = marketData.avgRentPerM2 * 12 * 0.9;
    const localTypicalYield = (localAnnualRentPerM2 / marketData.medianPurchasePricePerM2) * 100;
    const yieldRatio = localTypicalYield > 0 ? netYield / localTypicalYield : 1;
    localBonus = lerp(yieldRatio, 0.7, 1.3, 3);
  }

  return Math.min(12, Math.round((baseScore + localBonus) * 10) / 10);
}

/**
 * Monthly cashflow: 0-12 pts
 * 3 composantes :
 *  - Absolue (0-4 pts) : cashflow brut, indulgent autour de 0
 *  - Relative au coût projet (0-4 pts) : normalise par prix du bien
 *  - Relative au marché local (0-4 pts) : compare au cashflow typique de la ville
 */
function scoreCashflow(
  monthlyCashflow: number,
  totalProjectCost: number,
  surface: number,
  marketData: MarketData | null
): number {
  // 1) Absolute cashflow score (0-4 pts)
  const absoluteScore = lerp(monthlyCashflow, -300, 200, 4);

  // 2) Relative to project cost (0-4 pts)
  let relativeScore = 2; // neutral
  if (totalProjectCost > 0) {
    const cashflowYield = (monthlyCashflow * 12 / totalProjectCost) * 100;
    relativeScore = lerp(cashflowYield, -2, 1.5, 4);
  }

  // 3) Local market comparison (0-4 pts)
  let localScore = 2; // neutral if no data
  if (surface > 0 && marketData) {
    let typicalCashflow: number | null = null;

    if (marketData.typicalCashflowPerM2 != null) {
      typicalCashflow = marketData.typicalCashflowPerM2 * surface;
    } else if (marketData.avgRentPerM2 && marketData.medianPurchasePricePerM2) {
      const typicalMonthlyRent = marketData.avgRentPerM2 * surface * 0.9;
      const typicalTotalCost = marketData.medianPurchasePricePerM2 * surface * 1.08;
      const refMonthlyRate = 3.5 / 100 / 12;
      const refMonths = 20 * 12;
      const typicalPayment = (typicalTotalCost * refMonthlyRate * Math.pow(1 + refMonthlyRate, refMonths))
        / (Math.pow(1 + refMonthlyRate, refMonths) - 1);
      const typicalInsurance = typicalTotalCost * (0.34 / 100) / 12;
      const typicalCharges = (marketData.avgCondoChargesPerM2 ?? 15) * surface / 12
        + (marketData.avgPropertyTaxPerM2 ?? 8) * surface / 12;
      typicalCashflow = typicalMonthlyRent - typicalPayment - typicalInsurance - typicalCharges;
    }

    if (typicalCashflow != null) {
      const delta = monthlyCashflow - typicalCashflow;
      localScore = lerp(delta, -150, 150, 4);
    }
  }

  return Math.min(12, Math.round((absoluteScore + relativeScore + localScore) * 10) / 10);
}

/**
 * Price vs market: 0-10 pts (continuous)
 * Compares property price/m² to local median.
 */
function scorePriceVsMarket(
  purchasePrice: number,
  surface: number,
  marketData: MarketData | null
): number {
  if (!marketData?.medianPurchasePricePerM2 || surface <= 0 || purchasePrice <= 0) return 5; // neutral

  const propertyPricePerM2 = purchasePrice / surface;
  const ratio = propertyPricePerM2 / marketData.medianPurchasePricePerM2;

  // ratio 1.3 (30% above market) → 0 pts, ratio 0.7 (30% below) → 10 pts
  return lerpInverse(ratio, 0.7, 1.3, 10);
}

/**
 * Rent vs market: 0-10 pts
 * Compares actual rent to local average rent for the surface.
 */
function scoreRentVsMarket(
  monthlyRent: number,
  surface: number,
  marketData: MarketData | null
): number {
  if (!marketData?.avgRentPerM2 || surface <= 0 || monthlyRent <= 0) return 5; // neutral

  // Estimate expected rent for this surface
  const expectedRent = marketData.avgRentPerM2 * surface;

  // Adjust for rent elasticity if available (larger surfaces → lower rent/m²)
  let adjustedExpectedRent = expectedRent;
  if (marketData.rentElasticityAlpha && marketData.rentReferenceSurface) {
    const alpha = marketData.rentElasticityAlpha;
    const refSurface = marketData.rentReferenceSurface;
    // L = avgRent/m² × refSurface × (surface/refSurface)^alpha
    adjustedExpectedRent = marketData.avgRentPerM2 * refSurface * Math.pow(surface / refSurface, alpha);
  }

  const ratio = monthlyRent / adjustedExpectedRent;

  // ratio 0.7 (rent 30% below market) → 0 pts (bad deal for investor)
  // ratio 1.0 (at market) → 6 pts (normal)
  // ratio 1.2 (rent 20% above market, good deal) → 10 pts
  if (ratio <= 0.7) return 0;
  if (ratio <= 1.0) return lerp(ratio, 0.7, 1.0, 6);
  return Math.min(10, 6 + lerp(ratio, 1.0, 1.2, 4));
}

/**
 * Exit profit: 0-6 pts
 * Based on ROI (return on investment) from exit simulation.
 * ROI < 0% → 0 pts, ROI >= 60% → 6 pts (continuous)
 * Neutral (3 pts) when no exit data is available.
 */
function scoreExitProfit(exitSim: ExitSimulation | null): number {
  if (!exitSim) return 3; // neutral
  // ROI: 0% → 1 pt, 30% → 3 pts, 60%+ → 6 pts
  return lerp(exitSim.roi, -10, 60, 6);
}

// --- Locality criteria (35 pts total) ---

/**
 * Population dynamics: 0-7 pts
 * Growth > 0 is positive for rental demand.
 *
 * When data is at IRIS level, the population field represents the neighborhood
 * (~2000 people), not the city. We use a neutral score for population size
 * since IRIS population is not a proxy for rental demand pool size.
 */
function scorePopulation(socio: SocioEconomicData | null): number {
  if (!socio?.population) return 3.5; // neutral

  let score = 3.5; // base neutral

  // If data is IRIS-level, population is the neighborhood population (~2000-5000).
  // This is NOT representative of rental demand pool size (the whole city matters).
  // Give a neutral score for the size component — IRIS data is valuable for
  // income/poverty, not for population-as-demand-proxy.
  if (socio.dataLevel === "iris") {
    score = 2.5; // slightly below neutral since we can't assess demand pool
  } else {
    // Population size factor (0-3.5 pts): larger cities = more rental demand
    // 5k → 0, 50k+ → 3.5
    if (socio.population >= 50000) score = 3.5;
    else if (socio.population >= 5000) score = lerp(socio.population, 5000, 50000, 3.5);
    else score = 0;
  }

  return Math.min(7, Math.round(score * 10) / 10 + 3.5); // add 3.5 neutral for growth component
}

/**
 * Income level: 0-7 pts
 * Higher median income = more solvent tenants, less default risk.
 */
function scoreIncome(socio: SocioEconomicData | null): number {
  if (!socio) return 3.5; // neutral

  let score = 3.5;

  // Median income: 15000€/an → 0 pts, 25000€/an → 7 pts
  if (socio.medianIncome != null) {
    score = lerp(socio.medianIncome, 15000, 25000, 5);

    // Poverty rate malus: >25% → -2 pts
    if (socio.povertyRate != null) {
      const povertyMalus = lerp(socio.povertyRate, 10, 30, 2);
      score = Math.max(0, score - povertyMalus);
    }

    // Can go up to 7 with low poverty + high income
    score = Math.min(7, score + (socio.povertyRate != null && socio.povertyRate < 12 ? 2 : 0));
  }

  return Math.round(score * 10) / 10;
}

/**
 * Employment: 0-7 pts
 * Lower unemployment = healthier local economy.
 */
function scoreEmployment(socio: SocioEconomicData | null): number {
  if (!socio?.unemploymentRate) return 3.5; // neutral

  // 15% chômage → 0 pts, 5% → 7 pts
  return lerpInverse(socio.unemploymentRate, 5, 15, 7);
}

/**
 * Infrastructure: 0-7 pts
 * Transport, schools, university proximity.
 */
function scoreInfrastructure(socio: SocioEconomicData | null): number {
  if (!socio) return 3.5; // neutral

  let score = 0;
  let factors = 0;

  // Public transport score (0-10 input → 0-3 pts)
  if (socio.equipmentScore != null) {
    score += lerp(socio.equipmentScore, 0, 8, 3);
    factors++;
  }

  // Schools: more schools = better family attraction
  if (socio.schoolCount != null) {
    score += lerp(socio.schoolCount, 0, 15, 2);
    factors++;
  }

  // University nearby: +2 pts (student rental market)
  if (socio.universityNearby != null) {
    score += socio.universityNearby ? 2 : 0;
    factors++;
  }

  if (factors === 0) return 3.5; // neutral

  // Normalize: if only partial data, scale up proportionally
  const maxPossible = (factors >= 3) ? 7 : factors * (7 / 3);
  return Math.min(7, Math.round((score / maxPossible) * 7 * 10) / 10);
}

/**
 * Risk level: 0-7 pts
 * Lower risk = higher score.
 */
function scoreRisk(socio: SocioEconomicData | null): number {
  if (!socio?.riskLevel) return 5; // slightly optimistic neutral (most areas are low risk)

  switch (socio.riskLevel) {
    case "faible": return 7;
    case "moyen": return 4;
    case "élevé": return 1;
    default: return 5;
  }
}

// --- Terrain criteria (15 pts total) ---

function scoreVisit(visitRating?: number): number {
  if (visitRating == null) return 8; // neutral if no visit (~mid)
  const clamped = Math.max(1, Math.min(5, visitRating));
  // Continuous: 1 → 0, 5 → 15
  return Math.round(((clamped - 1) / 4) * 15 * 10) / 10;
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
  socioData: SocioEconomicData | null,
  visitRating?: number,
  exitSim?: ExitSimulation | null
): InvestmentScoreBreakdown {
  // Financial (50 pts)
  const netYieldScore = scoreNetYield(calcs.net_yield, marketData, property.purchase_price, property.surface);
  const cashflowScore = scoreCashflow(calcs.monthly_cashflow, calcs.total_project_cost, property.surface, marketData);
  const exitProfitScore = scoreExitProfit(exitSim ?? null);
  const priceVsMarketScore = scorePriceVsMarket(property.purchase_price, property.surface, marketData);
  const rentVsMarketScore = scoreRentVsMarket(property.monthly_rent, property.surface, marketData);
  const financialTotal = Math.round((netYieldScore + cashflowScore + exitProfitScore + priceVsMarketScore + rentVsMarketScore) * 10) / 10;

  // Locality (35 pts)
  const populationScore = scorePopulation(socioData);
  const incomeScore = scoreIncome(socioData);
  const employmentScore = scoreEmployment(socioData);
  const infrastructureScore = scoreInfrastructure(socioData);
  const riskScore = scoreRisk(socioData);
  const localityTotal = Math.round((populationScore + incomeScore + employmentScore + infrastructureScore + riskScore) * 10) / 10;

  // Terrain (15 pts)
  const visitScore = scoreVisit(visitRating);
  const terrainTotal = visitScore;

  const total = Math.round(financialTotal + localityTotal + terrainTotal);

  return {
    netYieldScore,
    cashflowScore,
    exitProfitScore,
    priceVsMarketScore,
    rentVsMarketScore,
    financialTotal,
    populationScore,
    incomeScore,
    employmentScore,
    infrastructureScore,
    riskScore,
    localityTotal,
    visitScore,
    terrainTotal,
    total,
    label: getLabel(total),
  };
}
