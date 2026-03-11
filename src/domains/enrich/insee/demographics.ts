/**
 * INSEE Données Locales - Demographics (Recensement de la Population)
 * Dataset: RP (Recensement de la Population)
 */
import { inseeGet, isInseeConfigured } from "./client";
import { AgeDistribution } from "../socioeconomic-types";

interface InseeDemographics {
  population: number | null;
  ageDistribution: AgeDistribution | null;
}

/**
 * Fetch population and age distribution from INSEE Données Locales
 * Uses the "Dossier complet" endpoint which provides pre-aggregated commune data
 */
export async function fetchInseeDemographics(communeCode: string): Promise<InseeDemographics> {
  if (!isInseeConfigured()) {
    return { population: null, ageDistribution: null };
  }

  try {
    // Dossier complet gives us a comprehensive data sheet per commune
    const res = await inseeGet(
      `/donnees-locales/V0.1/donnees/geo-COM@${communeCode}.all/GEO2024RP2021-POPLEG-POP1B`
    );

    if (!res.ok) {
      // Try simpler population endpoint
      return await fetchSimplePopulation(communeCode);
    }

    const data = await res.json();
    return parsePopulationData(data);
  } catch {
    // Fallback to geo API population
    return { population: null, ageDistribution: null };
  }
}

async function fetchSimplePopulation(communeCode: string): Promise<InseeDemographics> {
  try {
    const res = await inseeGet(
      `/donnees-locales/V0.1/donnees/geo-COM@${communeCode}.all/GEO2024RP2021-POPLEG-POP1A`
    );
    if (!res.ok) return { population: null, ageDistribution: null };

    const data = await res.json();
    const pop = extractTotalPopulation(data);
    return { population: pop, ageDistribution: null };
  } catch {
    return { population: null, ageDistribution: null };
  }
}

function extractTotalPopulation(data: Record<string, unknown>): number | null {
  try {
    // INSEE données locales returns Cellule array with Mesure/Modalite
    const cellules = (data as { Cellule?: Array<{ Mesure: { "@code": string }; Valeur: string }> }).Cellule;
    if (!cellules) return null;

    // Look for total population value
    for (const cell of cellules) {
      if (cell.Mesure?.["@code"] === "POP" || cell.Mesure?.["@code"] === "POPTOT") {
        const val = parseFloat(cell.Valeur);
        if (!isNaN(val)) return Math.round(val);
      }
    }
    // If no specific code, take first numeric value
    const firstVal = parseFloat(cellules[0]?.Valeur);
    return isNaN(firstVal) ? null : Math.round(firstVal);
  } catch {
    return null;
  }
}

function parsePopulationData(data: Record<string, unknown>): InseeDemographics {
  try {
    const cellules = (data as { Cellule?: Array<{ Mesure: { "@code": string }; Modalite?: { "@code": string }; Valeur: string }> }).Cellule;
    if (!cellules) return { population: null, ageDistribution: null };

    let total = 0;
    const ageBuckets: Record<string, number> = {};

    for (const cell of cellules) {
      const val = parseFloat(cell.Valeur);
      if (isNaN(val)) continue;

      const ageCode = cell.Modalite?.["@code"] || "";
      ageBuckets[ageCode] = val;
      total += val;
    }

    if (total === 0) return { population: null, ageDistribution: null };

    // Map INSEE age codes to our buckets
    // Typical codes: 0-19, 20-39, 40-59, 60+
    let under20 = 0, age20to39 = 0, age40to59 = 0, over60 = 0;

    for (const [code, val] of Object.entries(ageBuckets)) {
      const num = parseInt(code.replace(/\D/g, ""));
      if (isNaN(num)) {
        // Skip total rows
        continue;
      }
      if (num < 20) under20 += val;
      else if (num < 40) age20to39 += val;
      else if (num < 60) age40to59 += val;
      else over60 += val;
    }

    const popTotal = under20 + age20to39 + age40to59 + over60;
    if (popTotal === 0) return { population: Math.round(total), ageDistribution: null };

    return {
      population: Math.round(total),
      ageDistribution: {
        under20Pct: Math.round((under20 / popTotal) * 1000) / 10,
        age20to39Pct: Math.round((age20to39 / popTotal) * 1000) / 10,
        age40to59Pct: Math.round((age40to59 / popTotal) * 1000) / 10,
        over60Pct: Math.round((over60 / popTotal) * 1000) / 10,
      },
    };
  } catch {
    return { population: null, ageDistribution: null };
  }
}
