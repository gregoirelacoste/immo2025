import {
  getItemsByType,
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
