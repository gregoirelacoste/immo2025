import {
  getItemsByType,
  getItemByKey,
  updateItem,
  deleteItem,
  ensureItemsExist,
} from "@/domains/reference/service";
import type { ReferenceItem, EquipmentConfig } from "@/domains/reference/types";
import { parseConfig } from "@/domains/reference/types";

// ─── Equipment interface (backward-compatible) ───────

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

/** Map a ReferenceItem to the Equipment shape */
function toEquipment(item: ReferenceItem): Equipment {
  const cfg = parseConfig<EquipmentConfig>(item.config);
  return {
    id: item.id,
    key: item.key,
    label: item.label,
    icon: item.icon,
    category: item.category,
    is_default: item.is_default,
    value_impact_per_sqm: cfg.value_impact_per_sqm ?? null,
    created_at: item.created_at,
  };
}

/** Retourne tous les équipements, defaults en premier puis par label */
export async function getAllEquipments(): Promise<Equipment[]> {
  const items = await getItemsByType("equipment");
  return items.map(toEquipment);
}

/** Retourne un équipement par sa clé */
export async function getEquipmentByKey(key: string): Promise<Equipment | null> {
  const item = await getItemByKey("equipment", key);
  return item ? toEquipment(item) : null;
}

/** Met à jour un équipement */
export async function updateEquipment(
  id: string,
  data: { label?: string; icon?: string; category?: string; value_impact_per_sqm?: number | null },
): Promise<void> {
  // Build config update if value_impact_per_sqm changed
  let config: string | undefined;
  if (data.value_impact_per_sqm !== undefined) {
    // Read current config, merge
    const { getDb } = await import("@/infrastructure/database/client");
    const db = await getDb();
    const result = await db.execute({ sql: "SELECT config FROM reference_items WHERE id = ?", args: [id] });
    const currentConfig = result.rows[0]
      ? parseConfig<EquipmentConfig>(result.rows[0].config as string)
      : {};
    config = JSON.stringify({ ...currentConfig, value_impact_per_sqm: data.value_impact_per_sqm });
  }

  await updateItem(id, {
    label: data.label,
    icon: data.icon,
    category: data.category,
    config,
  });
}

/** Supprime un équipement (seulement les non-default) */
export async function deleteEquipment(id: string): Promise<void> {
  await deleteItem(id);
}

/** Crée les équipements manquants (utilisé par l'IA lors de la découverte) */
export async function ensureEquipmentsExist(
  items: Array<{ key: string; label: string; icon: string }>,
): Promise<string[]> {
  return ensureItemsExist(
    "equipment",
    items.map((i) => ({
      key: i.key,
      label: i.label,
      icon: i.icon,
      config: JSON.stringify({ value_impact_per_sqm: null }),
    })),
  );
}
