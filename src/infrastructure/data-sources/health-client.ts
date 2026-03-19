/**
 * Doctor and pharmacy count per city.
 *
 * No reliable free API currently available:
 * - BPE on Opendatasoft → dataset "bpe@public" removed
 * - INSEE BPE API → returns 404
 * - Annuaire santé → CSV only, no per-commune API
 *
 * This client returns null until a working API is found.
 * Health data can be imported via admin or batch scripts.
 */

import { HealthData } from "./types";

/**
 * Fetch doctor and pharmacy count for a city.
 * Currently returns null — no working API available.
 */
export async function fetchHealthData(
  _codeInsee: string
): Promise<HealthData | null> {
  // No working API — return null
  return null;
}
