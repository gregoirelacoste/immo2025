import { getMarketData } from "@/domains/market/service";
import { forwardGeocode } from "@/domains/collect/geocoding";
import { calculateAll, calculateSimulation, calculateExitSimulation } from "@/lib/calculations";
import { computeInvestmentScore } from "./scoring";
import { EnrichmentResult } from "./types";
import { Property } from "@/domains/property/types";
import { getActiveSimulationForProperty } from "@/domains/simulation/repository";
import { SocioEconomicData } from "./socioeconomic-types";
import { resolveLocalityData } from "@/domains/locality/resolver";
import { ensureLocalityEnriched } from "@/domains/locality/enrichment/ensure";

/**
 * Build SocioEconomicData from locality resolver.
 * When irisCode is provided, resolves from the IRIS quartier locality
 * with field-by-field fallback to the parent commune.
 */
async function buildSocioDataFromLocality(
  city: string,
  postalCode?: string,
  irisCode?: string
): Promise<SocioEconomicData | null> {
  const resolved = await resolveLocalityData(city, postalCode, undefined, irisCode);
  if (!resolved) return null;

  const f = resolved.fields;

  // Need at least some socio data
  if (f.population == null && f.median_income == null && f.unemployment_rate == null) {
    return null;
  }

  // Determine data level from field sources: if key socio fields come from a quartier, it's IRIS
  const incomeSource = resolved.fieldSources.median_income;
  const isIris = incomeSource?.localityType === "quartier";

  // Find commune info: either the locality itself or its ancestor
  let communeCode = resolved.locality.code || "";
  let communeName = resolved.locality.name;
  if (resolved.locality.type === "quartier") {
    // Find the commune in the field sources or use code prefix
    const communeFieldSource = Object.values(resolved.fieldSources).find(
      (s) => s?.localityType === "ville"
    );
    if (communeFieldSource) {
      communeName = communeFieldSource.localityName;
    }
    communeCode = resolved.locality.code.slice(0, 5); // IRIS code prefix = commune code
  }

  return {
    communeCode,
    communeName,
    irisCode: isIris ? resolved.locality.code : null,
    irisName: isIris ? resolved.locality.name : null,
    dataLevel: isIris ? "iris" : "commune",
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

  // Phase 1: Geocoding + market data in parallel (no IRIS dependency)
  const [geoResult, marketResult, activeSim] = await Promise.all([
    (async () => {
      try {
        const query = property.address || property.city;
        if (query) return await forwardGeocode(query, property.city || undefined);
      } catch (e) { console.warn(`Enrichment geocoding failed for "${property.city}":`, e); }
      return null;
    })(),
    (async () => {
      try {
        if (property.city) return await getMarketData(property.city, property.postal_code || undefined);
      } catch (e) { console.warn(`Enrichment market data failed for "${property.city}":`, e); }
      return null;
    })(),
    getActiveSimulationForProperty(property),
  ]);

  const latitude = geoResult?.latitude ?? property.latitude ?? null;
  const longitude = geoResult?.longitude ?? property.longitude ?? null;

  // Phase 2: IRIS resolution (depends on geocoding coordinates)
  let irisCode: string | undefined;
  if (latitude && longitude && property.city) {
    try {
      const result = await ensureLocalityEnriched(
        property.city,
        property.postal_code || undefined,
        undefined,
        { latitude, longitude }
      );
      if (result && "irisCode" in result) {
        irisCode = result.irisCode;
      }
    } catch (e) {
      console.warn(`IRIS resolution failed for "${property.city}":`, e);
    }
  }

  // Phase 3: Socio-economic data (IRIS-aware, depends on phase 2)
  let socioResult: SocioEconomicData | null = null;
  try {
    if (property.city) {
      socioResult = await buildSocioDataFromLocality(
        property.city,
        property.postal_code || undefined,
        irisCode
      );
    }
  } catch (e) {
    console.warn(`Enrichment socio data failed for "${property.city}":`, e);
  }

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
