import {
  Locality,
  LocalityDataFields,
  LOCALITY_DATA_FIELD_KEYS,
  ResolvedLocalityData,
} from "./types";
import {
  findLocalityByCity,
  getLocalityById,
  getLatestLocalityData,
} from "./repository";

/**
 * Resolve locality data for a property, with field-by-field fallback up the hierarchy.
 *
 * 1. Find the most specific locality matching the property (by code INSEE, postal code, or city name)
 * 2. Load the latest valid snapshot
 * 3. For each missing field, walk up the parent chain until found or root reached
 */
export async function resolveLocalityData(
  city: string,
  postalCode?: string,
  codeInsee?: string
): Promise<ResolvedLocalityData | null> {
  const locality = await findLocalityByCity(city, postalCode, codeInsee);
  if (!locality) return null;

  const fields: LocalityDataFields = {};
  const fieldSources: ResolvedLocalityData["fieldSources"] = {};

  // Walk up the hierarchy, collecting missing fields
  let current: Locality | undefined = locality;
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);

    const snapshot = await getLatestLocalityData(current.id);
    if (snapshot) {
      let data: LocalityDataFields;
      try {
        data = JSON.parse(snapshot.data);
      } catch {
        data = {};
      }

      for (const key of LOCALITY_DATA_FIELD_KEYS) {
        // Only fill if not already set by a more specific locality
        if (fields[key] === undefined || fields[key] === null) {
          const value = data[key];
          if (value !== undefined && value !== null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (fields as any)[key] = value;
            fieldSources[key] = {
              localityId: current.id,
              localityName: current.name,
              localityType: current.type,
            };
          }
        }
      }
    }

    // Move to parent
    if (current.parent_id) {
      current = await getLocalityById(current.parent_id);
    } else {
      break;
    }
  }

  return { locality, fields, fieldSources };
}
