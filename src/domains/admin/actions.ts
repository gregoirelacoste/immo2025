"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-actions";
import {
  getAllLocalities,
  createLocality,
  deleteLocality,
  getLocalitySnapshotsBatch,
  upsertLocalityData,
  deleteLocalityDataRow,
} from "@/domains/locality/repository";
import type { Locality, LocalityDataSnapshot, LocalityTableName, LocalityDataFields } from "@/domains/locality/types";
import {
  createItem,
  updateItem,
  deleteItem,
  addCondition,
  removeCondition,
} from "@/domains/reference/service";
import type { ReferenceItemType } from "@/domains/reference/types";

export async function adminGetLocalities(): Promise<{
  localities: Locality[];
  dataMap: Record<string, LocalityDataSnapshot[]>;
}> {
  await requireAdmin();
  const localities = await getAllLocalities();

  const localityIds = localities.map((l) => l.id);
  const dataMap = await getLocalitySnapshotsBatch(localityIds);

  // Ensure every locality has an entry (even if empty)
  for (const loc of localities) {
    if (!dataMap[loc.id]) dataMap[loc.id] = [];
  }

  return { localities, dataMap };
}

export async function adminCreateLocality(formData: {
  name: string;
  type: string;
  parent_id?: string | null;
  code?: string;
  postal_codes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!formData.name?.trim()) return { success: false, error: "Nom requis" };
    await createLocality(formData);
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminDeleteLocality(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await deleteLocality(id);
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminCreateLocalityData(data: {
  locality_id: string;
  valid_from: string;
  data: string; // JSON of LocalityDataFields
}): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAdmin();
    let fields: Partial<LocalityDataFields>;
    try {
      fields = JSON.parse(data.data);
    } catch {
      return { success: false, error: "JSON invalide" };
    }
    await upsertLocalityData(data.locality_id, data.valid_from, fields, userId);
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminDeleteLocalityData(
  table: LocalityTableName,
  localityId: string,
  validFrom: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await deleteLocalityDataRow(table, localityId, validFrom);
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Generic reference items ─────────────────────────────

export async function adminCreateReferenceItem(data: {
  type: ReferenceItemType;
  key: string;
  label: string;
  icon?: string;
  category?: string;
  config?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!data.key?.trim()) return { success: false, error: "Clé requise" };
    if (!data.label?.trim()) return { success: false, error: "Label requis" };
    await createItem(data);
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminUpdateReferenceItem(
  id: string,
  data: { label?: string; icon?: string; category?: string; config?: string; sort_order?: number },
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await updateItem(id, data);
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminDeleteReferenceItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await deleteItem(id);
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminAddReferenceCondition(data: {
  item_id: string;
  condition_type: "amenity" | "property_type";
  condition_value: string;
  sort_order?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await addCondition(data);
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminRemoveReferenceCondition(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await removeCondition(id);
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
