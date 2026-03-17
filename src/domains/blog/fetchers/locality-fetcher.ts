/**
 * Collecte des données localité existantes en base.
 * Réutilise le resolver hiérarchique existant.
 */

import { resolveLocalityData } from "@/domains/locality/resolver";
import { LocalitySnapshot } from "../types";

/**
 * Récupère les données localité existantes pour une ville.
 * Utilise le resolver hiérarchique (fallback parent automatique).
 */
export async function fetchLocalityData(
  cityName: string,
  postalCode?: string,
  codeInsee?: string
): Promise<LocalitySnapshot | null> {
  try {
    const resolved = await resolveLocalityData(cityName, postalCode, codeInsee);
    if (!resolved) return null;

    return {
      localityId: resolved.locality.id,
      localityName: resolved.locality.name,
      localityType: resolved.locality.type,
      validFrom: new Date().toISOString().slice(0, 10),
      fields: resolved.fields as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}
