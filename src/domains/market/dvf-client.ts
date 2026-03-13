interface GeoCommune {
  nom: string;
  code: string;
  codesPostaux: string[];
}

interface DvfMutation {
  valeur_fonciere: string;
  surface_reelle_bati: string;
  type_local: string;
  date_mutation: string;
  nombre_pieces_principales: string;
}

/** Résout un nom de ville vers son code INSEE via geo.api.gouv.fr */
export async function getCommuneCode(cityName: string): Promise<GeoCommune | null> {
  const res = await fetch(
    `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(cityName)}&fields=nom,code,codesPostaux&boost=population&limit=1`
  );
  if (!res.ok) return null;
  const data: GeoCommune[] = await res.json();
  return data[0] ?? null;
}

/** Récupère les mutations DVF pour une commune (API DVF Etalab open data) */
export async function fetchDvfMutations(codeCommune: string): Promise<DvfMutation[]> {
  const currentYear = new Date().getFullYear();
  const minYear = currentYear - 2;

  try {
    const url = `https://api.cquest.org/dvf?code_commune=${codeCommune}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json();
      const results = json.resultats as DvfMutation[] | undefined;
      if (results && results.length > 0) {
        return results.filter((m) => {
          const year = parseInt(m.date_mutation?.slice(0, 4) || "0", 10);
          return year >= minYear;
        });
      }
    }
  } catch {
    // Timeout ou erreur réseau
  }

  return [];
}

export type { DvfMutation };
