"use server";

import { revalidatePath } from "next/cache";
import { requireUserId, getAuthContext } from "@/lib/auth-actions";
import {
  createLocality,
  updateLocality,
  deleteLocality as repoDeleteLocality,
  upsertLocalityData,
  deleteLocalityDataRow,
  getLocalityById,
  getSnapshotFields,
  findLocalityByCity,
  getRootLocalities,
  getAllLocalities,
} from "./repository";
import { fetchGeoCity, fetchGeoCityByCode } from "@/infrastructure/data-sources/geo-client";
import { resolveLocalityData } from "./resolver";
import {
  LOCALITY_TYPES,
  LOCALITY_DATA_FIELD_KEYS,
  LocalityDataFields,
  LocalityTableName,
} from "./types";
import { enrichLocality } from "./enrichment/pipeline";
import type { EnrichLocalityResult } from "./enrichment/types";
import { getPropertyByIdPublic } from "@/domains/property/repository";
import { getLatestLocalityFields } from "./repository";
import { researchNeighborhood, RESEARCH_CACHE_DAYS } from "./enrichment/research";
import { normalizeNeighborhoodName, neighborhoodMatchKey } from "./normalize";

// ─── Public action: check if a locality exists in DB ───

export async function checkLocalityExists(
  name: string,
  type: "ville" | "quartier",
  parentId?: string
): Promise<{ found: boolean; name?: string; postalCodes?: string[] } | null> {
  try {
    const trimmed = name.trim();
    if (!trimmed) return null;

    if (type === "ville") {
      const loc = await findLocalityByCity(trimmed);
      if (!loc) return { found: false };
      const postalCodes = (() => {
        try { return JSON.parse(loc.postal_codes); } catch { return []; }
      })();
      return { found: true, name: loc.name, postalCodes };
    }

    // Quartier: search by name + parent_id (fuzzy match via normalized key)
    if (!parentId) return { found: false };
    const db = await (await import("@/infrastructure/database/client")).getDb();
    const searchKey = neighborhoodMatchKey(trimmed);
    const allQuartiers = await db.execute({
      sql: "SELECT * FROM localities WHERE parent_id = ? AND type = 'quartier'",
      args: [parentId],
    });
    const match = allQuartiers.rows.find(
      (r) => neighborhoodMatchKey(r.name as string) === searchKey
    );
    if (!match) return { found: false };
    return { found: true, name: match.name as string };
  } catch {
    return null;
  }
}

// ─── Public action: fetch locality data for a city ───

export async function fetchLocalityFields(
  city: string,
  postalCode?: string,
  neighborhood?: string
): Promise<{
  cityName: string;
  fields: LocalityDataFields;
  dataSources: Partial<Record<keyof LocalityDataFields, string>>;
  fieldSources: Partial<Record<keyof LocalityDataFields, { localityName: string; localityType: string }>>;
} | null> {
  try {
    const resolved = await resolveLocalityData(city, postalCode, undefined, undefined, neighborhood);
    if (!resolved) return null;

    // Strip localityId from fieldSources (don't expose internal IDs to client)
    const clientFieldSources: Partial<Record<keyof LocalityDataFields, { localityName: string; localityType: string }>> = {};
    for (const [key, source] of Object.entries(resolved.fieldSources)) {
      if (source) {
        clientFieldSources[key as keyof LocalityDataFields] = {
          localityName: source.localityName,
          localityType: source.localityType,
        };
      }
    }

    return {
      cityName: resolved.locality.name,
      fields: resolved.fields,
      dataSources: resolved.dataSources,
      fieldSources: clientFieldSources,
    };
  } catch {
    return null;
  }
}

// ─── Quick add: resolve via geo API + create + enrich ───

