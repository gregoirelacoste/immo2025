/**
 * Annuaire de l'éducation — data.education.gouv.fr
 * Open data, no API key needed
 */

interface EducationResult {
  schoolCount: number;
  universityNearby: boolean;
}

/**
 * Search schools near a location or by commune code
 * Uses the Annuaire des établissements dataset on data.education.gouv.fr
 */
export async function fetchEducationData(
  communeCode: string,
  latitude: number | null,
  longitude: number | null
): Promise<EducationResult> {
  let schoolCount = 0;
  let universityNearby = false;

  try {
    // Search schools by commune code via the education API
    const url = new URL("https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records");
    url.searchParams.set("where", `code_commune = "${communeCode}"`);
    url.searchParams.set("limit", "100");
    url.searchParams.set("select", "identifiant_de_l_etablissement,type_etablissement,nom_etablissement");

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      schoolCount = data.total_count ?? data.results?.length ?? 0;
    }
  } catch {
    // Education API failure is non-fatal
  }

  // Check for universities nearby (separate dataset or broader search)
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
