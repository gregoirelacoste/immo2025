/**
 * Resolve IRIS code from GPS coordinates.
 * Uses OpenDataSoft's official French IRIS dataset (free, no auth).
 * IRIS = Ilots Regroupés pour l'Information Statistique (~2000 inhabitants).
 */

interface IrisInfo {
  irisCode: string;     // 9-digit code (5 commune + 4 IRIS)
  irisName: string;     // nom du quartier IRIS
  communeCode: string;  // 5-digit commune code
}

/**
 * Lookup IRIS zone from coordinates via OpenDataSoft.
 * Returns null if not found (rural zones may not have IRIS).
 */
export async function resolveIrisCode(
  latitude: number,
  longitude: number
): Promise<IrisInfo | null> {
  try {
    const url = `https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-france-iris/records?where=within_distance(geo_point_2d,geom'POINT(${longitude} ${latitude})',0m)&limit=1&select=iris_code,iris_name,com_code`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const record = data?.results?.[0];
    if (!record?.iris_code) return null;

    return {
      irisCode: record.iris_code,
      irisName: record.iris_name || "",
      communeCode: record.com_code || record.iris_code.slice(0, 5),
    };
  } catch {
    return null;
  }
}
