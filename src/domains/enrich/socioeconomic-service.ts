/**
 * Orchestrates all socio-economic data fetching for a commune.
 * Each source is fail-safe: if one fails, others continue.
 */

import { getCommuneCode } from "@/domains/market/dvf-client";
import { fetchInseeDemographics } from "./insee/demographics";
import { fetchInseeEconomics } from "./insee/economics";
import { fetchEducationData } from "./education";
import { fetchGeorisques } from "./georisques";
import { SocioEconomicData, inferPopulationProfile } from "./socioeconomic-types";

/**
 * Fetch population from geo.api.gouv.fr (free, no key needed)
 * Fallback when INSEE API is not configured
 */
async function fetchPopulationFromGeoApi(communeCode: string): Promise<{ population: number | null; communeName: string }> {
  try {
    const res = await fetch(
      `https://geo.api.gouv.fr/communes/${communeCode}?fields=nom,population`
    );
    if (!res.ok) return { population: null, communeName: "" };

    const data = await res.json();
    return {
      population: data.population ?? null,
      communeName: data.nom ?? "",
    };
  } catch {
    return { population: null, communeName: "" };
  }
}

/**
 * Main entry point: fetch all socio-economic data for a city.
 * Requires city name to look up commune code.
 */
export async function fetchSocioEconomicData(
  cityName: string,
  latitude: number | null,
  longitude: number | null
): Promise<SocioEconomicData | null> {
  if (!cityName.trim()) return null;

  // Step 1: Get commune code (we already have this via geo.api.gouv.fr)
  const commune = await getCommuneCode(cityName);
  if (!commune) return null;

  const communeCode = commune.code;

  // Step 2: Fetch all data in parallel
  const [
    geoPopulation,
    inseeDemographics,
    inseeEconomics,
    educationData,
    georisquesData,
  ] = await Promise.all([
    fetchPopulationFromGeoApi(communeCode),
    fetchInseeDemographics(communeCode).catch(() => ({ population: null, ageDistribution: null })),
    fetchInseeEconomics(communeCode).catch(() => ({ medianIncome: null, povertyRate: null, unemploymentRate: null, totalJobs: null })),
    fetchEducationData(communeCode, latitude, longitude).catch(() => ({ schoolCount: 0, universityNearby: false })),
    (latitude != null && longitude != null)
      ? fetchGeorisques(latitude, longitude).catch(() => ({ risks: [] as never[], riskLevel: null as "faible" | "moyen" | "élevé" | null }))
      : Promise.resolve({ risks: [] as never[], riskLevel: null as "faible" | "moyen" | "élevé" | null }),
  ]);

  // Merge: prefer INSEE for population, fallback to geo.api
  const population = inseeDemographics.population ?? geoPopulation.population;

  const result: SocioEconomicData = {
    communeCode,
    communeName: geoPopulation.communeName || commune.nom,
    population,
    populationYear: inseeDemographics.population ? 2021 : null,
    ageDistribution: inseeDemographics.ageDistribution,
    medianIncome: inseeEconomics.medianIncome,
    povertyRate: inseeEconomics.povertyRate,
    unemploymentRate: inseeEconomics.unemploymentRate,
    totalJobs: inseeEconomics.totalJobs,
    schoolCount: educationData.schoolCount,
    universityNearby: educationData.universityNearby,
    equipmentScore: null, // TODO: BPE integration
    naturalRisks: georisquesData.risks,
    riskLevel: georisquesData.riskLevel,
  };

  return result;
}

/** Get the population profile for display purposes */
export { inferPopulationProfile };
