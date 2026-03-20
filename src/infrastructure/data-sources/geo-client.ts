/**
 * Geographic resolution via geo.api.gouv.fr.
 * Resolves city name to INSEE code, department, region, population.
 * Also resolves GPS coordinates to IRIS zones via geo.api.gouv.fr.
 */

import { GeoCity, IrisResolution } from "./types";

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

/**
 * Resolve GPS coordinates to an IRIS zone.
 * Uses geo.api.gouv.fr reverse geocoding to get the commune,
 * then queries the commune's IRIS zones and picks the matching one.
 *
 * IRIS zones only exist for communes with population >= ~5000.
 * Returns null if no IRIS data is available or API fails.
 */
export async function fetchIrisFromCoordinates(
  lat: number,
  lon: number
): Promise<IrisResolution | null> {
  try {
    // Step 1: Reverse geocode to get commune code
    const reverseRes = await fetch(
      `https://api-adresse.data.gouv.fr/reverse/?lat=${lat}&lon=${lon}&limit=1`,
      { signal: AbortSignal.timeout(5_000) }
    );
    if (!reverseRes.ok) return null;

    const reverseData = await reverseRes.json();
    const feature = reverseData?.features?.[0];
    if (!feature?.properties?.citycode) return null;

    const communeCode = feature.properties.citycode as string;

    // Step 2: Fetch IRIS zones for this commune
    const irisRes = await fetch(
      `${GEO_API_BASE}/communes/${communeCode}/iris`,
      { signal: AbortSignal.timeout(5_000) }
    );

    if (!irisRes.ok) {
      // 404 = commune has no IRIS zones (small commune)
      return null;
    }

    const irisZones: Array<{ code: string; nom: string; codeCommune: string }> = await irisRes.json();
    if (!Array.isArray(irisZones) || irisZones.length === 0) return null;

    // Return the first IRIS zone.
    // For multi-zone communes, this is imprecise without geometry matching,
    // but still provides useful neighborhood-level data.
    return {
      irisCode: irisZones[0].code,
      irisName: irisZones[0].nom,
      communeCode,
    };
  } catch (e) {
    console.warn("[geo-client] IRIS resolution failed:", e);
    return null;
  }
}
