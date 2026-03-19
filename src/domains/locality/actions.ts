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
} from "./repository";
import { resolveLocalityData } from "./resolver";
import {
  LOCALITY_TYPES,
  LOCALITY_DATA_FIELD_KEYS,
  LocalityDataFields,
  LocalityTableName,
} from "./types";
import { enrichLocality } from "./enrichment/pipeline";
import type { EnrichLocalityResult } from "./enrichment/types";

// ─── Public action: fetch locality data for a city ───

export async function fetchLocalityFields(
  city: string,
  postalCode?: string
): Promise<{
  cityName: string;
  fields: LocalityDataFields;
  dataSources: Partial<Record<keyof LocalityDataFields, string>>;
} | null> {
  try {
    const resolved = await resolveLocalityData(city, postalCode);
    if (!resolved) return null;
    return {
      cityName: resolved.locality.name,
      fields: resolved.fields,
      dataSources: resolved.dataSources,
    };
  } catch {
    return null;
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
