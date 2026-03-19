/**
 * Geographic resolution via geo.api.gouv.fr.
 * Resolves city name to INSEE code, department, region, population.
 */

import { GeoCity } from "./types";

const GEO_API_BASE = "https://geo.api.gouv.fr";

/** Look up a city by name. Returns the best match. */
export async function fetchGeoCity(
  cityName: string,
  postalCode?: string
): Promise<GeoCity | null> {
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

  const url = `${GEO_API_BASE}/communes?${params}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
  });

  if (!res.ok) {
    console.warn(`[geo-client] ${res.status} for ${url}`);
    return null;
  }

  const data: GeoCity[] = await res.json();
  return data[0] ?? null;
}

/** Look up a city by INSEE code. */
export async function fetchGeoCityByCode(
  codeInsee: string
): Promise<GeoCity | null> {
  try {
    const res = await fetch(
      `${GEO_API_BASE}/communes/${codeInsee}?fields=nom,code,codesPostaux,departement,region,population`,
      {
        headers: { "User-Agent": "tiili.io/locality-enrichment/1.0" },
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
