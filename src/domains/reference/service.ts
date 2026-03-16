import { getDb } from "@/infrastructure/database/client";
import type { InValue } from "@libsql/client";
import type { ReferenceItem, ReferenceItemType, ReferenceCondition } from "./types";

// ─── Queries ──────────────────────────────────────────

/** All items of a given type, ordered by sort_order then label */
export async function getItemsByType(type: ReferenceItemType): Promise<ReferenceItem[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM reference_items WHERE type = ? ORDER BY is_default DESC, sort_order, label",
    args: [type],
  });
  return result.rows as unknown as ReferenceItem[];
}

/** Items of a type that have NO condition (base items) */
export async function getBaseItems(type: ReferenceItemType): Promise<ReferenceItem[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT ri.* FROM reference_items ri
          WHERE ri.type = ?
            AND NOT EXISTS (SELECT 1 FROM reference_conditions rc WHERE rc.item_id = ri.id)
          ORDER BY ri.sort_order, ri.label`,
    args: [type],
  });
  return result.rows as unknown as ReferenceItem[];
}

/** Items of a type that match a specific condition */
export async function getItemsByCondition(
  type: ReferenceItemType,
  conditionType: string,
  conditionValue: string,
): Promise<ReferenceItem[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT ri.* FROM reference_items ri
          JOIN reference_conditions rc ON rc.item_id = ri.id
          WHERE ri.type = ?
            AND rc.condition_type = ?
            AND rc.condition_value = ?
          ORDER BY rc.sort_order, ri.sort_order, ri.label`,
    args: [type, conditionType, conditionValue],
  });
  return result.rows as unknown as ReferenceItem[];
}

/** Items matching ANY of the given condition values */
export async function getItemsByConditions(
  type: ReferenceItemType,
  conditionType: string,
  conditionValues: string[],
): Promise<ReferenceItem[]> {
  if (conditionValues.length === 0) return [];
  const db = await getDb();
  const placeholders = conditionValues.map(() => "?").join(", ");
  const result = await db.execute({
    sql: `SELECT DISTINCT ri.* FROM reference_items ri
          JOIN reference_conditions rc ON rc.item_id = ri.id
          WHERE ri.type = ?
            AND rc.condition_type = ?
            AND rc.condition_value IN (${placeholders})
          ORDER BY rc.sort_order, ri.sort_order, ri.label`,
    args: [type, conditionType, ...conditionValues],
  });
  return result.rows as unknown as ReferenceItem[];
}

/** Get an item by type + key */
export async function getItemByKey(type: ReferenceItemType, key: string): Promise<ReferenceItem | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM reference_items WHERE type = ? AND key = ?",
    args: [type, key],
  });
  return (result.rows[0] as unknown as ReferenceItem) ?? null;
}

/** Get all conditions for an item */
export async function getConditionsForItem(itemId: string): Promise<ReferenceCondition[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM reference_conditions WHERE item_id = ? ORDER BY sort_order",
    args: [itemId],
  });
  return result.rows as unknown as ReferenceCondition[];
}

// ─── Mutations ────────────────────────────────────────

/** Create a reference item */
export async function createItem(data: {
  type: ReferenceItemType;
  key: string;
  label: string;
  icon?: string;
  category?: string;
  config?: string;
  is_default?: number;
  sort_order?: number;
}): Promise<ReferenceItem> {
  const db = await getDb();
  const id = `ri_${data.type.slice(0, 2)}_${data.key}`;
  await db.execute({
    sql: `INSERT INTO reference_items (id, type, key, label, icon, category, config, is_default, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      data.type,
      data.key,
      data.label,
      data.icon || "🏠",
      data.category || "general",
      data.config || "{}",
      data.is_default ?? 0,
      data.sort_order ?? 0,
    ],
  });
  return (await getItemByKey(data.type, data.key))!;
}

/** Update a reference item */
export async function updateItem(
  id: string,
  data: { label?: string; icon?: string; category?: string; config?: string; sort_order?: number },
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const args: InValue[] = [];

  if (data.label !== undefined) { sets.push("label = ?"); args.push(data.label); }
  if (data.icon !== undefined) { sets.push("icon = ?"); args.push(data.icon); }
  if (data.category !== undefined) { sets.push("category = ?"); args.push(data.category); }
  if (data.config !== undefined) { sets.push("config = ?"); args.push(data.config); }
  if (data.sort_order !== undefined) { sets.push("sort_order = ?"); args.push(data.sort_order); }

  if (sets.length === 0) return;
  args.push(id);
  await db.execute({ sql: `UPDATE reference_items SET ${sets.join(", ")} WHERE id = ?`, args });
}

/** Delete a reference item (only non-default) */
export async function deleteItem(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM reference_items WHERE id = ? AND is_default = 0",
    args: [id],
  });
}

/** Create items that don't already exist (for AI discovery) */
export async function ensureItemsExist(
  type: ReferenceItemType,
  items: Array<{ key: string; label: string; icon?: string; category?: string; config?: string }>,
): Promise<string[]> {
  if (items.length === 0) return [];
  const db = await getDb();
  const createdKeys: string[] = [];

  for (const item of items) {
    const key = item.key.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 50);
    if (!key) continue;
    const id = `ri_${type.slice(0, 2)}_${key}`;
    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO reference_items (id, type, key, label, icon, category, config, is_default, sort_order)
              VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        args: [id, type, key, item.label || key, item.icon || "🏠", item.category || "general", item.config || "{}"],
      });
      createdKeys.push(key);
    } catch {
      // already exists or invalid
    }
  }
  return createdKeys;
}

// ─── Conditions ───────────────────────────────────────

/** Add a condition to an item */
export async function addCondition(data: {
  item_id: string;
  condition_type: "amenity" | "property_type";
  condition_value: string;
  sort_order?: number;
}): Promise<void> {
  const db = await getDb();
  const id = `rc_${data.item_id}_${data.condition_type}_${data.condition_value}`;
  await db.execute({
    sql: `INSERT OR IGNORE INTO reference_conditions (id, item_id, condition_type, condition_value, sort_order)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, data.item_id, data.condition_type, data.condition_value, data.sort_order ?? 0],
  });
}

/** Remove a condition */
export async function removeCondition(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM reference_conditions WHERE id = ?",
    args: [id],
  });
}
