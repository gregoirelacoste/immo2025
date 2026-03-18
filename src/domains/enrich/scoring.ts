import { PropertyCalculations } from "@/domains/property/types";
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
 * Net yield: 0-15 pts
 * Uses local market context when available to adjust expectations.
 * Base: 2% → 0 pts, 8% → 15 pts (continuous)
 * With market data: bonus/malus if yield is above/below local average yield.
 */
function scoreNetYield(netYield: number, marketData: MarketData | null, purchasePrice: number, surface: number): number {
  // Base score: absolute yield (0-12 pts)
  const baseScore = lerp(netYield, 1, 8, 12);

  // Local context bonus (0-3 pts): compare to estimated local yield
  let localBonus = 1.5; // neutral if no market data
  if (marketData?.avgRentPerM2 && marketData.medianPurchasePricePerM2 && surface > 0) {
    // Estimate local typical yield: (rent/m2 × 12 × 0.9) / price/m2
    const localAnnualRentPerM2 = marketData.avgRentPerM2 * 12 * 0.9; // 10% vacancy/charges approx
    const localTypicalYield = (localAnnualRentPerM2 / marketData.medianPurchasePricePerM2) * 100;

    // How does our yield compare? Ratio > 1 = better than local average
    const yieldRatio = localTypicalYield > 0 ? netYield / localTypicalYield : 1;
    // 0.7x local → 0 pts, 1.3x local → 3 pts
    localBonus = lerp(yieldRatio, 0.7, 1.3, 3);
  }

  return Math.min(15, Math.round((baseScore + localBonus) * 10) / 10);
}

/**
 * Monthly cashflow: 0-15 pts
 * 3 composantes :
 *  - Absolue (0-5 pts) : cashflow brut, indulgent autour de 0
 *  - Relative au coût projet (0-5 pts) : normalise par prix du bien
 *  - Relative au marché local (0-5 pts) : compare au cashflow typique de la ville
 *
 * Le cashflow typique local est estimé à partir du loyer/m² et prix/m² du marché.
 * Dans les villes où le cashflow est structurellement négatif (prix élevés),
 * un cashflow légèrement négatif reste bien noté s'il est meilleur que la moyenne locale.
 */
function scoreCashflow(
  monthlyCashflow: number,
  totalProjectCost: number,
  surface: number,
  marketData: MarketData | null
): number {
  // 1) Absolute cashflow score (0-5 pts)
  // Plus indulgent : -100€ → 2 pts (pas 0), 0€ → 3.5 pts, +200€ → 5 pts
  const absoluteScore = lerp(monthlyCashflow, -300, 200, 5);

  // 2) Relative to project cost (0-5 pts) : cashflow yield annualisé
  let relativeScore = 2.5; // neutral
  if (totalProjectCost > 0) {
    const cashflowYield = (monthlyCashflow * 12 / totalProjectCost) * 100;
    // -2% → 0 pts, +1.5% → 5 pts
    relativeScore = lerp(cashflowYield, -2, 1.5, 5);
  }

  // 3) Local market comparison (0-5 pts)
  // Estime le cashflow typique de la ville à partir de rent/m² et price/m²
  let localScore = 2.5; // neutral if no data
  if (marketData?.avgRentPerM2 && marketData.medianPurchasePricePerM2 && surface > 0) {
    // Cashflow typique local simplifié :
    // loyer mensuel typique = rent/m² × surface × 0.9 (vacance)
    const typicalMonthlyRent = marketData.avgRentPerM2 * surface * 0.9;
    // prix typique = price/m² × surface × 1.08 (frais notaire + frais)
    const typicalTotalCost = marketData.medianPurchasePricePerM2 * surface * 1.08;
    // mensualité typique sur 20 ans à 3.5% + assurance 0.34%
    const refMonthlyRate = 3.5 / 100 / 12;
    const refMonths = 20 * 12;
    const typicalPayment = (typicalTotalCost * refMonthlyRate * Math.pow(1 + refMonthlyRate, refMonths))
      / (Math.pow(1 + refMonthlyRate, refMonths) - 1);
    const typicalInsurance = typicalTotalCost * (0.34 / 100) / 12;
    // charges typiques (copro + taxe foncière) estimées
    const typicalCharges = (marketData.avgCondoChargesPerM2 ?? 15) * surface / 12
      + (marketData.avgPropertyTaxPerM2 ?? 8) * surface / 12;
    const typicalCashflow = typicalMonthlyRent - typicalPayment - typicalInsurance - typicalCharges;

    // Écart par rapport au cashflow local typique
    const delta = monthlyCashflow - typicalCashflow;
    // -150€ pire que local → 0 pts, +150€ mieux que local → 5 pts
    localScore = lerp(delta, -150, 150, 5);
  }

  return Math.min(15, Math.round((absoluteScore + relativeScore + localScore) * 10) / 10);
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

// --- Locality criteria (35 pts total) ---

/**
 * Population dynamics: 0-7 pts
 * Growth > 0 is positive for rental demand.
 */
function scorePopulation(socio: SocioEconomicData | null): number {
  if (!socio?.population) return 3.5; // neutral

  let score = 3.5; // base neutral

  // Population size factor (0-3.5 pts): larger cities = more rental demand
  // 5k → 0, 50k+ → 3.5
  if (socio.population >= 50000) score = 3.5;
  else if (socio.population >= 5000) score = lerp(socio.population, 5000, 50000, 3.5);
  else score = 0;

  // TODO: Use population_growth_pct when available in SocioEconomicData
  // For now, base score on population size (proxy for demand)
  // Larger cities have more tenant pool = less vacancy risk

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
  visitRating?: number
): InvestmentScoreBreakdown {
  // Financial (50 pts)
  const netYieldScore = scoreNetYield(calcs.net_yield, marketData, property.purchase_price, property.surface);
  const cashflowScore = scoreCashflow(calcs.monthly_cashflow, calcs.total_project_cost, property.surface, marketData);
  const priceVsMarketScore = scorePriceVsMarket(property.purchase_price, property.surface, marketData);
  const rentVsMarketScore = scoreRentVsMarket(property.monthly_rent, property.surface, marketData);
  const financialTotal = Math.round((netYieldScore + cashflowScore + priceVsMarketScore + rentVsMarketScore) * 10) / 10;

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
