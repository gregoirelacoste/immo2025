"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-actions";
import {
  getAllLocalities,
  createLocality,
  deleteLocality,
  getLocalityDataHistory,
  createLocalityData,
  deleteLocalityData,
} from "@/domains/locality/repository";
import type { Locality, LocalityData } from "@/domains/locality/types";
import {
  updateEquipment,
  deleteEquipment,
  ensureEquipmentsExist,
} from "@/domains/property/equipment-service";

export async function adminGetLocalities(): Promise<{
  localities: Locality[];
  dataMap: Record<string, LocalityData[]>;
}> {
  await requireAdmin();
  const localities = await getAllLocalities();
  const dataMap: Record<string, LocalityData[]> = {};
  for (const loc of localities) {
    dataMap[loc.id] = await getLocalityDataHistory(loc.id);
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
  data: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireAdmin();
    await createLocalityData({ ...data, created_by: userId });
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminDeleteLocalityData(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await deleteLocalityData(id);
    revalidatePath("/admin");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Equipments (backward-compatible wrappers) ──────────

export async function adminUpdateEquipment(
  id: string,
  data: { label?: string; icon?: string; category?: string; value_impact_per_sqm?: number | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await updateEquipment(id, data);
    revalidatePath("/admin/equipments");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminDeleteEquipment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    await deleteEquipment(id);
    revalidatePath("/admin/equipments");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminCreateEquipment(data: {
  key: string;
  label: string;
  icon: string;
  category?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin();
    if (!data.key?.trim()) return { success: false, error: "Clé requise" };
    if (!data.label?.trim()) return { success: false, error: "Label requis" };
    await ensureEquipmentsExist([{ key: data.key, label: data.label, icon: data.icon || "🏠" }]);
    // Update category if provided
    if (data.category) {
      const { getEquipmentByKey } = await import("@/domains/property/equipment-service");
      const eq = await getEquipmentByKey(data.key);
      if (eq) await updateEquipment(eq.id, { category: data.category });
    }
    revalidatePath("/admin/equipments");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Generic reference items ─────────────────────────────

import {
  createItem,
  updateItem,
  deleteItem,
  addCondition,
  removeCondition,
} from "@/domains/reference/service";
import type { ReferenceItemType } from "@/domains/reference/types";

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
