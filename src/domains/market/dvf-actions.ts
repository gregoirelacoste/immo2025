"use server";

import { fetchDvfHistory, type DvfTransaction } from "./dvf-history";

/**
 * Server action : récupère l'historique DVF pour une ville.
 */
export async function getDvfHistoryForProperty(
  city: string,
  postalCode?: string
): Promise<DvfTransaction[]> {
  return fetchDvfHistory(city, postalCode);
}
