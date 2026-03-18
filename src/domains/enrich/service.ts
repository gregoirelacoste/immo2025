import { getMarketData } from "@/domains/market/service";
import { forwardGeocode } from "@/domains/collect/geocoding";
import { calculateAll, calculateSimulation, calculateExitSimulation } from "@/lib/calculations";
import { computeInvestmentScore } from "./scoring";
import { EnrichmentResult } from "./types";
import { Property } from "@/domains/property/types";
import { getActiveSimulationForProperty } from "@/domains/simulation/repository";
import { SocioEconomicData } from "./socioeconomic-types";
import { resolveLocalityData } from "@/domains/locality/resolver";

/** Build SocioEconomicData from locality resolver (replaces INSEE/Géorisques API calls) */
async function buildSocioDataFromLocality(
  city: string,
  postalCode?: string
): Promise<SocioEconomicData | null> {
  const resolved = await resolveLocalityData(city, postalCode);
  if (!resolved) return null;

  const f = resolved.fields;

  // Need at least some socio data
  if (f.population == null && f.median_income == null && f.unemployment_rate == null) {
    return null;
  }

  return {
    communeCode: resolved.locality.code || "",
    communeName: resolved.locality.name,
    irisCode: null,
    irisName: null,
    dataLevel: "commune",
    population: f.population ?? null,
    populationYear: null,
    ageDistribution: null,
    medianIncome: f.median_income ?? null,
    povertyRate: f.poverty_rate ?? null,
    unemploymentRate: f.unemployment_rate ?? null,
    totalJobs: null,
    schoolCount: f.school_count ?? null,
    universityNearby: f.university_nearby ?? null,
    equipmentScore: f.public_transport_score ?? null,
    naturalRisks: f.natural_risks ?? [],
    riskLevel: f.risk_level ?? null,
  };
}

export async function runEnrichmentPipeline(
  property: Property
): Promise<EnrichmentResult> {
  const now = new Date().toISOString();

  // Steps 1-3 run in parallel (all fail-safe)
  const [geoResult, marketResult, socioResult, activeSim] = await Promise.all([
    // Step 1: Geocoding
    (async () => {
      try {
        const query = property.address || property.city;
        if (query) return await forwardGeocode(query, property.city || undefined);
      } catch (e) { console.warn(`Enrichment geocoding failed for "${property.city}":`, e); }
      return null;
    })(),
    // Step 2: Market data
    (async () => {
      try {
        if (property.city) return await getMarketData(property.city, property.postal_code || undefined);
      } catch (e) { console.warn(`Enrichment market data failed for "${property.city}":`, e); }
      return null;
    })(),
    // Step 3: Socio-economic data
    (async () => {
      try {
        if (property.city) return await buildSocioDataFromLocality(property.city, property.postal_code || undefined);
      } catch (e) { console.warn(`Enrichment socio data failed for "${property.city}":`, e); }
      return null;
    })(),
    // Step 4: Active (favorite) simulation (needed for score)
    getActiveSimulationForProperty(property),
  ]);

  const latitude = geoResult?.latitude ?? null;
  const longitude = geoResult?.longitude ?? null;
  const marketData = marketResult;
  const marketDataJson = marketData ? JSON.stringify(marketData) : "";
  const socioDataJson = socioResult ? JSON.stringify(socioResult) : "";
  const calcs = activeSim ? calculateSimulation(property, activeSim) : calculateAll(property);
  const exitSim = activeSim ? calculateExitSimulation(property, activeSim, calcs) : null;
  const breakdown = computeInvestmentScore(
    {
      purchase_price: property.purchase_price,
      surface: property.surface,
      monthly_rent: property.monthly_rent,
    },
    calcs,
    marketData,
    socioResult,
    undefined,
    exitSim
  );

  return {
    latitude,
    longitude,
    market_data: marketDataJson,
    socioeconomic_data: socioDataJson,
    investment_score: breakdown.total,
    score_breakdown: JSON.stringify(breakdown),
    enrichment_status: "done",
    enrichment_error: "",
    enrichment_at: now,
  };
}
