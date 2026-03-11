/**
 * INSEE Données Locales API client
 * NO authentication required — fully open API
 * Docs: https://api.insee.fr/catalogue/site/themes/wso2/subthemes/insee/pages/item-info.jag?name=DonneesLocales&version=V0.1
 *
 * Endpoint pattern:
 *   GET https://api.insee.fr/donnees-locales/donnees/geo-{variables}@{dataset}/{nivgeo}-{codegeo}{modalites}
 *
 * Examples:
 *   Population by age: geo-SEXE-AGE15_15_90@GEO2023RP2020/COM-75056.all.all
 *   Income: geo-INDICS_FILO_DISP_DET@GEO2022FILO2019/COM-75056.all
 */

const BASE_URL = "https://api.insee.fr/donnees-locales/donnees";

/**
 * Fetch data from INSEE Données Locales.
 * Returns parsed JSON or null on error.
 */
export async function inseeGetData(
  variables: string,
  dataset: string,
  communeCode: string,
  modalites: string = ".all"
): Promise<Record<string, unknown> | null> {
  const url = `${BASE_URL}/geo-${variables}@${dataset}/COM-${communeCode}${modalites}`;

  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