export async function addAndEnrichLocality(
  input: string
): Promise<{ success: boolean; id?: string; fieldsUpdated?: number; error?: string }> {
  try {
    await requireUserId();
    const trimmed = input.trim();
    if (!trimmed) return { success: false, error: "Le nom de la ville ou le code postal est requis." };

    const isPostalCode = /^\d{5}$/.test(trimmed);

    // Check if already exists
    const existing = isPostalCode
      ? await findLocalityByCity("", trimmed)
      : await findLocalityByCity(trimmed);
    if (existing) {
      const enrichResult = await enrichLocality(existing.id, { force: true, enrichParents: true });
      revalidatePath("/localities");
      revalidatePath("/guide", "layout");
      return { success: true, id: existing.id, fieldsUpdated: enrichResult.fieldsUpdated };
    }

    // Resolve via geo API — by postal code or by name
    let geo;
    try {
      geo = isPostalCode
        ? await fetchGeoCity("", trimmed)
        : await fetchGeoCity(trimmed);
    } catch (geoErr) {
      return { success: false, error: `Erreur geo API: ${geoErr instanceof Error ? geoErr.message : String(geoErr)}` };
    }
    if (!geo) return { success: false, error: `"${trimmed}" introuvable via geo.api.gouv.fr.` };

    // Find root parent
    const roots = await getRootLocalities();
    const parentId = roots[0]?.id ?? null;

    // Create locality
    const id = await createLocality({
      name: geo.nom,
      type: "ville",
      parent_id: parentId,
      code: geo.code,
      postal_codes: JSON.stringify(geo.codesPostaux ?? []),
    });

    // Auto-enrich
    const enrichResult = await enrichLocality(id, { force: true, enrichParents: false });

    revalidatePath("/localities");
    revalidatePath("/guide", "layout");
    return { success: true, id, fieldsUpdated: enrichResult.fieldsUpdated };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Locality CRUD ───

export async function addLocality(data: {
  name: string;
  type: string;
  parent_id?: string | null;
  code?: string;
  postal_codes?: string[];
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    await requireUserId();

    if (!data.name.trim()) return { success: false, error: "Le nom est requis." };
    if (!LOCALITY_TYPES.includes(data.type as typeof LOCALITY_TYPES[number])) {
      return { success: false, error: `Type invalide. Valeurs acceptées : ${LOCALITY_TYPES.join(", ")}` };
    }

    // Validate parent exists if provided
    if (data.parent_id) {
      const parent = await getLocalityById(data.parent_id);
      if (!parent) return { success: false, error: "Localité parente introuvable." };
    }

    const id = await createLocality({
      name: data.name.trim(),
      type: data.type,
      parent_id: data.parent_id ?? null,
      code: data.code?.trim() || "",
      postal_codes: JSON.stringify(data.postal_codes || []),
    });

    revalidatePath("/localities");
    revalidatePath("/guide", "layout");
    return { success: true, id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function editLocality(
  id: string,
  data: {
    name?: string;
    type?: string;
    parent_id?: string | null;
    code?: string;
    postal_codes?: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireUserId();

    if (data.type && !LOCALITY_TYPES.includes(data.type as typeof LOCALITY_TYPES[number])) {
      return { success: false, error: `Type invalide.` };
    }

    await updateLocality(id, {
      ...data,
      name: data.name?.trim(),
      postal_codes: data.postal_codes ? JSON.stringify(data.postal_codes) : undefined,
    });

    revalidatePath("/localities");
    revalidatePath("/guide", "layout");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeLocality(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireUserId();
    await repoDeleteLocality(id);
    revalidatePath("/localities");
    revalidatePath("/guide", "layout");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Enrichment ───

export async function enrichLocalityAction(
  localityId: string
): Promise<{ success: boolean; result?: EnrichLocalityResult; error?: string }> {
  try {
    await requireUserId();
    const result = await enrichLocality(localityId, { force: true, enrichParents: true });
    revalidatePath("/localities");
    revalidatePath("/guide", "layout");
    return { success: true, result };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Locality Data (thematic tables) ───

/**
 * Import locality data from a JSON object — dispatches fields to thematic tables.
 * JSON format is the same flat object as before (LocalityDataFields keys).
 */
export async function importLocalityData(
  localityId: string,
  validFrom: string,
  jsonData: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();

    // Validate locality exists
    const locality = await getLocalityById(localityId);
    if (!locality) return { success: false, error: "Localité introuvable." };

    // Validate date
    if (!/^\d{4}-\d{2}-\d{2}$/.test(validFrom)) {
      return { success: false, error: "Format de date invalide (YYYY-MM-DD attendu)." };
    }

    // Parse and validate JSON
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonData);
    } catch {
      return { success: false, error: "JSON invalide." };
    }

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { success: false, error: "Le JSON doit être un objet." };
    }

    // Filter to only known fields
    const cleaned: Partial<LocalityDataFields> = {};
    for (const key of LOCALITY_DATA_FIELD_KEYS) {
      if (key in parsed && parsed[key] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (cleaned as any)[key] = parsed[key];
      }
    }

    if (Object.keys(cleaned).length === 0) {
      return { success: false, error: "Aucun champ valide trouvé dans le JSON." };
    }

    await upsertLocalityData(localityId, validFrom, cleaned, userId);

    revalidatePath("/localities");
    revalidatePath("/guide", "layout");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function fetchSnapshotFields(
  table: LocalityTableName,
  localityId: string,
  validFrom: string
): Promise<Record<string, unknown> | null> {
  try {
    const fields = await getSnapshotFields(table, localityId, validFrom);
    return fields ?? null;
  } catch {
    return null;
  }
}

export async function removeLocalityData(
  table: LocalityTableName,
  localityId: string,
  validFrom: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireUserId();
    await deleteLocalityDataRow(table, localityId, validFrom);
    revalidatePath("/localities");
    revalidatePath("/guide", "layout");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Backfill postal codes for all cities missing them ───

export async function backfillPostalCodes(): Promise<{
  success: boolean;
  updated: number;
  skipped: number;
  errors: string[];
  error?: string;
}> {
  try {
    await requireUserId();
    const localities = await getAllLocalities();
    const cities = localities.filter((l) => {
      if (l.type !== "ville") return false;
      const pc: string[] = JSON.parse(l.postal_codes || "[]");
      return pc.length === 0;
    });

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const city of cities) {
      try {
        const geo = city.code
          ? await fetchGeoCityByCode(city.code)
          : await fetchGeoCity(city.name);

        if (!geo?.codesPostaux?.length) {
          skipped++;
          continue;
        }

        await updateLocality(city.id, {
          postal_codes: JSON.stringify(geo.codesPostaux),
        });
        updated++;

        // Rate-limit geo API calls
        await new Promise((r) => setTimeout(r, 100));
      } catch (e) {
        errors.push(`${city.name}: ${(e as Error).message}`);
      }
    }

    revalidatePath("/guide", "layout");
    return { success: true, updated, skipped, errors };
  } catch (e) {
    return { success: false, updated: 0, skipped: 0, errors: [], error: (e as Error).message };
  }
}

// ─── Premium: Neighborhood qualitative research ───

/**
 * Search for qualitative neighborhood data via Gemini + Google Search grounding.
 * Premium-gated. Creates the quartier locality if it doesn't exist yet.
 * Caches results for 30 days per quartier locality.
 */
export async function searchQuartier(
  propertyId: string,
  options?: { force?: boolean }
): Promise<{ success: boolean; fields?: Partial<LocalityDataFields>; error?: string }> {
  try {
    const { userId, isPremium, isAdmin } = await getAuthContext();
    if (!userId) return { success: false, error: "Non authentifié" };
    if (!isPremium && !isAdmin) return { success: false, error: "Fonctionnalité premium" };

    // 1. Fetch property (with ownership check)
    const property = await getPropertyByIdPublic(propertyId);
    if (!property) return { success: false, error: "Bien introuvable" };
    if (!property.city) return { success: false, error: "Ville non renseignée pour ce bien" };
    if (property.user_id && property.user_id !== userId && !isAdmin) {
      return { success: false, error: "Accès non autorisé" };
    }

    const rawNeighborhood = property.neighborhood?.trim() || property.city;
    const neighborhoodName = normalizeNeighborhoodName(rawNeighborhood);
    const searchKey = neighborhoodMatchKey(neighborhoodName);

    // 2. Find or create the quartier locality (fuzzy match by normalized key)
    const ville = await findLocalityByCity(property.city, property.postal_code || undefined);
    if (!ville) return { success: false, error: `Ville "${property.city}" introuvable en base` };

    let quartierLocality: Awaited<ReturnType<typeof getLocalityById>>;
    const db = await (await import("@/infrastructure/database/client")).getDb();
    const allQuartiers = await db.execute({
      sql: "SELECT * FROM localities WHERE parent_id = ? AND type = 'quartier'",
      args: [ville.id],
    });
    const existingRow = allQuartiers.rows.find(
      (r) => neighborhoodMatchKey(r.name as string) === searchKey
    );

    if (existingRow) {
      quartierLocality = {
        id: existingRow.id as string,
        name: existingRow.name as string,
        type: "quartier" as const,
        parent_id: ville.id,
        code: (existingRow.code as string) || "",
        postal_codes: (existingRow.postal_codes as string) || "[]",
        created_at: existingRow.created_at as string,
        updated_at: existingRow.updated_at as string,
      };
    } else {
      const id = await createLocality({
        name: neighborhoodName,
        type: "quartier",
        parent_id: ville.id,
        code: "",
        postal_codes: ville.postal_codes || "[]",
      });
      quartierLocality = await getLocalityById(id);
    }

    if (!quartierLocality) return { success: false, error: "Erreur création quartier" };

    // 3. Fetch ville quantitative data (used for both cache return and context injection)
    const resolved = await resolveLocalityData(property.city, property.postal_code || undefined);
    const villeFields = resolved?.fields || {};

    // Helper: merge quartier qualitative data with ville quantitative data
    const mergeWithQuartier = async () => {
      const quartierFields = await getLatestLocalityFields(quartierLocality!.id);
      return { ...villeFields, ...quartierFields };
    };

    // 4. Check cache — skip if enriched recently (< 30 days)
    if (!options?.force) {
      const cacheCheck = await db.execute({
        sql: `SELECT created_at FROM locality_qualitative WHERE locality_id = ? ORDER BY valid_from DESC LIMIT 1`,
        args: [quartierLocality.id],
      });
      if (cacheCheck.rows[0]) {
        const createdAt = new Date(cacheCheck.rows[0].created_at as string);
        const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < RESEARCH_CACHE_DAYS) {
          const mergedFields = await mergeWithQuartier();
          return { success: true, fields: mergedFields };
        }
      }
    }

    // 5. Run Gemini research
    const qualitativeFields = await researchNeighborhood(
      property.city,
      neighborhoodName,
      property.postal_code || "",
      villeFields
    );

    // 6. Persist to locality_qualitative
    const today = new Date().toISOString().split("T")[0];
    await upsertLocalityData(quartierLocality.id, today, qualitativeFields, "ai:gemini-search");

    revalidatePath(`/property/${propertyId}`);

    // Return merged fields (ville quantitative + quartier qualitative)
    const mergedFields = await mergeWithQuartier();
    return { success: true, fields: mergedFields };
  } catch (e) {
    console.error("[searchQuartier] Research failed:", e);
    return {
      success: false,
      error: e instanceof Error ? e.message : "Erreur lors de la recherche quartier",
    };
  }
}
