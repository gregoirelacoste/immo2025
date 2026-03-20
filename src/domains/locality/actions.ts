"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth-actions";
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
} from "./repository";
import { fetchGeoCity } from "@/infrastructure/data-sources/geo-client";
import { resolveLocalityData } from "./resolver";
import {
  LOCALITY_TYPES,
  LOCALITY_DATA_FIELD_KEYS,
  LocalityDataFields,
  LocalityTableName,
} from "./types";
import { enrichLocality } from "./enrichment/pipeline";
import type { EnrichLocalityResult } from "./enrichment/types";

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

    // Quartier: search by name + parent_id
    if (!parentId) return { found: false };
    const db = await (await import("@/infrastructure/database/client")).getDb();
    const result = await db.execute({
      sql: "SELECT * FROM localities WHERE LOWER(name) = LOWER(?) AND parent_id = ? AND type = 'quartier' LIMIT 1",
      args: [trimmed, parentId],
    });
    if (!result.rows[0]) return { found: false };
    const row = result.rows[0];
    return { found: true, name: row.name as string };
  } catch {
    return null;
  }
}

// ─── Public action: fetch locality data for a city ───

export async function fetchLocalityFields(
  city: string,
  postalCode?: string
): Promise<{
  cityName: string;
  fields: LocalityDataFields;
  dataSources: Partial<Record<keyof LocalityDataFields, string>>;
  fieldSources: Partial<Record<keyof LocalityDataFields, { localityName: string; localityType: string }>>;
} | null> {
  try {
    const resolved = await resolveLocalityData(city, postalCode);
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
  cityName: string
): Promise<{ success: boolean; id?: string; fieldsUpdated?: number; error?: string }> {
  try {
    await requireUserId();
    if (!cityName.trim()) return { success: false, error: "Le nom de la ville est requis." };

    // Check if already exists
    const existing = await findLocalityByCity(cityName.trim());
    if (existing) {
      // Already exists — just enrich
      const enrichResult = await enrichLocality(existing.id, { force: true, enrichParents: true });
      revalidatePath("/localities");
      revalidatePath("/guide", "layout");
      return { success: true, id: existing.id, fieldsUpdated: enrichResult.fieldsUpdated };
    }

    // Resolve via geo API
    let geo;
    try {
      geo = await fetchGeoCity(cityName.trim());
    } catch (geoErr) {
      return { success: false, error: `Erreur geo API: ${geoErr instanceof Error ? geoErr.message : String(geoErr)}` };
    }
    if (!geo) return { success: false, error: `Ville "${cityName}" introuvable via geo.api.gouv.fr.` };

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
