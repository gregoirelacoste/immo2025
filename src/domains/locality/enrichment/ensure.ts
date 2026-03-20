/**
 * Fire-and-forget guard — ensures a locality exists and is enriched.
 * Used by triggers (property add, blog pipeline).
 *
 * When coordinates are provided, also resolves and enriches the IRIS
 * quartier locality (neighborhood level) with parent_id → commune.
 */

import {
  findLocalityByCity,
  findLocalityByCode,
  createLocality,
  getRootLocalities,
  getLocalityById,
  getLatestLocalityFields,
  getLatestSource,
} from "@/domains/locality/repository";
import { fetchGeoCity, fetchGeoCityByCode, fetchIrisFromCoordinates } from "@/infrastructure/data-sources";
import { enrichLocality } from "./pipeline";

/**
 * S'assure qu'une localité existe en DB et est enrichie.
 * Auto-crée la localité via geo API si absente.
 * Si des coordonnées sont fournies, résout et enrichit aussi le quartier IRIS.
 */
export async function ensureLocalityEnriched(
  city: string,
  postalCode?: string,
  codeInsee?: string,
  coordinates?: { latitude: number; longitude: number }
): Promise<{ irisCode?: string } | void> {
  // 1. Find or create commune locality
  let locality = await findLocalityByCity(city, postalCode, codeInsee);

  if (!locality) {
    // Auto-create via geo API
    const geo = codeInsee
      ? await fetchGeoCityByCode(codeInsee)
      : await fetchGeoCity(city, postalCode);

    if (!geo) return;

    const roots = await getRootLocalities();
    const parentId = roots[0]?.id ?? null;

    const id = await createLocality({
      name: geo.nom,
      type: "ville",
      parent_id: parentId,
      code: geo.code,
      postal_codes: JSON.stringify(geo.codesPostaux ?? []),
    });

    locality = await getLocalityById(id);
    if (!locality) return;
  }

  // 2. Check if commune key data exists from a reliable source (not blog-ai)
  const existing = await getLatestLocalityFields(locality.id);
  const hasKeyData = existing.avg_purchase_price_per_m2 != null
    && existing.population != null;

  if (!hasKeyData || await isUnreliable(locality.id)) {
    await enrichLocality(locality.id, { enrichParents: true });
  }

  // 3. IRIS quartier resolution (only if coordinates provided)
  if (coordinates) {
    try {
      const irisCode = await ensureIrisQuartier(locality, coordinates);
      if (irisCode) return { irisCode };
    } catch (e) {
      console.warn("[ensure] IRIS quartier resolution failed:", e);
    }
  }
}

/** Check if main data comes from unreliable sources */
async function isUnreliable(localityId: string): Promise<boolean> {
  const priceSource = await getLatestSource("locality_prices", localityId);
  const socioSource = await getLatestSource("locality_socio", localityId);
  return priceSource === "blog-ai" || socioSource === "blog-ai";
}

/**
 * Resolve and enrich the IRIS quartier for a property's coordinates.
 * Creates the quartier locality if it doesn't exist, with parent_id → commune.
 */
async function ensureIrisQuartier(
  communeLocality: { id: string; code: string },
  coordinates: { latitude: number; longitude: number }
): Promise<string | undefined> {
  const iris = await fetchIrisFromCoordinates(coordinates.latitude, coordinates.longitude);
  if (!iris) return undefined;

  // Check if this IRIS quartier already exists
  let quartier = await findLocalityByCode(iris.irisCode, "quartier");

  if (!quartier) {
    // Create the IRIS quartier with parent_id → commune
    try {
      const id = await createLocality({
        name: iris.irisName,
        type: "quartier",
        parent_id: communeLocality.id,
        code: iris.irisCode,
      });
      quartier = await getLocalityById(id);
    } catch (e) {
      // UNIQUE constraint violation = concurrent creation, re-fetch
      if (String(e).includes("UNIQUE")) {
        quartier = await findLocalityByCode(iris.irisCode, "quartier");
      } else {
        throw e;
      }
    }
    if (!quartier) return;
  }

  // Enrich the quartier (INSEE data at IRIS level)
  const existing = await getLatestLocalityFields(quartier.id);
  const hasData = existing.median_income != null || existing.population != null;
  if (!hasData) {
    await enrichLocality(quartier.id, { enrichParents: false });
  }

  return iris.irisCode;
}
