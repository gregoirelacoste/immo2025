import { MarketData } from "./types";
import { resolveLocalityData } from "@/domains/locality/resolver";

/** Resolve market data from locality database */
export async function getMarketData(
  cityName: string,
  postalCode?: string,
  codeInsee?: string
): Promise<MarketData | null> {
  if (!cityName.trim()) return null;

  const resolved = await resolveLocalityData(cityName, postalCode, codeInsee);
  if (!resolved) return null;

  const f = resolved.fields;

  // Need at least purchase price or rent data
  if (!f.avg_purchase_price_per_m2 && !f.avg_rent_per_m2) return null;

  return {
    avgPurchasePricePerM2: f.avg_purchase_price_per_m2 ?? null,
    medianPurchasePricePerM2: f.median_purchase_price_per_m2 ?? null,
    transactionCount: f.transaction_count ?? 0,
    communeName: resolved.locality.name,
    period: "Données locales",
    avgRentPerM2: f.avg_rent_per_m2 ?? null,
    rentSource: f.avg_rent_per_m2 ? "locality" : null,
    avgCondoChargesPerM2: f.avg_condo_charges_per_m2 ?? null,
    avgPropertyTaxPerM2: f.avg_property_tax_per_m2 ?? null,
    vacancyRate: f.vacancy_rate ?? null,
    avgAirbnbNightPrice: f.avg_airbnb_night_price ?? null,
    avgAirbnbOccupancyRate: f.avg_airbnb_occupancy_rate ?? null,
    rentElasticityAlpha: f.rent_elasticity_alpha ?? null,
    rentReferenceSurface: f.rent_reference_surface ?? null,
  };
}
