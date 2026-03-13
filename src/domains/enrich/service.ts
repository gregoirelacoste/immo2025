import { getMarketData } from "@/domains/market/service";
import { forwardGeocode } from "@/domains/collect/geocoding";
import { calculateAll } from "@/lib/calculations";
import { computeInvestmentScore } from "./scoring";
import { EnrichmentResult } from "./types";
import { Property } from "@/domains/property/types";
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

  // Step 1: Geocoding (fail-safe)
  let latitude: number | null = null;
  let longitude: number | null = null;
  try {
    const query = property.address || property.city;
    if (query) {
      const coords = await forwardGeocode(query, property.city || undefined);
      if (coords) {
        latitude = coords.latitude;
        longitude = coords.longitude;
      }
    }
  } catch {
    /* geocoding failure is non-fatal */
  }

  // Step 2: Market data from locality database (fail-safe)
  let marketData = null;
  let marketDataJson = "";
  try {
    if (property.city) {
      marketData = await getMarketData(property.city, property.postal_code || undefined);
      marketDataJson = marketData ? JSON.stringify(marketData) : "";
    }
  } catch {
    /* market data failure is non-fatal */
  }

  // Step 3: Socio-economic data from locality database (fail-safe)
  let socioData = null;
  let socioDataJson = "";
  try {
    if (property.city) {
      socioData = await buildSocioDataFromLocality(property.city, property.postal_code || undefined);
      socioDataJson = socioData ? JSON.stringify(socioData) : "";
    }
  } catch {
    /* socio-economic failure is non-fatal */
  }

  // Step 4: Investment score
  const calcs = calculateAll(property);
  const breakdown = computeInvestmentScore(
    {
      purchase_price: property.purchase_price,
      surface: property.surface,
      monthly_rent: property.monthly_rent,
    },
    calcs,
    marketData,
    socioData
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
