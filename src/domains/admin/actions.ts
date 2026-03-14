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
