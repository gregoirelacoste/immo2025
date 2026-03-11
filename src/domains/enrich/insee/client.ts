/**
 * INSEE Données Locales API client
 * NO authentication required — fully open API
 * Docs: https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=DonneesLocales&version=V0.1
 *
 * Supports both commune (COM) and IRIS level queries.
 * IRIS = Ilots Regroupés pour l'Information Statistique (~2000 people)
 */

const BASE_URL = "https://api.insee.fr/donnees-locales/donnees";

export type GeoLevel = "COM" | "IRIS";

/**
 * Fetch data from INSEE Données Locales.
 * @param geoLevel - "COM" for commune, "IRIS" for neighborhood
 * @param geoCode - commune code (5 digits) or IRIS code (9 digits)
 */
export async function inseeGetData(
  variables: string,
  dataset: string,
  geoCode: string,
  modalites: string = ".all",
  geoLevel: GeoLevel = "COM"
): Promise<Record<string, unknown> | null> {
  const url = `${BASE_URL}/geo-${variables}@${dataset}/${geoLevel}-${geoCode}${modalites}`;

  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
