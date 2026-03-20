/**
 * Locality enrichment pipeline — orchestrates API calls
 * and persists results into thematic tables.
 */

import { getDb } from "@/infrastructure/database/client";
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
  fetchInseeDataWithIris,
  fetchGeorisquesData,
  fetchTaxeFonciereData,
  fetchDpeData,
  fetchEducationData,
  fetchHealthData,
  fetchLoyersData,
} from "@/infrastructure/data-sources";
import {
  mapDvfToFields,
  mapInseeToFields,
  mapGeorisquesToFields,
  mapTaxeToFields,
  mapDpeToFields,
  mapEducationToFields,
  mapHealthToFields,
  mapLoyersToFields,
  computeDerivedFields,
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

  // 2. IRIS quartier: use dedicated lightweight enrichment
  const isIrisQuartier = locality.type === "quartier" && locality.code.length === 9;
  if (isIrisQuartier) {
    return enrichIrisQuartier(locality, localityId, result, start, options);
  }

  // 3. Resolve INSEE code
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

  // 4. Skip if data already exists and not forced
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
  const [dvfRes, inseeRes, georisquesRes, taxeRes, dpeRes, eduRes, healthRes, loyersRes] =
    await Promise.allSettled([
      fetchDvfData(codeInsee),
      fetchInseeData(codeInsee),
      fetchGeorisquesData(codeInsee),
      fetchTaxeFonciereData(codeInsee),
      fetchDpeData(codeInsee),
      fetchEducationData(codeInsee),
      fetchHealthData(codeInsee),
      fetchLoyersData(codeInsee),
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
    { name: "Loyers", result: loyersRes, mapper: mapLoyersToFields, apiSource: "api:carte-loyers" },
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

    const errorMsg = skippedCount > 0 ? `${skippedCount} champ(s) protégé(s)` :
      fieldCount === 0 ? "Données vides (tous champs null)" : undefined;
    result.sourceReports.push({
      source: name,
      status: fieldCount > 0 ? "ok" : "skipped",
      fieldCount,
      error: errorMsg,
    });
  }

  // 8. Compute and persist derived fields (cashflow, TF/m² estimate)
  if (result.fieldsUpdated > 0) {
    const freshFields = await getLatestLocalityFields(localityId);
    const derived = computeDerivedFields(freshFields);
    const derivedKeys = Object.keys(derived) as (keyof LocalityDataFields)[];
    const nonNullDerived: Partial<LocalityDataFields> = {};
    let derivedCount = 0;
    for (const key of derivedKeys) {
      if (derived[key] != null) {
        const table = FIELD_TO_TABLE[key];
        if (!protectedTables.has(table)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (nonNullDerived as any)[key] = derived[key];
          derivedCount++;
        }
      }
    }
    if (derivedCount > 0) {
      await upsertLocalityData(localityId, today, nonNullDerived, "api:computed");
      result.fieldsUpdated += derivedCount;
      result.sourceReports.push({
        source: "Calculés",
        status: "ok",
        fieldCount: derivedCount,
      });
    }
  }

  // 9. Clean up stale blog-ai rows — delete old blog-ai data for tables
  //    that now have API or computed data, so the source badge updates correctly.
  if (result.fieldsUpdated > 0) {
    const db = await getDb();
    const tablesWithFreshData = new Set<string>();
    // From API sources
    for (const report of result.sourceReports) {
      if (report.status === "ok") {
        const sourceMapping = sourceMappings.find((m) => m.name === report.source);
        if (sourceMapping?.result.status === "fulfilled" && sourceMapping.result.value) {
          const mapped = sourceMapping.mapper(sourceMapping.result.value);
          for (const key of Object.keys(mapped) as (keyof LocalityDataFields)[]) {
            if (mapped[key] != null) tablesWithFreshData.add(FIELD_TO_TABLE[key]);
          }
        }
      }
    }
    // From computed/derived fields
    const freshFields = await getLatestLocalityFields(localityId);
    const derived = computeDerivedFields(freshFields);
    for (const key of Object.keys(derived) as (keyof LocalityDataFields)[]) {
      if (derived[key] != null) tablesWithFreshData.add(FIELD_TO_TABLE[key]);
    }
    // Delete older blog-ai rows for tables that now have fresh data
    for (const table of tablesWithFreshData) {
      if (!LOCALITY_TABLE_NAMES.includes(table as LocalityTableName)) continue;
      await db.execute({
        sql: `DELETE FROM ${table} WHERE locality_id = ? AND source = 'blog-ai' AND valid_from < ?`,
        args: [localityId, today],
      });
    }
  }

  // 10. Enrich parents if requested
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

/**
 * Lightweight enrichment for IRIS quartier localities.
 * Only fetches INSEE data at IRIS level (income, poverty, housing).
 * Other data (DVF, georisques, etc.) is inherited from parent commune via the resolver.
 */
async function enrichIrisQuartier(
  locality: { id: string; code: string; parent_id: string | null },
  localityId: string,
  result: EnrichLocalityResult,
  start: number,
  options?: { force?: boolean; enrichParents?: boolean }
): Promise<EnrichLocalityResult> {
  const irisCode = locality.code;
  // Extract commune code from IRIS code (first 5 digits)
  const communeCode = irisCode.slice(0, 5);

  // Skip if data already exists and not forced
  if (!options?.force) {
    const existing = await getLatestLocalityFields(localityId);
    if (existing.median_income != null) {
      result.durationMs = Date.now() - start;
      result.sourceReports.push({
        source: "*",
        status: "skipped",
        fieldCount: 0,
        error: "Données IRIS déjà présentes",
      });
      return result;
    }
  }

  // Fetch INSEE data at IRIS level with commune fallback
  try {
    const inseeData = await fetchInseeDataWithIris(communeCode, irisCode);
    if (inseeData) {
      const mapped = mapInseeToFields(inseeData);
      const fieldCount = Object.values(mapped).filter((v) => v != null).length;

      if (fieldCount > 0) {
        const today = new Date().toISOString().slice(0, 10);
        const source = inseeData.dataLevel === "iris" ? "api:insee-iris" : "api:insee";
        await upsertLocalityData(localityId, today, mapped, source);
        result.fieldsUpdated = fieldCount;
        result.sourceReports.push({
          source: `INSEE (${inseeData.dataLevel})`,
          status: "ok",
          fieldCount,
        });
      } else {
        result.sourceReports.push({
          source: "INSEE IRIS",
          status: "skipped",
          fieldCount: 0,
          error: "Données vides (tous champs null)",
        });
      }
    } else {
      result.sourceReports.push({
        source: "INSEE IRIS",
        status: "error",
        fieldCount: 0,
        error: "Pas de données retournées",
      });
    }
  } catch (e) {
    result.sourceReports.push({
      source: "INSEE IRIS",
      status: "error",
      fieldCount: 0,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  result.durationMs = Date.now() - start;
  return result;
}
