/**
 * INSEE Données Locales — Economic data
 * - Filosofi (revenus, pauvreté) — dataset GEO2022FILO2019
 * - Emploi (RP) — dataset GEO2023RP2020
 *
 * No authentication required.
 */
import { inseeGetData } from "./client";

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
 * INDICS_FILO_DISP_DET returns: MEDIANE (median income), TP60 (poverty rate), D1, D9, etc.
 */
async function fetchIncome(communeCode: string): Promise<{ medianIncome: number | null; povertyRate: number | null }> {
  const data = await inseeGetData("INDICS_FILO_DISP_DET", "GEO2022FILO2019", communeCode, ".all");

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
 * TACTR_2 = type d'activité (actifs occupés, chômeurs, inactifs)
 */
async function fetchEmployment(communeCode: string): Promise<{ unemploymentRate: number | null; totalJobs: number | null }> {
  // SEXE-TACTR_2: activity type by sex
  const data = await inseeGetData("SEXE-TACTR_2", "GEO2023RP2020", communeCode, ".all.all");

  if (!data) return { unemploymentRate: null, totalJobs: null };

  try {
    const cellules = (data as { Cellule?: CelluleItem[] }).Cellule;
    if (!cellules) return { unemploymentRate: null, totalJobs: null };

    let employed = 0;
    let unemployed = 0;

    for (const cell of cellules) {
      const val = parseFloat(cell.Valeur || "");
      if (isNaN(val)) continue;

      // Filter for ensemble (both sexes)
      const modalites = Array.isArray(cell.Modalite) ? cell.Modalite : [cell.Modalite];
      const sexeModalite = modalites.find((m) => m?.["@variable"] === "SEXE");
      const sexeCode = sexeModalite?.["@code"] || "";
      if (sexeCode && sexeCode !== "0" && sexeCode !== "ENS") continue;

      const actModalite = modalites.find((m) => m?.["@variable"] === "TACTR_2");
      const actCode = actModalite?.["@code"] || "";

      // TACTR_2 codes: 11 = actifs ayant un emploi, 12 = chômeurs, 2 = inactifs
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
 * Fetch all economic data for a commune (parallel requests)
 */
export async function fetchInseeEconomics(communeCode: string): Promise<InseeEconomics> {
  const [income, employment] = await Promise.all([
    fetchIncome(communeCode),
    fetchEmployment(communeCode),
  ]);

  return {
    medianIncome: income.medianIncome,
    povertyRate: income.povertyRate,
    unemploymentRate: employment.unemploymentRate,
    totalJobs: employment.totalJobs,
  };
}
