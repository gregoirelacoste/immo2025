/**
 * Data Injector — injecte les données extraites d'un article
 * dans les tables thématiques de localité pour enrichir l'app.
 *
 * Stratégie :
 * - Upsert dans les tables thématiques avec source = "blog-ai"
 * - Ne jamais écraser les données créées par "admin" ou "import-initial"
 * - Merge field-by-field : seuls les champs null/manquants sont complétés
 */

import {
  findLocalityByCity,
  getLatestLocalityFields,
  upsertLocalityData,
  getLatestSource,
  createLocality,
  getRootLocalities,
  getLocalityById,
} from "@/domains/locality/repository";
import {
  LOCALITY_DATA_FIELD_KEYS,
  LocalityDataFields,
  FIELD_TO_TABLE,
  LOCALITY_TABLE_NAMES,
  Locality,
} from "@/domains/locality/types";
import { GeneratedArticle } from "./types";
import { markDataInjected } from "./repository";
import { fetchGeoCity, fetchGeoCityByCode } from "./fetchers/geo-fetcher";

interface InjectionResult {
  injected: number;
  skipped: number;
  created: number;
  errors: Array<{ city: string; error: string }>;
}

/**
 * Injecte les données extraites d'un article dans les tables thématiques.
 * Retourne un résumé de ce qui a été injecté.
 */
export async function injectArticleData(
  articleId: string,
  extractedData: GeneratedArticle["extracted_data"]
): Promise<InjectionResult> {
  const result: InjectionResult = { injected: 0, skipped: 0, created: 0, errors: [] };

  const localities = extractedData.localities ?? [];
  if (localities.length === 0) {
    return result;
  }

  for (const locData of localities) {
    try {
      // Trouver la localité en base
      let locality = await findLocalityByCity(
        locData.city,
        undefined,
        locData.code_insee
      );

      // Auto-créer la localité si elle n'existe pas
      if (!locality) {
        const created = await autoCreateLocality(locData.city, locData.code_insee);
        if (!created) {
          result.skipped++;
          result.errors.push({
            city: locData.city,
            error: `Localité non trouvée et impossible à créer automatiquement`,
          });
          continue;
        }
        locality = created;
        result.created++;
      }

      // Charger les données existantes
      const existingFields = await getLatestLocalityFields(locality.id);

      // Check each thematic table for admin protection
      const protectedTables = new Set<string>();
      for (const table of LOCALITY_TABLE_NAMES) {
        const source = await getLatestSource(table, locality.id);
        if (source === "admin" || source === "import-initial") {
          protectedTables.add(table);
        }
      }

      // Filtrer les champs valides et non-null du extract
      const newFields: Partial<LocalityDataFields> = {};
      let hasNewData = false;

      for (const key of LOCALITY_DATA_FIELD_KEYS) {
        const extractedValue = locData.fields[key];

        // Ignorer les valeurs null/undefined
        if (extractedValue === null || extractedValue === undefined) continue;

        // Si la table est protégée (admin) et le champ déjà rempli → ne pas écraser
        const table = FIELD_TO_TABLE[key];
        if (protectedTables.has(table) && existingFields[key] !== null && existingFields[key] !== undefined) {
          continue;
        }

        // Validation de base : les nombres doivent être des nombres
        if (typeof extractedValue === "number" && !isFinite(extractedValue)) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (newFields as any)[key] = extractedValue;
        hasNewData = true;
      }

      if (!hasNewData) {
        result.skipped++;
        continue;
      }

      // Upsert into thematic tables
      const today = new Date().toISOString().slice(0, 10);
      await upsertLocalityData(locality.id, today, newFields, "blog-ai");

      result.injected++;
    } catch (e) {
      result.errors.push({
        city: locData.city,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Marquer l'article comme injecté si au moins une localité a été enrichie
  if (result.injected > 0) {
    await markDataInjected(articleId);
  }

  return result;
}

/**
 * Auto-crée une localité "ville" en base à partir de geo.api.gouv.fr.
 * Rattache au premier nœud racine (France) s'il existe.
 */
async function autoCreateLocality(
  cityName: string,
  codeInsee?: string
): Promise<Locality | null> {
  try {
    // Résoudre les infos géographiques
    const geo = codeInsee
      ? await fetchGeoCityByCode(codeInsee)
      : await fetchGeoCity(cityName);

    if (!geo) return null;

    // Trouver le parent racine (France)
    const roots = await getRootLocalities();
    const parentId = roots[0]?.id ?? null;

    const id = await createLocality({
      name: geo.nom,
      type: "ville",
      parent_id: parentId,
      code: geo.code,
      postal_codes: JSON.stringify(geo.codesPostaux ?? []),
    });

    // Re-fetch to get the complete Locality with timestamps
    const created = await getLocalityById(id);
    return created ?? null;
  } catch {
    return null;
  }
}
