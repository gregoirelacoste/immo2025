/**
 * Property tax rate (TFB) per city.
 *
 * No reliable free API currently available:
 * - data.economie.gouv.fr/impots-locaux → returns 404 (dataset removed)
 * - data.ofgl.fr → has financial aggregates but not taux_tf_com
 * - REI files → ZIP only, no API
 *
 * This client returns null until a working API is found.
 * Tax rate data can be imported via admin or batch scripts.
 */

import { TaxeFonciereData } from "./types";

/**
 * Fetch the property tax rate for a city.
 * Currently returns null — no working API available.
 */
export async function fetchTaxeFonciereData(
  _codeInsee: string
): Promise<TaxeFonciereData | null> {
  // No working API — return null
  // Data can be manually imported or computed from other sources
  return null;
}
