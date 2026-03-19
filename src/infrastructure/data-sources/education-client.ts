/**
 * School count per city.
 * Source: data.education.gouv.fr (ODS v2.1 API) — open access.
 */

import { EducationData } from "./types";

interface OdsResponse {
  results: Array<Record<string, string>>;
  total_count: number;
}

const BASE = "https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets";
const DATASET = "fr-en-adresse-et-geolocalisation-etablissements-premier-et-second-degre";

/**
 * Fetch school count for a city. Returns null if not found.
 */
export async function fetchEducationData(
  codeInsee: string
): Promise<EducationData | null> {
  try {
    const params = new URLSearchParams({
      where: `code_commune="${codeInsee}"`,
      limit: "0",
      // Use aggregation to get count
    });

    const url = `${BASE}/${DATASET}/records?${params}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const data: OdsResponse = await res.json();
    const totalCount = data.total_count ?? 0;

    // Check for university presence via a second dataset
    let universityNearby = false;
    try {
      const uniParams = new URLSearchParams({
        where: `com_code="${codeInsee}"`,
        limit: "1",
      });
      const uniRes = await fetch(
        `${BASE}/fr-esr-principaux-etablissements-enseignement-superieur/records?${uniParams}`,
        {
          headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
          signal: AbortSignal.timeout(10_000),
        }
      );
      if (uniRes.ok) {
        const uniData: OdsResponse = await uniRes.json();
        universityNearby = (uniData.total_count ?? 0) > 0;
      }
    } catch {
      // Non-blocking
    }

    return {
      schoolCount: totalCount,
      universityNearby,
    };
  } catch {
    return null;
  }
}
