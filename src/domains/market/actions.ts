"use server";

import { getMarketData } from "@/domains/market/service";
import { MarketData } from "@/domains/market/types";
import { calculateDegressiveRent } from "@/domains/market/rent-degressive";

export async function fetchMarketDataForCity(
  city: string
): Promise<MarketData | null> {
  try {
    return await getMarketData(city);
  } catch {
    return null;
  }
}

/**
 * Estimate monthly rent for a city + surface.
 * Returns { rent, source } or null if no data available.
 */
export async function estimateMonthlyRent(
  city: string,
  surface: number
): Promise<{ rent: number; source: string } | null> {
  if (!city.trim() || surface <= 0) return null;

  try {
    const market = await getMarketData(city);
    if (!market?.avgRentPerM2) return null;

    const rent = calculateDegressiveRent(
      market.avgRentPerM2,
      surface,
      market.rentElasticityAlpha ?? undefined,
      market.rentReferenceSurface ?? undefined
    );
    const source =
      market.rentSource === "locality"
        ? "Données locales"
        : market.rentSource === "reference"
          ? "Observatoire des loyers"
          : "Estimation DVF (5.5%)";

    return { rent, source };
  } catch {
    return null;
  }
}
