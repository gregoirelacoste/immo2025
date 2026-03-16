import { getDb } from "@/infrastructure/database/client";

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
