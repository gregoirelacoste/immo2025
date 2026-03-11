/**
 * INSEE Données Locales — Economic data
 * - Filosofi (revenus, pauvreté) — dataset GEO2022FILO2019
 * - Emploi (RP) — dataset GEO2023RP2020
 *
 * Supports IRIS-level (neighborhood) and commune-level queries.
 * No authentication required.
 */
import { inseeGetData, GeoLevel } from "./client";

interface InseeEconomics {
  medianIncome: number | null;
  povertyRate: number | null;
  unemploymentRate: number | null;
  totalJobs: number | null;
}

interface CelluleItem {
  Mesure?: { "@code"?: string };
  Modalite?: Array<{ "@code"?: string; "@variable"?: string }> | { "@code"?: string; "@variable"?: string };
  Valeur?: string;
}

/**
 * Fetch income and poverty data from Filosofi.
 * Tries IRIS first if available.
 */
async function fetchIncome(
  communeCode: string,
  irisCode?: string | null
): Promise<{ medianIncome: number | null; povertyRate: number | null }> {
  // Try IRIS level first
  if (irisCode) {
    const result = await fetchIncomeAtLevel("IRIS", irisCode);
    if (result.medianIncome !== null) return result;
  }
  return fetchIncomeAtLevel("COM", communeCode);
}

async function fetchIncomeAtLevel(
  level: GeoLevel,
  code: string
): Promise<{ medianIncome: number | null; povertyRate: number | null }> {
  const data = await inseeGetData("INDICS_FILO_DISP_DET", "GEO2022FILO2019", code, ".all", level);

  if (!data) return { medianIncome: null, povertyRate: null };

  try {
    const cellules = (data as { Cellule?: CelluleItem[] }).Cellule;
    if (!cellules) return { medianIncome: null, povertyRate: null };

    let medianIncome: number | null = null;
    let povertyRate: number | null = null;

    for (const cell of cellules) {
      const val = parseFloat(cell.Valeur || "");
      if (isNaN(val)) continue;

      const mesureCode = cell.Mesure?.["@code"] || "";

      if (mesureCode === "MEDIANE" || mesureCode === "MED") {
        medianIncome = Math.round(val);
      }
      if (mesureCode === "TP60") {
        povertyRate = Math.round(val * 10) / 10;
      }
    }

    return { medianIncome, povertyRate };
  } catch {
    return { medianIncome: null, povertyRate: null };
  }
}

/**
 * Fetch employment data from RP.
 * IRIS-level employment data may be limited, so always try commune too.
 */
async function fetchEmployment(
  communeCode: string,
  irisCode?: string | null
): Promise<{ unemploymentRate: number | null; totalJobs: number | null }> {
  if (irisCode) {
    const result = await fetchEmploymentAtLevel("IRIS", irisCode);
    if (result.unemploymentRate !== null) return result;
  }
  return fetchEmploymentAtLevel("COM", communeCode);
}

async function fetchEmploymentAtLevel(
  level: GeoLevel,
  code: string
): Promise<{ unemploymentRate: number | null; totalJobs: number | null }> {
  const data = await inseeGetData("SEXE-TACTR_2", "GEO2023RP2020", code, ".all.all", level);

  if (!data) return { unemploymentRate: null, totalJobs: null };

  try {
    const cellules = (data as { Cellule?: CelluleItem[] }).Cellule;
    if (!cellules) return { unemploymentRate: null, totalJobs: null };

    let employed = 0;
    let unemployed = 0;

    for (const cell of cellules) {
      const val = parseFloat(cell.Valeur || "");
      if (isNaN(val)) continue;

      const modalites = Array.isArray(cell.Modalite) ? cell.Modalite : [cell.Modalite];
      const sexeModalite = modalites.find((m) => m?.["@variable"] === "SEXE");
      const sexeCode = sexeModalite?.["@code"] || "";
      if (sexeCode && sexeCode !== "0" && sexeCode !== "ENS") continue;

      const actModalite = modalites.find((m) => m?.["@variable"] === "TACTR_2");
      const actCode = actModalite?.["@code"] || "";

      if (actCode === "11") employed += val;
      if (actCode === "12") unemployed += val;
    }

    const active = employed + unemployed;
    const unemploymentRate = active > 0 ? Math.round((unemployed / active) * 1000) / 10 : null;

    return {
      unemploymentRate,
      totalJobs: employed > 0 ? Math.round(employed) : null,
    };
  } catch {
    return { unemploymentRate: null, totalJobs: null };
  }
}

/**
 * Fetch all economic data (parallel requests).
 * Tries IRIS level first if irisCode provided, falls back to commune.
 */
export async function fetchInseeEconomics(
  communeCode: string,
  irisCode?: string | null
): Promise<InseeEconomics> {
  const [income, employment] = await Promise.all([
    fetchIncome(communeCode, irisCode),
    fetchEmployment(communeCode, irisCode),
  ]);

  return {
    medianIncome: income.medianIncome,
    povertyRate: income.povertyRate,
    unemploymentRate: employment.unemploymentRate,
    totalJobs: employment.totalJobs,
  };
}
