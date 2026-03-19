/**
 * Property tax rate (TFB) per city.
 * Source: OFGL (Observatoire des Finances et de la Gestion publique Locale)
 * API: data.ofgl.fr — open access.
 */

import { TaxeFonciereData } from "./types";

interface OfglRecord {
  com_code: string;
  com_name: string;
  annee: number;
  produits_tf_com: number | null;
  pop_totale: number | null;
  taux_tf_com: number | null;
}

interface OfglResponse {
  total_count: number;
  results: OfglRecord[];
}

const BASE =
  "https://data.ofgl.fr/api/explore/v2.1/catalog/datasets/ofgl-base-communes-consolidee/records";

/**
 * Fetch the property tax rate for a city from OFGL.
 * Uses `taux_tf_com` directly when available, otherwise returns null.
 * Returns null if not found or on any error.
 */
export async function fetchTaxeFonciereData(
  codeInsee: string
): Promise<TaxeFonciereData | null> {
  try {
    const params = new URLSearchParams({
      where: `com_code="${codeInsee}"`,
      select: "com_code,com_name,annee,produits_tf_com,pop_totale,taux_tf_com",
      order_by: "annee DESC",
      limit: "1",
    });

    const url = `${BASE}?${params}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data: OfglResponse = await res.json();
    const record = data.results?.[0];
    if (!record) return null;

    // Prefer the direct tax rate field if available
    const tauxTFB = record.taux_tf_com;
    if (tauxTFB == null || isNaN(tauxTFB)) return null;

    return {
      communeCode: record.com_code,
      communeName: record.com_name || "",
      tauxTFB,
      annee: record.annee || new Date().getFullYear(),
    };
  } catch {
    return null;
  }
}
