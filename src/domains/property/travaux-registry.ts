/**
 * Registre des postes de travaux avec coûts de référence.
 * Chaque poste a un coût qui dépend de la surface ou est un forfait fixe.
 */

export interface TravauxPoste {
  key: string;
  label: string;
  category: "structure" | "installations" | "pieces" | "exterieur" | "entretien";
  /** Coût unitaire de référence (€/m² ou € forfait) */
  referenceCostPerUnit: number;
  /** Comment calculer le coût total de référence */
  costMode: "per_m2" | "per_m2_half" | "per_m2_x1_5" | "per_unit" | "forfait";
  /** Nombre d'unités par défaut (pour per_unit : nb portes, fenêtres…) */
  defaultUnitCount?: number;
  /** Clé property pour le nombre d'unités (futur : property.nb_doors etc.) */
  unitCountField?: string;
  /** Hint affiché dans le détail du poste */
  hint?: string;
  /** Est-ce un poste d'entretien récurrent (vs travaux ponctuels) ? */
  isRecurrent?: boolean;
  /** Durée de vie en années (pour calcul provision mensuelle si entretien) */
  lifespanYears?: number;
}

/** Facteur de coût selon le rating (1-5 étoiles) */
export const RATING_FACTORS: Record<number, number> = {
  5: 0,    // Neuf : 0%
  4: 0,    // Bon : 0%
  3: 0.3,  // Correct : 30%
  2: 0.6,  // Usé : 60%
  1: 1.0,  // Vétuste : 100%
};

export const RATING_LABELS: Record<number, string> = {
  5: "Neuf / refait",
  4: "Bon état",
  3: "Correct",
  2: "Usé",
  1: "Vétuste",
};

export const RATING_COLORS: Record<number, string> = {
  5: "text-green-600",
  4: "text-green-500",
  3: "text-amber-500",
  2: "text-orange-500",
  1: "text-red-500",
};

export const RATING_STAR_COLORS: Record<number, string> = {
  5: "text-green-500",
  4: "text-green-400",
  3: "text-amber-400",
  2: "text-orange-400",
  1: "text-red-400",
};

/**
 * Tous les postes de travaux, ordonnés par catégorie.
 */
export const TRAVAUX_POSTES: TravauxPoste[] = [
  // ── Structure ──
  { key: "reno_floors", label: "Sols", category: "structure", referenceCostPerUnit: 45, costMode: "per_m2", hint: "Parquet, carrelage, vinyle — vérifier l'état et l'usure" },
  { key: "reno_walls", label: "Murs", category: "structure", referenceCostPerUnit: 30, costMode: "per_m2", hint: "Peinture, enduit, papier peint — traces d'humidité ?" },
  { key: "reno_ceilings", label: "Plafonds", category: "structure", referenceCostPerUnit: 25, costMode: "per_m2", hint: "Fissures, traces d'infiltration, peinture" },
  { key: "reno_doors", label: "Portes intérieures", category: "structure", referenceCostPerUnit: 350, costMode: "per_unit", defaultUnitCount: 5, hint: "État des portes, poignées, fermetures" },
  { key: "reno_windows", label: "Fenêtres", category: "structure", referenceCostPerUnit: 700, costMode: "per_unit", defaultUnitCount: 4, hint: "Joints, condensation entre vitres, fermetures" },
  { key: "reno_shutters", label: "Volets / stores", category: "structure", referenceCostPerUnit: 400, costMode: "per_unit", defaultUnitCount: 4, hint: "Mécanisme, état des lames, motorisation" },
  { key: "reno_insulation", label: "Isolation", category: "structure", referenceCostPerUnit: 80, costMode: "per_m2", hint: "Murs + combles — vérifier DPE" },

  // ── Installations ──
  { key: "reno_electrical", label: "Électricité", category: "installations", referenceCostPerUnit: 80, costMode: "per_m2", hint: "Mise aux normes, tableau, prises" },
  { key: "reno_plumbing", label: "Plomberie", category: "installations", referenceCostPerUnit: 60, costMode: "per_m2", hint: "Canalisations, robinetterie, pression" },
  { key: "reno_heating", label: "Chauffage", category: "installations", referenceCostPerUnit: 5000, costMode: "forfait", hint: "Type de chauffage, âge du système" },
  { key: "reno_vmc", label: "VMC", category: "installations", referenceCostPerUnit: 2500, costMode: "forfait", hint: "Ventilation, aération, buées" },
  { key: "reno_aircon", label: "Climatisation", category: "installations", referenceCostPerUnit: 3500, costMode: "forfait", hint: "Système de clim réversible" },

  // ── Pièces ──
  { key: "reno_kitchen", label: "Cuisine", category: "pieces", referenceCostPerUnit: 6000, costMode: "forfait", hint: "Meubles, plan de travail, électroménager" },
  { key: "reno_bathroom", label: "Salle de bain", category: "pieces", referenceCostPerUnit: 5000, costMode: "forfait", hint: "Sanitaires, carrelage, robinetterie" },
  { key: "reno_wc", label: "WC", category: "pieces", referenceCostPerUnit: 1500, costMode: "forfait", hint: "Cuvette, mécanisme, carrelage" },

  // ── Extérieur (maison) ──
  { key: "reno_roof", label: "Toiture", category: "exterieur", referenceCostPerUnit: 120, costMode: "per_m2_half", hint: "Tuiles, étanchéité, charpente" },
  { key: "reno_facade", label: "Façade", category: "exterieur", referenceCostPerUnit: 50, costMode: "per_m2_x1_5", hint: "Ravalement, fissures, isolation extérieure" },

  // ── Entretien récurrent ──
  { key: "wear_appliances", label: "Électroménager", category: "entretien", referenceCostPerUnit: 2000, costMode: "forfait", isRecurrent: true, lifespanYears: 10, hint: "Lave-linge, frigo, four, lave-vaisselle" },
  { key: "wear_furniture", label: "Mobilier (si meublé)", category: "entretien", referenceCostPerUnit: 3000, costMode: "forfait", isRecurrent: true, lifespanYears: 8, hint: "Canapé, lit, table, rangements" },
  { key: "wear_water_heater", label: "Chauffe-eau", category: "entretien", referenceCostPerUnit: 1200, costMode: "forfait", isRecurrent: true, lifespanYears: 12, hint: "Cumulus, ballon d'eau chaude" },
  { key: "wear_boiler", label: "Chaudière / PAC", category: "entretien", referenceCostPerUnit: 4000, costMode: "forfait", isRecurrent: true, lifespanYears: 15, hint: "Chaudière gaz, pompe à chaleur" },
];

export const TRAVAUX_CATEGORIES: { key: TravauxPoste["category"]; label: string }[] = [
  { key: "structure", label: "Structure" },
  { key: "installations", label: "Installations" },
  { key: "pieces", label: "Pièces" },
  { key: "exterieur", label: "Extérieur (maison)" },
  { key: "entretien", label: "Entretien récurrent" },
];

/** Retrouver un poste par sa clé */
export function getPosteByKey(key: string): TravauxPoste | undefined {
  return TRAVAUX_POSTES.find((p) => p.key === key);
}
