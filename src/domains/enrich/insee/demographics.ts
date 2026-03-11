/**
 * INSEE Données Locales — Demographics (Recensement de la Population)
 * Dataset: GEO2023RP2020
 * Variables: SEXE-AGE15_15_90 → age bands 0-14, 15-29, 30-44, 45-59, 60-74, 75-89, 90+
 *
 * Supports IRIS-level (neighborhood) and commune-level queries.
 */
import { inseeGetData, GeoLevel } from "./client";
import { AgeDistribution } from "../socioeconomic-types";

interface InseeDemographics {
  population: number | null;
  ageDistribution: AgeDistribution | null;
}

/**
 * Fetch population and age distribution.
 * Tries IRIS level first if irisCode is provided, falls back to commune.
 */
export async function fetchInseeDemographics(
  communeCode: string,
  irisCode?: string | null
): Promise<InseeDemographics> {
  // Try IRIS level first for neighborhood precision
  if (irisCode) {
    const irisData = await fetchAtLevel("IRIS", irisCode);
    if (irisData.population !== null) return irisData;
  }

  // Fallback to commune level
  return fetchAtLevel("COM", communeCode);
}

async function fetchAtLevel(level: GeoLevel, code: string): Promise<InseeDemographics> {
  const data = await inseeGetData(
    "SEXE-AGE15_15_90", "GEO2023RP2020", code, ".all.all", level
  );

  if (!data) return { population: null, ageDistribution: null };
  return parsePopulationData(data);
}

interface CelluleItem {
  Mesure?: { "@code"?: string };
  Modalite?: Array<{ "@code"?: string; "@variable"?: string }> | { "@code"?: string; "@variable"?: string };
  Valeur?: string;
}

function parsePopulationData(data: Record<string, unknown>): InseeDemographics {
  try {
    const cellules = (data as { Cellule?: CelluleItem[] }).Cellule;
    if (!cellules || !Array.isArray(cellules)) return { population: null, ageDistribution: null };

    const ageTotals: Record<string, number> = {};
    let totalPop = 0;

    for (const cell of cellules) {
      const val = parseFloat(cell.Valeur || "");
      if (isNaN(val)) continue;

      const modalites = Array.isArray(cell.Modalite) ? cell.Modalite : [cell.Modalite];
      const ageModalite = modalites.find((m) => m?.["@variable"] === "AGE15_15_90");
      const sexeModalite = modalites.find((m) => m?.["@variable"] === "SEXE");

      const sexeCode = sexeModalite?.["@code"] || "";
      if (sexeCode && sexeCode !== "0" && sexeCode !== "ENS") continue;

      const ageCode = ageModalite?.["@code"] || "total";

      if (ageCode === "total" || ageCode === "ENS") {
        totalPop = Math.max(totalPop, val);
      } else {
        ageTotals[ageCode] = (ageTotals[ageCode] || 0) + val;
      }
    }

    if (totalPop === 0) {
      totalPop = Object.values(ageTotals).reduce((s, v) => s + v, 0);
    }

    if (totalPop === 0) return { population: null, ageDistribution: null };

    const age0_14 = ageTotals["0"] || 0;
    const age15_29 = ageTotals["15"] || 0;
    const age30_44 = ageTotals["30"] || 0;
    const age45_59 = ageTotals["45"] || 0;
    const age60_74 = ageTotals["60"] || 0;
    const age75_89 = ageTotals["75"] || 0;
    const age90plus = ageTotals["90"] || 0;

    // Map to 4 buckets with interpolation
    const under20 = age0_14 + age15_29 * (1 / 3);
    const age20to39 = age15_29 * (2 / 3) + age30_44 * (2 / 3);
    const age40to59 = age30_44 * (1 / 3) + age45_59;
    const over60 = age60_74 + age75_89 + age90plus;

    const sumBuckets = under20 + age20to39 + age40to59 + over60;
    if (sumBuckets === 0) return { population: Math.round(totalPop), ageDistribution: null };

    return {
      population: Math.round(totalPop),
      ageDistribution: {
        under20Pct: Math.round((under20 / sumBuckets) * 1000) / 10,
        age20to39Pct: Math.round((age20to39 / sumBuckets) * 1000) / 10,
        age40to59Pct: Math.round((age40to59 / sumBuckets) * 1000) / 10,
        over60Pct: Math.round((over60 / sumBuckets) * 1000) / 10,
      },
    };
  } catch {
    return { population: null, ageDistribution: null };
  }
}
