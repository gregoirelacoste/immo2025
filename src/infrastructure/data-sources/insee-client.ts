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

/**
 * Fetch Melodi dataset with a pre-formatted GEO code (e.g. "COM-75056" or "IRIS-751056106").
 */
async function fetchMelodiDatasetRaw(
  dataset: string,
  geoCode: string
): Promise<MelodiObservation[]> {
  const url = `${MELODI_BASE}/${dataset}?GEO=${geoCode}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    console.warn(`[insee-client] Melodi ${res.status} for ${dataset} ${geoCode}`);
    return [];
  }
  const data: MelodiResponse = await res.json();
  return data.observations ?? [];
}

/** Convenience wrapper: fetch with GEO=COM-{codeInsee} */
async function fetchMelodiDataset(
  dataset: string,
  codeInsee: string
): Promise<MelodiObservation[]> {
  return fetchMelodiDatasetRaw(dataset, `COM-${codeInsee}`);
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

/** Safe unwrap for PromiseSettledResult */
function safeResult<T>(r: PromiseSettledResult<T>): T | null {
  return r.status === "fulfilled" ? r.value : null;
}

/** Parse housing observations into computed percentages */
function parseHousingData(logement: MelodiObservation[]) {
  const vacantDwellings = findValue(logement, "RP_MEASURE", "DWELLINGS", {
    OCS: "DW_VAC", NRG_SRC: "_T", TDW: "_T", TSH: "_T", CARS: "_T",
    NOR: "_T", BUILD_END: "_T", CARPARK: "_T", L_STAY: "_T",
  });
  const mainDwellings = findValue(logement, "RP_MEASURE", "DWELLINGS", {
    OCS: "DW_MAIN", NRG_SRC: "_T", TDW: "_T", TSH: "_T", CARS: "_T",
    NOR: "_T", BUILD_END: "_T", CARPARK: "_T", L_STAY: "_T",
  });
  const ownerDwellings = findValue(logement, "RP_MEASURE", "DWELLINGS", {
    OCS: "DW_MAIN", TSH: "100", NRG_SRC: "_T", TDW: "_T", CARS: "_T",
    NOR: "_T", BUILD_END: "_T", CARPARK: "_T", L_STAY: "_T",
  });
  const secDwellings = findValue(logement, "RP_MEASURE", "DWELLINGS", {
    OCS: "DW_SEC_DW_OCC", NRG_SRC: "_T", TDW: "_T", TSH: "_T", CARS: "_T",
    NOR: "_T", BUILD_END: "_T", CARPARK: "_T", L_STAY: "_T",
  });

  const totalDwellings = (mainDwellings ?? 0) + (vacantDwellings ?? 0) + (secDwellings ?? 0);
  const vacantHousingPct =
    vacantDwellings != null && mainDwellings != null && totalDwellings > 0
      ? Math.round((vacantDwellings / totalDwellings) * 1000) / 10
      : null;
  const ownerOccupierPct =
    mainDwellings != null && mainDwellings > 0 && ownerDwellings != null
      ? Math.round((ownerDwellings / mainDwellings) * 1000) / 10
      : null;

  return {
    vacantHousingPct,
    ownerOccupierPct,
    housingStockCount: totalDwellings > 0 ? Math.round(totalDwellings) : null,
  };
}

/** Parse employment observations into unemployment rate */
function parseEmploymentData(emploi: MelodiObservation[]) {
  const employed = findValue(emploi, "RP_MEASURE", "POP", {
    EMPSTA_ENQ: "1", SEX: "_T", AGE: "Y_GE15", EDUC: "_T",
  });
  const unemployed = findValue(emploi, "RP_MEASURE", "POP", {
    EMPSTA_ENQ: "2", SEX: "_T", AGE: "Y_GE15", EDUC: "_T",
  });
  const activePopulation = (employed ?? 0) + (unemployed ?? 0);
  return employed != null && unemployed != null && activePopulation > 0
    ? Math.round((unemployed / activePopulation) * 1000) / 10
    : null;
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

    const pop = safeResult(popObs) ?? [];
    const filosofi = safeResult(filosofiObs) ?? [];
    const logement = safeResult(logementObs) ?? [];
    const emploi = safeResult(emploiObs) ?? [];

    const population = findValue(pop, "POPREF_MEASURE", "PMUN");
    const medianIncome = findValue(filosofi, "FILOSOFI_MEASURE", "MED_SL");
    const povertyRate = findValue(filosofi, "FILOSOFI_MEASURE", "PR_MD60");
    const housing = parseHousingData(logement);
    const unemploymentRate = parseEmploymentData(emploi);

    return {
      population: population != null ? Math.round(population) : null,
      medianIncome,
      povertyRate,
      unemploymentRate,
      ...housing,
      householdSizeAvg: null,
      studentPopulationPct: null,
      seniorPopulationPct: null,
      totalJobs: null,
      millesime: pop[0]?.dimensions?.TIME_PERIOD ?? null,
      dataLevel: "commune",
      irisCode: null,
    };
  } catch {
    return null;
  }
}

/**
 * Fetch INSEE socio-economic data at IRIS level with fallback to commune.
 * Only Filosofi (income/poverty) and housing reliably support IRIS granularity.
 * Population and employment always come from commune level.
 */
export async function fetchInseeDataWithIris(
  codeInsee: string,
  irisCode: string
): Promise<InseeCityData | null> {
  try {
    const [popObs, filosofiIrisObs, logementIrisObs, emploiObs] = await Promise.allSettled([
      fetchMelodiDataset("DS_POPULATIONS_REFERENCE", codeInsee),
      fetchMelodiDatasetRaw("DS_FILOSOFI_CC", `IRIS-${irisCode}`),
      fetchMelodiDatasetRaw("DS_RP_LOGEMENT_PRINC", `IRIS-${irisCode}`),
      fetchMelodiDataset("DS_RP_EMPLOI_LR_PRINC", codeInsee),
    ]);

    const pop = safeResult(popObs) ?? [];
    const emploi = safeResult(emploiObs) ?? [];

    let filosofi = safeResult(filosofiIrisObs) ?? [];
    let logement = safeResult(logementIrisObs) ?? [];
    let resolvedLevel: "iris" | "commune" = "iris";

    if (filosofi.length === 0 && logement.length === 0) {
      resolvedLevel = "commune";
      const [filosofiComObs, logementComObs] = await Promise.allSettled([
        fetchMelodiDataset("DS_FILOSOFI_CC", codeInsee),
        fetchMelodiDataset("DS_RP_LOGEMENT_PRINC", codeInsee),
      ]);
      filosofi = safeResult(filosofiComObs) ?? [];
      logement = safeResult(logementComObs) ?? [];
    } else if (filosofi.length === 0) {
      filosofi = await fetchMelodiDataset("DS_FILOSOFI_CC", codeInsee).catch(() => []);
    } else if (logement.length === 0) {
      logement = await fetchMelodiDataset("DS_RP_LOGEMENT_PRINC", codeInsee).catch(() => []);
    }

    const population = findValue(pop, "POPREF_MEASURE", "PMUN");
    const medianIncome = findValue(filosofi, "FILOSOFI_MEASURE", "MED_SL");
    const povertyRate = findValue(filosofi, "FILOSOFI_MEASURE", "PR_MD60");
    const housing = parseHousingData(logement);
    const unemploymentRate = parseEmploymentData(emploi);

    return {
      population: population != null ? Math.round(population) : null,
      medianIncome,
      povertyRate,
      unemploymentRate,
      ...housing,
      householdSizeAvg: null,
      studentPopulationPct: null,
      seniorPopulationPct: null,
      totalJobs: null,
      millesime: pop[0]?.dimensions?.TIME_PERIOD ?? null,
      dataLevel: resolvedLevel,
      irisCode: resolvedLevel === "iris" ? irisCode : null,
    };
  } catch {
    return null;
  }
}
