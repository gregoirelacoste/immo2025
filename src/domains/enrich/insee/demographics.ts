/**
 * INSEE Données Locales — Demographics (Recensement de la Population)
 * Dataset: GEO2023RP2020
 * Variables: SEXE-AGE15_15_90 → age bands 0-14, 15-29, 30-44, 45-59, 60-74, 75-89, 90+
 */
import { inseeGetData } from "./client";
import { AgeDistribution } from "../socioeconomic-types";

interface InseeDemographics {
  population: number | null;
  ageDistribution: AgeDistribution | null;
}

/**
 * Fetch population and age distribution from INSEE RP (Recensement).
 * No authentication required.
 */
export async function fetchInseeDemographics(communeCode: string): Promise<InseeDemographics> {
  // AGE15_15_90 gives age bands: 0-14, 15-29, 30-44, 45-59, 60-74, 75-89, 90+
  // .all.all = all sexes x all age bands
  const data = await inseeGetData("SEXE-AGE15_15_90", "GEO2023RP2020", communeCode, ".all.all");

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

    // Accumulate population by age band, summing both sexes
    // AGE15_15_90 codes: 0 (0-14), 15 (15-29), 30 (30-44), 45 (45-59), 60 (60-74), 75 (75-89), 90 (90+)
    const ageTotals: Record<string, number> = {};
    let totalPop = 0;

    for (const cell of cellules) {
      const val = parseFloat(cell.Valeur || "");
      if (isNaN(val)) continue;

      // Find the age modalite
      const modalites = Array.isArray(cell.Modalite) ? cell.Modalite : [cell.Modalite];
      const ageModalite = modalites.find((m) => m?.["@variable"] === "AGE15_15_90");
      const sexeModalite = modalites.find((m) => m?.["@variable"] === "SEXE");

      // Only count "ensemble" (both sexes) to avoid double counting
      // SEXE code "0" or "ENS" = ensemble
      const sexeCode = sexeModalite?.["@code"] || "";
      if (sexeCode && sexeCode !== "0" && sexeCode !== "ENS") continue;

      const ageCode = ageModalite?.["@code"] || "total";

      if (ageCode === "total" || ageCode === "ENS") {
        // This is the grand total
        totalPop = Math.max(totalPop, val);
      } else {
        ageTotals[ageCode] = (ageTotals[ageCode] || 0) + val;
      }
    }

    // If no explicit total, sum all age bands
    if (totalPop === 0) {
      totalPop = Object.values(ageTotals).reduce((s, v) => s + v, 0);
    }

    if (totalPop === 0) return { population: null, ageDistribution: null };

    // Map to our age groups:
    // under20: codes 0 (0-14) + part of 15 (15-29) → approximate: code 0 + code 15 * 1/3
    // Actually, let's map cleanly:
    // under20 ≈ code 0 (0-14) — close enough, 0-14 vs 0-19
    // age20to39 ≈ code 15 (15-29) + code 30 (30-44) * ~0.5 → approximate
    // Better: just use the bands as-is and map to closest
    const age0_14 = ageTotals["0"] || 0;
    const age15_29 = ageTotals["15"] || 0;
    const age30_44 = ageTotals["30"] || 0;
    const age45_59 = ageTotals["45"] || 0;
    const age60_74 = ageTotals["60"] || 0;
    const age75_89 = ageTotals["75"] || 0;
    const age90plus = ageTotals["90"] || 0;

    // Map to our 4 buckets:
    // < 20 ans ≈ 0-14 + 1/3 of 15-29
    // 20-39 ≈ 2/3 of 15-29 + 2/3 of 30-44
    // 40-59 ≈ 1/3 of 30-44 + 45-59
    // 60+ ≈ 60-74 + 75-89 + 90+
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
