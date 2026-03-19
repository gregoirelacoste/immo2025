import {
  Locality,
  LocalityDataFields,
  LOCALITY_DATA_FIELD_KEYS,
  FIELD_TO_TABLE,
  ResolvedLocalityData,
} from "./types";
import {
  findLocalityByCity,
  getLocalityById,
  getLatestLocalityFieldsBatch,
  getLatestSourcesBatch,
} from "./repository";

/**
 * Resolve locality data for a property, with field-by-field fallback up the hierarchy.
 *
 * 1. Find the most specific locality matching the property (by code INSEE, postal code, or city name)
 * 2. Load the latest valid data from all thematic tables
 * 3. For each missing field, walk up the parent chain until found or root reached
 */
export async function resolveLocalityData(
  city: string,
  postalCode?: string,
  codeInsee?: string
): Promise<ResolvedLocalityData | null> {
  const locality = await findLocalityByCity(city, postalCode, codeInsee);
  if (!locality) return null;

  // Phase 1: Collect all ancestor IDs by walking up parent_id chain
  // (sequential but only fetches IDs, typically 3-4 levels max)
  const chain: Locality[] = [locality];
  let current: Locality | undefined = locality;
  const visited = new Set<string>([locality.id]);

  while (current?.parent_id && !visited.has(current.parent_id)) {
    visited.add(current.parent_id);
    current = await getLocalityById(current.parent_id);
    if (current) chain.push(current);
  }

  // Phase 2: Batch-fetch all locality fields + sources from thematic tables
  const chainIds = chain.map((l) => l.id);
  const [dataMap, sourcesMap] = await Promise.all([
    getLatestLocalityFieldsBatch(chainIds),
    getLatestSourcesBatch(chainIds),
  ]);

  // Phase 3: Merge fields from most specific → least specific
  const fields: LocalityDataFields = {};
  const fieldSources: ResolvedLocalityData["fieldSources"] = {};
  const dataSources: ResolvedLocalityData["dataSources"] = {};

  for (const loc of chain) {
    const locFields = dataMap.get(loc.id);
    if (!locFields) continue;

    const locSources = sourcesMap.get(loc.id);

    for (const key of LOCALITY_DATA_FIELD_KEYS) {
      if (fields[key] === undefined || fields[key] === null) {
        const value = locFields[key];
        if (value !== undefined && value !== null) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (fields as any)[key] = value;
          fieldSources[key] = {
            localityId: loc.id,
            localityName: loc.name,
            localityType: loc.type,
          };
          // Track data source (e.g. "api:dvf", "admin", "import-initial")
          const table = FIELD_TO_TABLE[key];
          const source = locSources?.get(table);
          if (source) {
            dataSources[key] = source;
          }
        }
      }
    }
  }

  return { locality, fields, fieldSources, dataSources };
}
