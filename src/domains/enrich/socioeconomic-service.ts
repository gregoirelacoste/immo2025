/**
 * Orchestrates all socio-economic data fetching.
 * Tries IRIS-level (neighborhood ~2000 people) first, falls back to commune.
 * Each source is fail-safe: if one fails, others continue.
 */

import { getCommuneCode } from "@/domains/market/dvf-client";
import { resolveIrisCode } from "./iris/resolver";
import { fetchInseeDemographics } from "./insee/demographics";
import { fetchInseeEconomics } from "./insee/economics";
import { fetchEducationData } from "./education";
import { fetchGeorisques } from "./georisques";
import { SocioEconomicData, inferPopulationProfile } from "./socioeconomic-types";

/**
 * Fetch population from geo.api.gouv.fr (free, no key needed)
 * Fallback when INSEE doesn't return population
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
 * Main entry point: fetch all socio-economic data.
 * When coordinates are available, resolves IRIS code for neighborhood-level data.
 */
export async function fetchSocioEconomicData(
  cityName: string,
  latitude: number | null,
  longitude: number | null
): Promise<SocioEconomicData | null> {
  if (!cityName.trim()) return null;

  // Step 1: Get commune code
  const commune = await getCommuneCode(cityName);
  if (!commune) return null;

  const communeCode = commune.code;

  // Step 2: Try to resolve IRIS code from coordinates (neighborhood level)
  let irisCode: string | null = null;
  let irisName: string | null = null;
  if (latitude != null && longitude != null) {
    try {
      const iris = await resolveIrisCode(latitude, longitude);
      if (iris) {
        irisCode = iris.irisCode;
        irisName = iris.irisName;
      }
    } catch {
      /* IRIS resolution failure is non-fatal */
    }
  }

  // Step 3: Fetch all data in parallel (IRIS where possible, commune fallback)
  const [
    geoPopulation,
    inseeDemographics,
    inseeEconomics,
    educationData,
    georisquesData,
  ] = await Promise.all([
    fetchPopulationFromGeoApi(communeCode),
    fetchInseeDemographics(communeCode, irisCode).catch(() => ({ population: null, ageDistribution: null })),
    fetchInseeEconomics(communeCode, irisCode).catch(() => ({ medianIncome: null, povertyRate: null, unemploymentRate: null, totalJobs: null })),
    fetchEducationData(communeCode, latitude, longitude).catch(() => ({ schoolCount: 0, universityNearby: false })),
    (latitude != null && longitude != null)
      ? fetchGeorisques(latitude, longitude).catch(() => ({ risks: [] as never[], riskLevel: null as "faible" | "moyen" | "élevé" | null }))
      : Promise.resolve({ risks: [] as never[], riskLevel: null as "faible" | "moyen" | "élevé" | null }),
  ]);

  // Merge: prefer INSEE for population, fallback to geo.api
  const population = inseeDemographics.population ?? geoPopulation.population;

  // Determine actual data level based on whether IRIS data was used
  // If we got IRIS code but demographics still returned commune-level data,
  // the data level is commune (INSEE doesn't have IRIS data for all zones)
  const hasIrisLevelData = irisCode != null && inseeDemographics.population !== null;

  const result: SocioEconomicData = {
    communeCode,
    communeName: geoPopulation.communeName || commune.nom,
    irisCode,
    irisName,
    dataLevel: hasIrisLevelData ? "iris" : "commune",
    population,
    populationYear: inseeDemographics.population ? 2020 : null,
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
