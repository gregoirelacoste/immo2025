/**
 * Registre des impacts locatifs par équipement.
 * Chaque équipement a un impact sur le loyer au m² en % quand présent ou absent.
 */

export interface EquipmentImpact {
  key: string;
  label: string;
  icon: string;
  category: "exterieur" | "confort";
  /** Impact % sur le loyer si présent */
  impactPresent: number;
  /** Impact % sur le loyer si absent */
  impactAbsent: number;
  /** Condition spéciale (ex: ascenseur seulement si étage >= 3) */
  condition?: string;
  /** Coût de remplacement (€) — pour calculer la provision entretien */
  replacementCost?: number;
  /** Durée de vie en années — pour calculer la provision entretien */
  lifespanYears?: number;
}

export const EQUIPMENT_IMPACTS: EquipmentImpact[] = [
  // ── Extérieur & parties communes ──
  { key: "parking", label: "Parking / garage", icon: "🅿️", category: "exterieur", impactPresent: 0.05, impactAbsent: -0.01 },
  { key: "cave", label: "Cave", icon: "🏚️", category: "exterieur", impactPresent: 0.02, impactAbsent: 0 },
  { key: "balcon", label: "Balcon", icon: "🌇", category: "exterieur", impactPresent: 0.04, impactAbsent: 0 },
  { key: "terrasse", label: "Terrasse", icon: "☀️", category: "exterieur", impactPresent: 0.06, impactAbsent: 0 },
  { key: "jardin", label: "Jardin privatif", icon: "🌳", category: "exterieur", impactPresent: 0.05, impactAbsent: 0 },
  { key: "ascenseur", label: "Ascenseur", icon: "🛗", category: "exterieur", impactPresent: 0.03, impactAbsent: -0.03, condition: "etage >= 3" },
  { key: "gardien", label: "Gardien / concierge", icon: "👤", category: "exterieur", impactPresent: 0.02, impactAbsent: 0 },

  // ── Confort intérieur ──
  { key: "cuisine_equipee", label: "Cuisine équipée", icon: "🍳", category: "confort", impactPresent: 0.03, impactAbsent: -0.01, replacementCost: 2000, lifespanYears: 10 },
  { key: "climatisation", label: "Climatisation", icon: "❄️", category: "confort", impactPresent: 0.03, impactAbsent: 0 },
  { key: "double_vitrage", label: "Double vitrage", icon: "🪟", category: "confort", impactPresent: 0.02, impactAbsent: -0.015 },
  { key: "fibre", label: "Fibre optique", icon: "📡", category: "confort", impactPresent: 0.01, impactAbsent: -0.005 },
  { key: "cheminee", label: "Cheminée / poêle", icon: "🔥", category: "confort", impactPresent: 0.01, impactAbsent: 0 },
  { key: "parquet", label: "Parquet", icon: "🪵", category: "confort", impactPresent: 0.01, impactAbsent: 0 },
  { key: "interphone", label: "Interphone / digicode", icon: "🔔", category: "confort", impactPresent: 0.01, impactAbsent: 0 },
  { key: "meuble", label: "Meublé", icon: "🛋️", category: "confort", impactPresent: 0.15, impactAbsent: 0 },
  { key: "piscine", label: "Piscine", icon: "🏊", category: "confort", impactPresent: 0.08, impactAbsent: 0 },
  // ── Équipements avec entretien récurrent ──
  { key: "chauffe_eau", label: "Chauffe-eau", icon: "🚿", category: "confort", impactPresent: 0, impactAbsent: 0, replacementCost: 1200, lifespanYears: 12 },
  { key: "chaudiere", label: "Chaudière / PAC", icon: "🔧", category: "confort", impactPresent: 0, impactAbsent: 0, replacementCost: 4000, lifespanYears: 15 },
];

export const EQUIPMENT_CATEGORIES: { key: EquipmentImpact["category"]; label: string }[] = [
  { key: "exterieur", label: "Extérieur & parties communes" },
  { key: "confort", label: "Confort intérieur" },
];

/** Retrouver un impact d'équipement par sa clé */
export function getEquipmentImpactByKey(key: string): EquipmentImpact | undefined {
  return EQUIPMENT_IMPACTS.find((e) => e.key === key);
}
