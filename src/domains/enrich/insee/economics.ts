/**
 * INSEE Données Locales - Economic data
 * - Filosofi (revenus)
 * - Emploi
 */
import { inseeGet, isInseeConfigured } from "./client";

interface InseeEconomics {
  medianIncome: number | null;
  povertyRate: number | null;
  unemploymentRate: number | null;
  totalJobs: number | null;
}

/**
 * Fetch income data from INSEE Filosofi dataset
 */
async function fetchIncome(communeCode: string): Promise<{ medianIncome: number | null; povertyRate: number | null }> {
  try {
    // Filosofi - revenus et pauvreté
    const res = await inseeGet(
      `/donnees-locales/V0.1/donnees/geo-COM@${communeCode}.all/GEO2024FILO2021-REVME-MED`
    );

    if (!res.ok) return { medianIncome: null, povertyRate: null };

    const data = await res.json();
    const cellules = (data as { Cellule?: Array<{ Mesure?: { "@code": string }; Valeur: string }> }).Cellule;
    if (!cellules) return { medianIncome: null, povertyRate: null };

    let medianIncome: number | null = null;

    for (const cell of cellules) {
      const val = parseFloat(cell.Valeur);
      if (isNaN(val)) continue;
      const code = cell.Mesure?.["@code"] || "";
      if (code === "MED" || code === "REVMED" || code.includes("MED")) {
        medianIncome = Math.round(val);
        break;
      }
    }

    // If no specific code matched, try the first value
    if (medianIncome === null && cellules.length > 0) {
      const val = parseFloat(cellules[0].Valeur);
      if (!isNaN(val) && val > 1000 && val < 100000) {
        medianIncome = Math.round(val);
      }
    }

    return { medianIncome, povertyRate: null };
  } catch {
    return { medianIncome: null, povertyRate: null };
  }
}

/**
 * Fetch poverty rate from Filosofi
 */
async function fetchPoverty(communeCode: string): Promise<number | null> {
  try {
    const res = await inseeGet(
      `/donnees-locales/V0.1/donnees/geo-COM@${communeCode}.all/GEO2024FILO2021-PAUV-TP60`
    );

    if (!res.ok) return null;

    const data = await res.json();
    const cellules = (data as { Cellule?: Array<{ Valeur: string }> }).Cellule;
    if (!cellules || cellules.length === 0) return null;

    const val = parseFloat(cellules[0].Valeur);
    return isNaN(val) ? null : Math.round(val * 10) / 10;
  } catch {
    return null;
  }
}

/**
 * Fetch employment data
 */
async function fetchEmployment(communeCode: string): Promise<{ unemploymentRate: number | null; totalJobs: number | null }> {
  try {
    // Emploi au lieu de travail
    const res = await inseeGet(
      `/donnees-locales/V0.1/donnees/geo-COM@${communeCode}.all/GEO2024RP2021-EMP-EMP1`
    );

    if (!res.ok) return { unemploymentRate: null, totalJobs: null };

    const data = await res.json();
    const cellules = (data as { Cellule?: Array<{ Mesure?: { "@code": string }; Valeur: string }> }).Cellule;
    if (!cellules) return { unemploymentRate: null, totalJobs: null };

    let totalJobs: number | null = null;
    let unemploymentRate: number | null = null;

    for (const cell of cellules) {
      const val = parseFloat(cell.Valeur);
      if (isNaN(val)) continue;
      const code = cell.Mesure?.["@code"] || "";
      if (code === "EMPLT" || code.includes("EMP")) {
        totalJobs = Math.round(val);
      }
      if (code === "TCHOM" || code.includes("CHOM")) {
        unemploymentRate = Math.round(val * 10) / 10;
      }
    }

    return { unemploymentRate, totalJobs };
  } catch {
    return { unemploymentRate: null, totalJobs: null };
  }
}

/**
 * Fetch all economic data for a commune
 */
export async function fetchInseeEconomics(communeCode: string): Promise<InseeEconomics> {
  if (!isInseeConfigured()) {
    return { medianIncome: null, povertyRate: null, unemploymentRate: null, totalJobs: null };
  }

  // Run in parallel
  const [income, poverty, employment] = await Promise.all([
    fetchIncome(communeCode),
    fetchPoverty(communeCode),
    fetchEmployment(communeCode),
  ]);

  return {
    medianIncome: income.medianIncome,
    povertyRate: income.povertyRate ?? poverty,
    unemploymentRate: employment.unemploymentRate,
    totalJobs: employment.totalJobs,
  };
}
