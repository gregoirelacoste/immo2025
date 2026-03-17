/**
 * Calcul du budget travaux total et de l'entretien mensuel
 * à partir des ratings et des coûts de référence.
 */

import { TRAVAUX_POSTES, RATING_FACTORS, type TravauxPoste } from "./travaux-registry";

export interface TravauxItemResult {
  key: string;
  label: string;
  category: TravauxPoste["category"];
  rating: number | null;
  /** Coût total de référence (si remplacement complet) */
  referenceCost: number;
  /** Coût estimé selon le rating (après facteur) */
  estimatedCost: number;
  /** Override manuel éventuel */
  overrideCost: number | null;
  /** Coût final (override ou estimé) */
  finalCost: number;
  /** Pour entretien : provision mensuelle */
  monthlyProvision: number;
  isRecurrent: boolean;
}

export interface TravauxSummary {
  /** Somme des coûts de rénovation (postes non-récurrents) */
  totalRenovationCost: number;
  /** Provision entretien mensuelle (postes récurrents) */
  monthlyMaintenanceCost: number;
  /** Détail par poste */
  items: TravauxItemResult[];
}

/** Parse le JSON des ratings — accepte un objet { key: number } */
export function parseTravauxRatings(json: string): Record<string, number> {
  try {
    const obj = JSON.parse(json || "{}");
    if (typeof obj !== "object" || obj === null) return {};
    return obj;
  } catch {
    return {};
  }
}

/** Parse le JSON des overrides — accepte un objet { key: number } */
export function parseTravauxOverrides(json: string): Record<string, number> {
  try {
    const obj = JSON.parse(json || "{}");
    if (typeof obj !== "object" || obj === null) return {};
    return obj;
  } catch {
    return {};
  }
}

/**
 * Calcule le coût de référence d'un poste (si remplacement total).
 */
function computeReferenceCost(poste: TravauxPoste, surface: number): number {
  switch (poste.costMode) {
    case "per_m2":
      return poste.referenceCostPerUnit * surface;
    case "per_m2_half":
      return poste.referenceCostPerUnit * (surface / 2);
    case "per_m2_x1_5":
      return poste.referenceCostPerUnit * (surface * 1.5);
    case "per_unit":
      return poste.referenceCostPerUnit * (poste.defaultUnitCount ?? 1);
    case "forfait":
      return poste.referenceCostPerUnit;
    default:
      return poste.referenceCostPerUnit;
  }
}

/**
 * Calcule le résumé travaux complet pour un bien.
 */
export function calculateTravaux(
  surface: number,
  ratingsJson: string,
  overridesJson: string
): TravauxSummary {
  const ratings = parseTravauxRatings(ratingsJson);
  const overrides = parseTravauxOverrides(overridesJson);

  let totalRenovationCost = 0;
  let monthlyMaintenanceCost = 0;
  const items: TravauxItemResult[] = [];

  for (const poste of TRAVAUX_POSTES) {
    const rating = ratings[poste.key] ?? null;
    const referenceCost = computeReferenceCost(poste, surface);
    const factor = rating !== null ? (RATING_FACTORS[rating] ?? 0) : 0;
    const estimatedCost = Math.round(referenceCost * factor);
    const overrideCost = overrides[poste.key] ?? null;
    const finalCost = overrideCost !== null ? overrideCost : estimatedCost;

    let monthlyProvision = 0;
    if (poste.isRecurrent && poste.lifespanYears && rating !== null && rating <= 3) {
      // Provision mensuelle = coût / (durée de vie × 12)
      const provisionBase = overrideCost !== null ? overrideCost : referenceCost;
      monthlyProvision = Math.round(provisionBase / (poste.lifespanYears * 12));
    }

    items.push({
      key: poste.key,
      label: poste.label,
      category: poste.category,
      rating,
      referenceCost: Math.round(referenceCost),
      estimatedCost,
      overrideCost,
      finalCost,
      monthlyProvision,
      isRecurrent: !!poste.isRecurrent,
    });

    if (poste.isRecurrent) {
      monthlyMaintenanceCost += monthlyProvision;
    } else {
      totalRenovationCost += finalCost;
    }
  }

  return { totalRenovationCost, monthlyMaintenanceCost, items };
}
