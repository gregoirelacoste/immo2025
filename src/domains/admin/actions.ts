"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-actions";
import { getDb } from "@/infrastructure/database/client";
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

// ─── Statistics ─────────────────────────────────────────

export interface AdminStats {
  usersTotal: number;
  usersThisWeek: number;
  usersThisMonth: number;
  recentUsers: { email: string; name: string; created_at: string }[];
  propertiesTotal: number;
  localitiesTotal: number;
  guidesVille: number;
  guidesQuartier: number;
  articlesTotal: number;
}

export async function adminGetStatistics(): Promise<AdminStats> {
  await requireAdmin();
  const db = await getDb();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [usersRes, recentUsersRes, propertiesRes, localitiesRes, guidesRes] = await Promise.all([
    db.execute({
      sql: `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as this_week,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as this_month
        FROM users`,
      args: [weekAgo, monthAgo],
    }),
    db.execute({
      sql: `SELECT email, name, created_at FROM users ORDER BY created_at DESC LIMIT 20`,
      args: [],
    }),
    db.execute({ sql: `SELECT COUNT(*) as total FROM properties`, args: [] }),
    db.execute({ sql: `SELECT COUNT(*) as total FROM localities`, args: [] }),
    db.execute({
      sql: `SELECT
        SUM(CASE WHEN category = 'guide_ville' AND status = 'published' THEN 1 ELSE 0 END) as guides_ville,
        SUM(CASE WHEN category = 'guide_quartier' AND status = 'published' THEN 1 ELSE 0 END) as guides_quartier,
        COUNT(*) as total
        FROM blog_articles`,
      args: [],
    }),
  ]);

  const uRow = usersRes.rows[0];
  const gRow = guidesRes.rows[0];

  return {
    usersTotal: Number(uRow?.total ?? 0),
    usersThisWeek: Number(uRow?.this_week ?? 0),
    usersThisMonth: Number(uRow?.this_month ?? 0),
    recentUsers: recentUsersRes.rows.map((r) => ({
      email: String(r.email ?? ""),
      name: String(r.name ?? ""),
      created_at: String(r.created_at ?? ""),
    })),
    propertiesTotal: Number(propertiesRes.rows[0]?.total ?? 0),
    localitiesTotal: Number(localitiesRes.rows[0]?.total ?? 0),
    guidesVille: Number(gRow?.guides_ville ?? 0),
    guidesQuartier: Number(gRow?.guides_quartier ?? 0),
    articlesTotal: Number(gRow?.total ?? 0),
  };
}
