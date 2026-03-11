import { getMarketData } from "@/domains/market/service";
import { forwardGeocode } from "@/domains/collect/geocoding";
import { calculateAll } from "@/lib/calculations";
import { computeInvestmentScore } from "./scoring";
import { EnrichmentResult } from "./types";
import { Property } from "@/domains/property/types";
import { fetchSocioEconomicData } from "./socioeconomic-service";

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

  // Step 2: Market data (fail-safe)
  let marketData = null;
  let marketDataJson = "";
  try {
    if (property.city) {
      marketData = await getMarketData(property.city);
      marketDataJson = marketData ? JSON.stringify(marketData) : "";
    }
  } catch {
    /* market data failure is non-fatal */
  }

  // Step 3: Socio-economic data (fail-safe)
  let socioData = null;
  let socioDataJson = "";
  try {
    if (property.city) {
      socioData = await fetchSocioEconomicData(property.city, latitude, longitude);
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
