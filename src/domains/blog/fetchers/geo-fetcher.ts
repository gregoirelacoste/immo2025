/**
 * Résolution géographique via geo.api.gouv.fr.
 * Retrouve le code INSEE, département, région, population d'une ville.
 */

import { GeoCity } from "../types";

const GEO_API_BASE = "https://geo.api.gouv.fr";

/** Cherche une commune par nom. Retourne la meilleure correspondance. */
export async function fetchGeoCity(
  cityName: string,
  postalCode?: string
): Promise<GeoCity | null> {
  try {
    const params = new URLSearchParams({
      fields: "nom,code,codesPostaux,departement,region,population",
      boost: "population",
      limit: "1",
    });

    if (postalCode) {
      params.set("codePostal", postalCode);
    } else {
      params.set("nom", cityName);
    }

    const res = await fetch(`${GEO_API_BASE}/communes?${params}`, {
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) return null;

    const data: GeoCity[] = await res.json();
    return data[0] ?? null;
  } catch {
    return null;
  }
}

/** Cherche une commune par code INSEE. */
export async function fetchGeoCityByCode(
  codeInsee: string
): Promise<GeoCity | null> {
  try {
    const res = await fetch(
      `${GEO_API_BASE}/communes/${codeInsee}?fields=nom,code,codesPostaux,departement,region,population`,
      { signal: AbortSignal.timeout(8_000) }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
