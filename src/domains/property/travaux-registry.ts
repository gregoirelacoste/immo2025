/**
 * Registre des postes de travaux avec coûts de référence.
 * Chaque poste a un coût qui dépend de la surface ou est un forfait fixe.
 */

export interface TravauxPoste {
  key: string;
  label: string;
  category: "structure" | "installations" | "pieces" | "exterieur";
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
  /** Coefficient de retour sur investissement à la revente (0-1). Ex: 0.70 = 70% du coût valorisé */
  valorisationCoefficient?: number;
}

/** Facteur de coût selon le rating (1-5 étoiles) */
export const RATING_FACTORS: Record<number, number> = {
  5: 0,    // Neuf : 0%
  4: 0,    // Bon : 0%
  3: 0.3,  // Correct : 30%
  2: 0.6,  // Usé : 60%
  1: 1.0,  // Vétuste : 100%
};

/**
 * Facteur "remise à niveau" : coût pour amener de l'état actuel à 3★ (correct).
 * Sert d'argument de négociation du prix d'achat.
 */
export const REMISE_A_NIVEAU_FACTORS: Record<number, number> = {
  5: 0,    // Neuf → rien à faire
  4: 0,    // Bon → rien à faire
  3: 0,    // Correct → déjà au seuil
  2: 0.3,  // Usé → 30% pour atteindre "correct"
  1: 0.7,  // Vétuste → 70% pour atteindre "correct"
};

/**
 * Facteur "valorisation" : coût pour passer de 3★ à 5★.
 * Augmente la valeur de revente du bien.
 */
export const VALORISATION_FACTORS: Record<number, number> = {
  5: 0,    // Neuf → rien au-delà
  4: 0,    // Bon → rien au-delà
  3: 0.3,  // Correct → 30% pour passer à neuf
  2: 0.3,  // Usé → 30% (la part "valorisation" est la même)
  1: 0.3,  // Vétuste → 30% (idem)
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
  // Sources coefficients : Notaires de France (Valeur Verte 2024), Sonergia, CES de France
  // ROI cuisine/SDB : 70-100% | isolation/fenêtres : 60-90% | électricité/plomberie : ~30%
  { key: "reno_floors", label: "Sols", category: "structure", referenceCostPerUnit: 45, costMode: "per_m2", hint: "Parquet, carrelage, vinyle — vérifier l'état et l'usure", valorisationCoefficient: 0.40 },
  { key: "reno_walls", label: "Murs", category: "structure", referenceCostPerUnit: 30, costMode: "per_m2", hint: "Peinture, enduit, papier peint — traces d'humidité ?", valorisationCoefficient: 0.40 },
  { key: "reno_ceilings", label: "Plafonds", category: "structure", referenceCostPerUnit: 25, costMode: "per_m2", hint: "Fissures, traces d'infiltration, peinture", valorisationCoefficient: 0.30 },
  { key: "reno_doors", label: "Portes intérieures", category: "structure", referenceCostPerUnit: 350, costMode: "per_unit", defaultUnitCount: 5, hint: "État des portes, poignées, fermetures", valorisationCoefficient: 0.30 },
  { key: "reno_windows", label: "Fenêtres", category: "structure", referenceCostPerUnit: 700, costMode: "per_unit", defaultUnitCount: 4, hint: "Joints, condensation entre vitres, fermetures — impact DPE", valorisationCoefficient: 0.75 },
  { key: "reno_shutters", label: "Volets / stores", category: "structure", referenceCostPerUnit: 400, costMode: "per_unit", defaultUnitCount: 4, hint: "Mécanisme, état des lames, motorisation", valorisationCoefficient: 0.40 },
  { key: "reno_insulation", label: "Isolation", category: "structure", referenceCostPerUnit: 80, costMode: "per_m2", hint: "Murs + combles — vérifier DPE. Jusqu'à 15% de valorisation", valorisationCoefficient: 0.75 },

  // ── Installations ──
  { key: "reno_electrical", label: "Électricité", category: "installations", referenceCostPerUnit: 80, costMode: "per_m2", hint: "Mise aux normes, tableau, prises — invisible mais nécessaire", valorisationCoefficient: 0.30 },
  { key: "reno_plumbing", label: "Plomberie", category: "installations", referenceCostPerUnit: 60, costMode: "per_m2", hint: "Canalisations, robinetterie, pression — invisible mais nécessaire", valorisationCoefficient: 0.30 },
  { key: "reno_heating", label: "Chauffage", category: "installations", referenceCostPerUnit: 5000, costMode: "forfait", hint: "PAC, chaudière — fort impact DPE et confort", valorisationCoefficient: 0.65 },
  { key: "reno_vmc", label: "VMC", category: "installations", referenceCostPerUnit: 2500, costMode: "forfait", hint: "Ventilation, aération, buées", valorisationCoefficient: 0.40 },
  { key: "reno_aircon", label: "Climatisation", category: "installations", referenceCostPerUnit: 3500, costMode: "forfait", hint: "Système de clim réversible — confort d'été", valorisationCoefficient: 0.50 },

  // ── Pièces ──
  { key: "reno_kitchen", label: "Cuisine", category: "pieces", referenceCostPerUnit: 6000, costMode: "forfait", hint: "Meubles, plan de travail, électroménager — ROI 70-100%", valorisationCoefficient: 0.80 },
  { key: "reno_bathroom", label: "Salle de bain", category: "pieces", referenceCostPerUnit: 5000, costMode: "forfait", hint: "Sanitaires, carrelage, robinetterie — ROI 75-100%", valorisationCoefficient: 0.80 },
  { key: "reno_wc", label: "WC", category: "pieces", referenceCostPerUnit: 1500, costMode: "forfait", hint: "Cuvette, mécanisme, carrelage", valorisationCoefficient: 0.40 },

  // ── Extérieur (maison) ──
  { key: "reno_roof", label: "Toiture", category: "exterieur", referenceCostPerUnit: 120, costMode: "per_m2_half", hint: "Tuiles, étanchéité, charpente — jusqu'à 75% de ROI", valorisationCoefficient: 0.70 },
  { key: "reno_facade", label: "Façade", category: "exterieur", referenceCostPerUnit: 50, costMode: "per_m2_x1_5", hint: "Ravalement, fissures, isolation extérieure", valorisationCoefficient: 0.55 },
];

export const TRAVAUX_CATEGORIES: { key: TravauxPoste["category"]; label: string }[] = [
  { key: "structure", label: "Structure" },
  { key: "installations", label: "Installations" },
  { key: "pieces", label: "Pièces" },
  { key: "exterieur", label: "Extérieur (maison)" },
];

/** Retrouver un poste par sa clé */
export function getPosteByKey(key: string): TravauxPoste | undefined {
  return TRAVAUX_POSTES.find((p) => p.key === key);
}
