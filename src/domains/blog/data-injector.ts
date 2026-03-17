/**
 * Data Injector — injecte les données extraites d'un article
 * dans la table locality_data pour enrichir l'app.
 *
 * Stratégie :
 * - Crée un nouveau snapshot avec created_by = "blog-ai"
 * - Ne jamais écraser les données créées par "admin" ou "import-initial"
 * - Merge field-by-field : seuls les champs null/manquants sont complétés
 */

import { findLocalityByCity, getLatestLocalityData, createLocalityData } from "@/domains/locality/repository";
import { LOCALITY_DATA_FIELD_KEYS, LocalityDataFields } from "@/domains/locality/types";
import { GeneratedArticle } from "./types";
import { markDataInjected } from "./repository";

interface InjectionResult {
  injected: number;
  skipped: number;
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
  const result: InjectionResult = { injected: 0, skipped: 0, errors: [] };

  const localities = extractedData.localities ?? [];
  if (localities.length === 0) {
    return result;
  }

  for (const locData of localities) {
    try {
      // Trouver la localité en base
      const locality = await findLocalityByCity(
        locData.city,
        undefined,
        locData.code_insee
      );

      if (!locality) {
        result.skipped++;
        result.errors.push({
          city: locData.city,
          error: `Localité non trouvée en base`,
        });
        continue;
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
