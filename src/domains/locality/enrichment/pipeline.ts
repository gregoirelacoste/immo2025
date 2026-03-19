/**
 * Locality enrichment pipeline — orchestrates API calls
 * and persists results into thematic tables.
 */

import {
  getLocalityById,
  getLatestLocalityFields,
  getLatestSource,
  upsertLocalityData,
} from "@/domains/locality/repository";
import { LOCALITY_TABLE_NAMES, LocalityTableName, FIELD_TO_TABLE, type LocalityDataFields } from "@/domains/locality/types";
import {
  fetchGeoCity,
  fetchGeoCityByCode,
  fetchDvfData,
  fetchInseeData,
  fetchGeorisquesData,
  fetchTaxeFonciereData,
  fetchDpeData,
  fetchEducationData,
  fetchHealthData,
} from "@/infrastructure/data-sources";
import {
  mapDvfToFields,
  mapInseeToFields,
  mapGeorisquesToFields,
  mapTaxeToFields,
  mapDpeToFields,
  mapEducationToFields,
  mapHealthToFields,
} from "./mappers";
import type { EnrichLocalityResult } from "./types";

/** Sources that should never be overwritten by API enrichment */
const PROTECTED_SOURCES = new Set(["admin", "import-initial"]);

export async function enrichLocality(
  localityId: string,
  options?: { force?: boolean; enrichParents?: boolean }
): Promise<EnrichLocalityResult> {
  const start = Date.now();
  const result: EnrichLocalityResult = {
    localityId,
    localityName: "",
    fieldsUpdated: 0,
    fieldsSkipped: 0,
    sourceReports: [],
    durationMs: 0,
  };

  // 1. Load locality from DB
  const locality = await getLocalityById(localityId);
  if (!locality) {
    result.durationMs = Date.now() - start;
    result.sourceReports.push({
      source: "*",
      status: "error",
      fieldCount: 0,
      error: "Locality not found",
    });
    return result;
  }
  result.localityName = locality.name;

  // 2. Resolve INSEE code
  let codeInsee = locality.code;
  if (!codeInsee) {
    const geo = await fetchGeoCity(locality.name);
    if (geo) {
      codeInsee = geo.code;
    } else {
      result.durationMs = Date.now() - start;
      result.sourceReports.push({
        source: "geo",
        status: "error",
        fieldCount: 0,
        error: "Impossible de résoudre le code INSEE",
      });
      return result;
    }
  }

  // 3. Skip if data already exists and not forced
  if (!options?.force) {
    const existing = await getLatestLocalityFields(localityId);
    const hasKeyData = existing.avg_purchase_price_per_m2 != null
      && existing.population != null;
    if (hasKeyData) {
      result.durationMs = Date.now() - start;
      result.sourceReports.push({
        source: "*",
        status: "skipped",
        fieldCount: 0,
        error: "Données clés déjà présentes (utiliser force pour forcer)",
      });
      return result;
    }
  }

  // 4. Fetch all sources in parallel
  const [dvfRes, inseeRes, georisquesRes, taxeRes, dpeRes, eduRes, healthRes] =
    await Promise.allSettled([
      fetchDvfData(codeInsee),
      fetchInseeData(codeInsee),
      fetchGeorisquesData(codeInsee),
      fetchTaxeFonciereData(codeInsee),
      fetchDpeData(codeInsee),
      fetchEducationData(codeInsee),
      fetchHealthData(codeInsee),
    ]);

  // 5. Map results
  const sourceMappings: Array<{
    name: string;
    result: PromiseSettledResult<unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mapper: (data: any) => Partial<LocalityDataFields>;
    apiSource: string;
  }> = [
    { name: "DVF", result: dvfRes, mapper: mapDvfToFields, apiSource: "api:dvf" },
    { name: "INSEE", result: inseeRes, mapper: mapInseeToFields, apiSource: "api:insee" },
    { name: "Géorisques", result: georisquesRes, mapper: mapGeorisquesToFields, apiSource: "api:georisques" },
    { name: "Taxe foncière", result: taxeRes, mapper: mapTaxeToFields, apiSource: "api:taxe-fonciere" },
    { name: "DPE", result: dpeRes, mapper: mapDpeToFields, apiSource: "api:dpe" },
    { name: "Éducation", result: eduRes, mapper: mapEducationToFields, apiSource: "api:education" },
    { name: "Santé", result: healthRes, mapper: mapHealthToFields, apiSource: "api:health" },
  ];

  // 6. Check protected tables
  const protectedTables = new Set<string>();
  await Promise.all(
    LOCALITY_TABLE_NAMES.map(async (table) => {
      const source = await getLatestSource(table, localityId);
      if (source && PROTECTED_SOURCES.has(source)) {
        protectedTables.add(table);
      }
    })
  );

  // 7. Upsert each source's data
  const today = new Date().toISOString().slice(0, 10);

  for (const { name, result: apiResult, mapper, apiSource } of sourceMappings) {
    if (apiResult.status === "rejected") {
      result.sourceReports.push({
        source: name,
        status: "error",
        fieldCount: 0,
        error: apiResult.reason instanceof Error ? apiResult.reason.message : String(apiResult.reason),
      });
      continue;
    }

    const data = apiResult.value;
    if (!data) {
      result.sourceReports.push({
        source: name,
        status: "skipped",
        fieldCount: 0,
        error: "Pas de données retournées",
      });
      continue;
    }

    const mapped = mapper(data);
    const fieldKeys = Object.keys(mapped) as (keyof LocalityDataFields)[];

    // Filter out fields in protected tables
    const filteredFields: Partial<LocalityDataFields> = {};
    let fieldCount = 0;
    let skippedCount = 0;

    for (const key of fieldKeys) {
      if (mapped[key] === undefined || mapped[key] === null) continue;
      const table = FIELD_TO_TABLE[key];
      if (protectedTables.has(table)) {
        skippedCount++;
        continue;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (filteredFields as any)[key] = mapped[key];
      fieldCount++;
    }

    result.fieldsSkipped += skippedCount;

    if (fieldCount > 0) {
      await upsertLocalityData(localityId, today, filteredFields, apiSource);
      result.fieldsUpdated += fieldCount;
    }

    result.sourceReports.push({
      source: name,
      status: fieldCount > 0 ? "ok" : "skipped",
      fieldCount,
      error: skippedCount > 0 ? `${skippedCount} champ(s) protégé(s)` : undefined,
    });
  }

  // 8. Enrich parents if requested
  if (options?.enrichParents && locality.parent_id) {
    const parentResult = await enrichLocality(locality.parent_id, {
      force: false,
      enrichParents: false, // don't recurse further
    });
    result.parentResults = [parentResult];
  }

  result.durationMs = Date.now() - start;
  return result;
}
