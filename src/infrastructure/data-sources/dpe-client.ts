/**
 * DPE (energy performance) aggregate per city.
 * Source: data.ademe.fr (Data Fair API) — open access.
 */

import { DpeAggregateData } from "./types";

interface DpeApiResponse {
  results: Array<Record<string, string>>;
  total: number;
}

const BASE = "https://data.ademe.fr/data-fair/api/v1/datasets";
const DATASET = "dpe-v2-logements-existants";

/** Most frequent DPE class from a count map */
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
      q_fields: "Code_INSEE_(BAN)",
      q: codeInsee,
      size: "200",
      select: "Etiquette_DPE,Conso_5_usages_é_finale,Etiquette_GES",
    });

    const url = `${BASE}/${DATASET}/lines?${params}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;

    const data: DpeApiResponse = await res.json();
    const results = data.results;
    if (!results || results.length === 0) return null;

    // Aggregate
    const dpeCounts: Record<string, number> = {};
    const gesCounts: Record<string, number> = {};
    let totalConso = 0;
    let consoCount = 0;

    for (const r of results) {
      const dpe = r["Etiquette_DPE"];
      const ges = r["Etiquette_GES"];
      const conso = parseFloat(r["Conso_5_usages_é_finale"]);

      if (dpe) dpeCounts[dpe] = (dpeCounts[dpe] || 0) + 1;
      if (ges) gesCounts[ges] = (gesCounts[ges] || 0) + 1;
      if (!isNaN(conso) && conso > 0) {
        totalConso += conso;
        consoCount++;
      }
    }

    return {
      avgDpeClass: mostFrequentClass(dpeCounts),
      avgEnergyConsumption: consoCount > 0 ? Math.round(totalConso / consoCount) : null,
      avgGesClass: mostFrequentClass(gesCounts),
      dpeCount: results.length,
    };
  } catch {
    return null;
  }
}
