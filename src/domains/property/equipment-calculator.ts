/**
 * Calcul du loyer ajusté en fonction des équipements présents/absents.
 */

import { EQUIPMENT_IMPACTS, type EquipmentImpact } from "./equipment-impact";

export interface EquipmentItemResult {
  key: string;
  label: string;
  icon: string;
  category: EquipmentImpact["category"];
  present: boolean;
  /** Impact appliqué (valeur brute : +0.05, -0.03, etc.) */
  impactPercent: number;
}

export interface EquipmentSummary {
  /** Loyer marché × (1 + Σ impacts%) */
  adjustedRentPerM2: number;
  /** Somme de tous les impacts en % (peut être négatif) */
  totalImpactPercent: number;
  /** Détail par équipement */
  items: EquipmentItemResult[];
}

/**
 * Calcule le loyer ajusté en fonction des équipements.
 * @param marketRentPerM2 Loyer de marché au m²
 * @param amenities Liste des clés d'équipements présents
 */
export function calculateEquipmentImpact(
  marketRentPerM2: number,
  amenities: string[]
): EquipmentSummary {
  const amenitySet = new Set(amenities);
  let totalImpactPercent = 0;
  const items: EquipmentItemResult[] = [];

  for (const eq of EQUIPMENT_IMPACTS) {
    const present = amenitySet.has(eq.key);
    const impact = present ? eq.impactPresent : eq.impactAbsent;

    items.push({
      key: eq.key,
      label: eq.label,
      icon: eq.icon,
      category: eq.category,
      present,
      impactPercent: impact,
    });

    totalImpactPercent += impact;
  }

  const adjustedRentPerM2 = marketRentPerM2 * (1 + totalImpactPercent);

  return {
    adjustedRentPerM2: Math.round(adjustedRentPerM2 * 100) / 100,
    totalImpactPercent: Math.round(totalImpactPercent * 1000) / 1000,
    items,
  };
}
