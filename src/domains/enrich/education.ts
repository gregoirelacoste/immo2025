/**
 * Annuaire de l'éducation — data.education.gouv.fr
 * + Enseignement supérieur — data.enseignementsup-recherche.gouv.fr
 * Open data, no API key needed
 *
 * Uses geo-distance queries to avoid Paris/Lyon/Marseille arrondissement issues.
 * POINT format: POINT(longitude latitude)
 */

interface EducationResult {
  schoolCount: number;
  universityNearby: boolean;
}

/**
 * Search schools near a location and check for nearby universities.
 * Prefers geo-distance search (works for all communes including Paris/Lyon/Marseille).
 * Falls back to commune code search if no coordinates.
 */
export async function fetchEducationData(
  communeCode: string,
  latitude: number | null,
  longitude: number | null
): Promise<EducationResult> {
  let schoolCount = 0;
  let universityNearby = false;

  // --- Schools (écoles, collèges, lycées) ---
  try {
    const url = new URL("https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records");

    if (latitude != null && longitude != null) {
      // Geo-distance: 2km radius — avoids arrondissement issues
      url.searchParams.set("where", `within_distance(position, geom'POINT(${longitude} ${latitude})', 2km)`);
    } else {
      // Fallback: commune code (won't work for Paris/Lyon/Marseille main codes)
      url.searchParams.set("where", `code_commune="${communeCode}"`);
    }
    url.searchParams.set("select", "count(*) as total");
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      // Aggregation query returns results array with { total }
      const results = data.results || [];
      if (results.length > 0 && results[0].total != null) {
        schoolCount = results[0].total;
      } else {
        schoolCount = data.total_count ?? 0;
      }
    }
  } catch {
    // Education API failure is non-fatal
  }

  // --- Universities (enseignement supérieur) ---
  if (latitude != null && longitude != null) {
    try {
      const url = new URL("https://data.enseignementsup-recherche.gouv.fr/api/explore/v2.1/catalog/datasets/fr-esr-principaux-etablissements-enseignement-superieur/records");
      url.searchParams.set("where", `within_distance(geolocalisation, geom'POINT(${longitude} ${latitude})', 10km)`);
      url.searchParams.set("limit", "1");

      const res = await fetch(url.toString(), {
        headers: { "Accept": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        universityNearby = (data.total_count ?? data.results?.length ?? 0) > 0;
      }
    } catch {
      // University check failure is non-fatal
    }
  }

  return { schoolCount, universityNearby };
}
