import { getDb } from "@/infrastructure/database/client";
import type { InValue } from "@libsql/client";

export interface Equipment {
  id: string;
  key: string;
  label: string;
  icon: string;
  category: string;
  is_default: number;
  value_impact_per_sqm: number | null;
  created_at: string;
}

/** Retourne tous les équipements, defaults en premier puis par label */
export async function getAllEquipments(): Promise<Equipment[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT * FROM equipments ORDER BY is_default DESC, category, label"
  );
  return result.rows as unknown as Equipment[];
}

/** Retourne un équipement par sa clé */
export async function getEquipmentByKey(key: string): Promise<Equipment | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM equipments WHERE key = ?",
    args: [key],
  });
  return (result.rows[0] as unknown as Equipment) ?? null;
}

/** Met à jour un équipement */
export async function updateEquipment(
  id: string,
  data: { label?: string; icon?: string; category?: string; value_impact_per_sqm?: number | null }
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const args: InValue[] = [];

  if (data.label !== undefined) { sets.push("label = ?"); args.push(data.label); }
  if (data.icon !== undefined) { sets.push("icon = ?"); args.push(data.icon); }
  if (data.category !== undefined) { sets.push("category = ?"); args.push(data.category); }
  if (data.value_impact_per_sqm !== undefined) {
    sets.push("value_impact_per_sqm = ?");
    args.push(data.value_impact_per_sqm);
  }

  if (sets.length === 0) return;
  args.push(id);
  await db.execute({ sql: `UPDATE equipments SET ${sets.join(", ")} WHERE id = ?`, args });
}

/** Supprime un équipement (seulement les non-default) */
export async function deleteEquipment(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM equipments WHERE id = ? AND is_default = 0",
    args: [id],
  });
}

/** Crée les équipements manquants (utilisé par l'IA lors de la découverte) */
export async function ensureEquipmentsExist(
  items: Array<{ key: string; label: string; icon: string }>
): Promise<string[]> {
  if (items.length === 0) return [];
  const db = await getDb();
  const createdKeys: string[] = [];

  for (const item of items) {
    const key = item.key.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 50);
    if (!key) continue;
    try {
      await db.execute({
        sql: "INSERT OR IGNORE INTO equipments (id, key, label, icon, category, is_default) VALUES (?, ?, ?, ?, 'general', 0)",
        args: [`eq_${key}`, key, item.label || key, item.icon || "🏠"],
      });
      createdKeys.push(key);
    } catch {
      // already exists or invalid
    }
  }
  return createdKeys;
}
