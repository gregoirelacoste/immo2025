/**
 * Data Injector — injecte les données extraites d'un article
 * dans la table locality_data pour enrichir l'app.
 *
 * Stratégie :
 * - Crée un nouveau snapshot avec created_by = "blog-ai"
 * - Ne jamais écraser les données créées par "admin" ou "import-initial"
 * - Merge field-by-field : seuls les champs null/manquants sont complétés
 */

import { findLocalityByCity, getLatestLocalityData, createLocalityData, createLocality, getRootLocalities, getLocalityById } from "@/domains/locality/repository";
import { LOCALITY_DATA_FIELD_KEYS, LocalityDataFields, Locality } from "@/domains/locality/types";
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
 * Injecte les données extraites d'un article dans locality_data.
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
      const existing = await getLatestLocalityData(locality.id);
      let existingFields: LocalityDataFields = {};
      if (existing) {
        try {
          existingFields = JSON.parse(existing.data);
        } catch {
          existingFields = {};
        }
      }

      // Vérifier que les données existantes ne sont pas "admin" (protégées)
      const isAdminData =
        existing?.created_by === "admin" || existing?.created_by === "import-initial";

      // Filtrer les champs valides et non-null du extract
      const newFields: Record<string, unknown> = {};
      let hasNewData = false;

      for (const key of LOCALITY_DATA_FIELD_KEYS) {
        const extractedValue = locData.fields[key];

        // Ignorer les valeurs null/undefined
        if (extractedValue === null || extractedValue === undefined) continue;

        // Si données admin et champ déjà rempli → ne pas écraser
        if (isAdminData && existingFields[key] !== null && existingFields[key] !== undefined) {
          continue;
        }

        // Validation de base : les nombres doivent être des nombres
        if (typeof extractedValue === "number" && !isFinite(extractedValue)) continue;

        newFields[key] = extractedValue;
        hasNewData = true;
      }

      if (!hasNewData) {
        result.skipped++;
        continue;
      }

      // Merger avec les données existantes
      const mergedFields = { ...existingFields, ...newFields };

      // Créer un nouveau snapshot
      const today = new Date().toISOString().slice(0, 10);
      await createLocalityData({
        locality_id: locality.id,
        valid_from: today,
        data: JSON.stringify(mergedFields),
        created_by: "blog-ai",
      });

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
