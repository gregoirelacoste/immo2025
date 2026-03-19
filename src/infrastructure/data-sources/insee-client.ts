/**
 * INSEE socio-economic data collection via Melodi API.
 * Source: api.insee.fr/melodi — open access, no auth required.
 * Rate limit: 30 requests/minute.
 */

import { InseeCityData } from "./types";

interface MelodiObservation {
  dimensions: Record<string, string>;
  measures: {
    OBS_VALUE_NIVEAU: { value: number | null };
  };
}

interface MelodiResponse {
  observations: MelodiObservation[];
  identifier: string;
}

const MELODI_BASE = "https://api.insee.fr/melodi/data";

async function fetchMelodiDataset(
  dataset: string,
  codeInsee: string
): Promise<MelodiObservation[]> {
  const url = `${MELODI_BASE}/${dataset}?GEO=COM-${codeInsee}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return [];
  const data: MelodiResponse = await res.json();
  return data.observations ?? [];
}

function findValue(
  observations: MelodiObservation[],
  measureCode: string,
  filters?: Record<string, string>
): number | null {
  const match = observations.find((o) => {
    const dims = o.dimensions;
    // Check measure dimension (various dataset-specific dimension names)
    const matchesMeasure = Object.values(dims).includes(measureCode);
    if (!matchesMeasure) return false;
    // Check additional filters
    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (dims[key] !== val) return false;
      }
    }
    return true;
  });
  return match?.measures?.OBS_VALUE_NIVEAU?.value ?? null;
}

/** @deprecated — INSEE Melodi is open access, no credentials needed */
export function isInseeConfigured(): boolean {
  return true;
}

/**
 * Fetch INSEE socio-economic data for a city via Melodi API.
 * No auth required — open access with 30 req/min limit.
 */
export async function fetchInseeData(
  codeInsee: string
): Promise<InseeCityData | null> {
  try {
    // Fetch 3 datasets in parallel: population, income/poverty, housing
    const [popObs, filosofiObs, logementObs, emploiObs] = await Promise.allSettled([
      fetchMelodiDataset("DS_POPULATIONS_REFERENCE", codeInsee),
      fetchMelodiDataset("DS_FILOSOFI_CC", codeInsee),
      fetchMelodiDataset("DS_RP_LOGEMENT_PRINC", codeInsee),
      fetchMelodiDataset("DS_RP_EMPLOI_LR_PRINC", codeInsee),
    ]);

    const safe = <T>(r: PromiseSettledResult<T>): T | null =>
      r.status === "fulfilled" ? r.value : null;

    const pop = safe(popObs) ?? [];
    const filosofi = safe(filosofiObs) ?? [];
    const logement = safe(logementObs) ?? [];
    const emploi = safe(emploiObs) ?? [];

    // Population (DS_POPULATIONS_REFERENCE)
    const population = findValue(pop, "PMUN");

    // Income & poverty (DS_FILOSOFI_CC)
    const medianIncome = findValue(filosofi, "MED_SL");
    const povertyRate = findValue(filosofi, "PR_MD60");
    const numHouseholds = findValue(filosofi, "NUM_HH");

    // Housing (DS_RP_LOGEMENT_PRINC)
    // Total dwellings: OCS=_T (all), TSH=_T, TDW=_T, all other dims = _T
    const totalDwellings = findValue(logement, "DWELLINGS", {
      OCS: "_T",  // no occupation filter (should not exist for total)
    });
    // Vacant: OCS=DW_VAC
    const vacantDwellings = findValue(logement, "DWELLINGS", {
      OCS: "DW_VAC",
    });
    // Main residence (owner-occupied): TSH=OWN
    const ownerDwellings = findValue(logement, "DWELLINGS", {
      OCS: "DW_MAIN",
      TSH: "OWN",
    });
    const mainDwellings = findValue(logement, "DWELLINGS", {
      OCS: "DW_MAIN",
      TSH: "_T",
    });

    // Employment (DS_RP_EMPLOI_LR_PRINC)
    // Total active 15+: EMPSTA_ENQ=_T, SEX=_T, AGE=Y_GE15
    const totalActive = findValue(emploi, "POP", {
      EMPSTA_ENQ: "_T",
      SEX: "_T",
      AGE: "Y_GE15",
    });
    // Unemployed (ILO definition): EMPSTA_ENQ=2, SEX=_T, AGE=Y_GE15
    const unemployed = findValue(emploi, "POP", {
      EMPSTA_ENQ: "2",
      SEX: "_T",
      AGE: "Y_GE15",
    });

    const unemploymentRate =
      totalActive != null && unemployed != null && totalActive > 0
        ? Math.round((unemployed / totalActive) * 1000) / 10
        : null;

    // Compute vacancy and owner-occupancy rates
    const totalForVacancy = totalDwellings ??
      ((mainDwellings ?? 0) + (vacantDwellings ?? 0));
    const vacantHousingPct =
      totalForVacancy > 0 && vacantDwellings != null
        ? Math.round((vacantDwellings / totalForVacancy) * 1000) / 10
        : null;

    const ownerOccupierPct =
      mainDwellings != null && mainDwellings > 0 && ownerDwellings != null
        ? Math.round((ownerDwellings / mainDwellings) * 1000) / 10
        : null;

    return {
      population: population != null ? Math.round(population) : null,
      medianIncome,
      povertyRate,
      unemploymentRate,
      vacantHousingPct,
      ownerOccupierPct,
      housingStockCount: totalDwellings != null ? Math.round(totalDwellings) : null,
      householdSizeAvg: null,
      studentPopulationPct: null,
      seniorPopulationPct: null,
      totalJobs: null,
      millesime: pop[0]?.dimensions?.TIME_PERIOD ?? null,
    };
  } catch {
    return null;
  }
}
