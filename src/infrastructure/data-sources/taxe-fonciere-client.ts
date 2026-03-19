/**
 * Property tax rate (TFB) per city.
 * Source: data.economie.gouv.fr (ODS v2.1 API) — open access.
 */

import { TaxeFonciereData } from "./types";

interface OdsResponse {
  results: Array<Record<string, string>>;
  total_count: number;
}

const BASE = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets";
const DATASET = "impots-locaux";

/**
 * Fetch the voted property tax rate for a city.
 * Returns null if not found.
 */
export async function fetchTaxeFonciereData(
  codeInsee: string
): Promise<TaxeFonciereData | null> {
  try {
    const params = new URLSearchParams({
      where: `codgeo="${codeInsee}"`,
      order_by: "annee DESC",
      limit: "1",
      select: "codgeo,libgeo,annee,tfb_com",
    });

    const url = `${BASE}/${DATASET}/records?${params}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data: OdsResponse = await res.json();
    const record = data.results?.[0];
    if (!record) return null;

    const tauxTFB = parseFloat(record.tfb_com);
    if (isNaN(tauxTFB)) return null;

    return {
      communeCode: record.codgeo,
      communeName: record.libgeo || "",
      tauxTFB,
      annee: parseInt(record.annee) || new Date().getFullYear(),
    };
  } catch {
    return null;
  }
}
