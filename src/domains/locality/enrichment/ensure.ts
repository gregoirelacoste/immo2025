/**
 * Fire-and-forget guard — ensures a locality exists and is enriched.
 * Used by triggers (property add, blog pipeline).
 */

import {
  findLocalityByCity,
  createLocality,
  getRootLocalities,
  getLocalityById,
  getLatestLocalityFields,
  getLatestSource,
} from "@/domains/locality/repository";
import { fetchGeoCity, fetchGeoCityByCode } from "@/infrastructure/data-sources";
import { enrichLocality } from "./pipeline";

/**
 * S'assure qu'une localité existe en DB et est enrichie.
 * Auto-crée la localité via geo API si absente.
 */
export async function ensureLocalityEnriched(
  city: string,
  postalCode?: string,
  codeInsee?: string
): Promise<void> {
  // 1. Find or create locality
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

  // 2. Check if key data exists from a reliable source (not blog-ai)
  const existing = await getLatestLocalityFields(locality.id);
  const hasKeyData = existing.avg_purchase_price_per_m2 != null
    && existing.population != null;

  if (hasKeyData) {
    // Still re-enrich if main data comes from unreliable sources
    const priceSource = await getLatestSource("locality_prices", locality.id);
    const socioSource = await getLatestSource("locality_socio", locality.id);
    const isReliable = priceSource !== "blog-ai" && socioSource !== "blog-ai";
    if (isReliable) return;
  }

  // 3. Enrich
  await enrichLocality(locality.id, { enrichParents: true });
}
