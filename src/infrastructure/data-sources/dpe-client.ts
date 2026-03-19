/**
 * DPE (energy performance) aggregate per city.
 * Source: data.ademe.fr (Data Fair API) — open access.
 * Dataset: meg-83tjwtg8dyz4vv7h1dqe (DPE Logements existants depuis juillet 2021)
 */

import { DpeAggregateData } from "./types";

interface DpeRecord {
  etiquette_dpe: string;
  conso_5_usages_par_m2_ef: number;
  etiquette_ges: string;
  code_insee_ban: string;
}

interface DpeApiResponse {
  results: DpeRecord[];
  total: number;
}

const BASE = "https://data.ademe.fr/data-fair/api/v1/datasets";
const DATASET = "meg-83tjwtg8dyz4vv7h1dqe";

/** Most frequent class from a count map */
function mostFrequentClass(counts: Record<string, number>): string | null {
  let max = 0;
  let best: string | null = null;
  for (const [cls, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      best = cls;
    }
  }
  return best;
}

/**
 * Fetch DPE aggregate for a city (avg class, consumption, GES).
 * Returns null if not found.
 */
export async function fetchDpeData(
  codeInsee: string
): Promise<DpeAggregateData | null> {
  try {
    const params = new URLSearchParams({
      qs: `code_insee_ban:${codeInsee}`,
      size: "200",
      select: "etiquette_dpe,conso_5_usages_par_m2_ef,etiquette_ges,code_insee_ban",
    });

    const url = `${BASE}/${DATASET}/lines?${params}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;

    const data: DpeApiResponse = await res.json();
    const results = data.results;
    if (!results || results.length === 0) return null;

    const dpeCounts: Record<string, number> = {};
    const gesCounts: Record<string, number> = {};
    let totalConso = 0;
    let consoCount = 0;

    for (const r of results) {
      if (r.etiquette_dpe) dpeCounts[r.etiquette_dpe] = (dpeCounts[r.etiquette_dpe] || 0) + 1;
      if (r.etiquette_ges) gesCounts[r.etiquette_ges] = (gesCounts[r.etiquette_ges] || 0) + 1;
      const conso = r.conso_5_usages_par_m2_ef;
      if (conso != null && !isNaN(conso) && conso > 0) {
        totalConso += conso;
        consoCount++;
      }
    }

    return {
      avgDpeClass: mostFrequentClass(dpeCounts),
      avgEnergyConsumption: consoCount > 0 ? Math.round(totalConso / consoCount) : null,
      avgGesClass: mostFrequentClass(gesCounts),
      dpeCount: data.total,
    };
  } catch {
    return null;
  }
}
