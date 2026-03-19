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
  if (!res.ok) {
    console.warn(`[insee-client] Melodi ${res.status} for ${dataset} ${codeInsee}`);
    return [];
  }
  const data: MelodiResponse = await res.json();
  return data.observations ?? [];
}

/**
 * Find an observation value by matching a specific dimension key + value,
 * with optional additional dimension filters.
 */
function findValue(
  observations: MelodiObservation[],
  dimensionKey: string,
  dimensionValue: string,
  filters?: Record<string, string>
): number | null {
  const match = observations.find((o) => {
    const dims = o.dimensions;
    if (dims[dimensionKey] !== dimensionValue) return false;
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
    const population = findValue(pop, "POPREF_MEASURE", "PMUN");

    // Income & poverty (DS_FILOSOFI_CC)
    const medianIncome = findValue(filosofi, "FILOSOFI_MEASURE", "MED_SL");
    const povertyRate = findValue(filosofi, "FILOSOFI_MEASURE", "PR_MD60");

    // Housing (DS_RP_LOGEMENT_PRINC)
    // Vacant dwellings
    const vacantDwellings = findValue(logement, "RP_MEASURE", "DWELLINGS", {
      OCS: "DW_VAC", NRG_SRC: "_T", TDW: "_T", TSH: "_T", CARS: "_T",
      NOR: "_T", BUILD_END: "_T", CARPARK: "_T", L_STAY: "_T",
    });
    // Main residence (all tenure types)
    const mainDwellings = findValue(logement, "RP_MEASURE", "DWELLINGS", {
      OCS: "DW_MAIN", NRG_SRC: "_T", TDW: "_T", TSH: "_T", CARS: "_T",
      NOR: "_T", BUILD_END: "_T", CARPARK: "_T", L_STAY: "_T",
    });
    // Owner-occupied main residence (TSH=100 = propriétaire)
    const ownerDwellings = findValue(logement, "RP_MEASURE", "DWELLINGS", {
      OCS: "DW_MAIN", TSH: "100", NRG_SRC: "_T", TDW: "_T", CARS: "_T",
      NOR: "_T", BUILD_END: "_T", CARPARK: "_T", L_STAY: "_T",
    });
    // Secondary/occasional
    const secDwellings = findValue(logement, "RP_MEASURE", "DWELLINGS", {
      OCS: "DW_SEC_DW_OCC", NRG_SRC: "_T", TDW: "_T", TSH: "_T", CARS: "_T",
      NOR: "_T", BUILD_END: "_T", CARPARK: "_T", L_STAY: "_T",
    });

    // Employment (DS_RP_EMPLOI_LR_PRINC)
    // Employed: EMPSTA_ENQ=1
    const employed = findValue(emploi, "RP_MEASURE", "POP", {
      EMPSTA_ENQ: "1", SEX: "_T", AGE: "Y_GE15", EDUC: "_T",
    });
    // Unemployed (ILO): EMPSTA_ENQ=2
    const unemployed = findValue(emploi, "RP_MEASURE", "POP", {
      EMPSTA_ENQ: "2", SEX: "_T", AGE: "Y_GE15", EDUC: "_T",
    });

    // Unemployment rate = unemployed / (employed + unemployed)
    const activePopulation = (employed ?? 0) + (unemployed ?? 0);
    const unemploymentRate =
      employed != null && unemployed != null && activePopulation > 0
        ? Math.round((unemployed / activePopulation) * 1000) / 10
        : null;

    // Vacancy rate: only compute if we have both vacant and a reliable total
    const totalDwellings = (mainDwellings ?? 0) + (vacantDwellings ?? 0) + (secDwellings ?? 0);
    const vacantHousingPct =
      vacantDwellings != null && mainDwellings != null && totalDwellings > 0
        ? Math.round((vacantDwellings / totalDwellings) * 1000) / 10
        : null;

    // Owner-occupier rate
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
      housingStockCount: totalDwellings > 0 ? Math.round(totalDwellings) : null,
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
