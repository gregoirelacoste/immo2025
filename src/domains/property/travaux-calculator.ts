/**
 * Calcul du budget travaux total et de l'entretien mensuel
 * à partir des ratings, targets et des coûts de référence.
 *
 * Le système distingue :
 * - "Remise à niveau" : coût pour amener l'état actuel au seuil 3★ (argument de négociation)
 * - "Valorisation" : coût pour aller au-delà de 3★ (augmente la valeur de revente)
 */

import { TRAVAUX_POSTES, RATING_FACTORS, REMISE_A_NIVEAU_FACTORS, VALORISATION_FACTORS, type TravauxPoste } from "./travaux-registry";

export interface TravauxItemResult {
  key: string;
  label: string;
  category: TravauxPoste["category"];
  rating: number | null;
  /** Objectif cible (≥ rating). null = pas de travaux prévus */
  target: number | null;
  /** Coût total de référence (si remplacement complet) */
  referenceCost: number;
  /** Coût estimé selon le delta rating→target */
  estimatedCost: number;
  /** Override manuel éventuel */
  overrideCost: number | null;
  /** Coût final (override ou estimé) */
  finalCost: number;
  /** Part "remise à niveau" (état actuel → 3★) */
  remiseANiveauCost: number;
  /** Part "valorisation" (3★ → cible) */
  valorisationCost: number;
  /** Coefficient de valorisation effectif (override ou défaut, 0-1) */
  valorisationCoefficient: number;
  /** Pour entretien : provision mensuelle */
  monthlyProvision: number;
  isRecurrent: boolean;
}

export interface TravauxSummary {
  /** Somme des coûts de rénovation (postes non-récurrents) */
  totalRenovationCost: number;
  /** Provision entretien mensuelle (postes récurrents) */
  monthlyMaintenanceCost: number;
  /** Total "remise à niveau" — argument de négociation */
  totalRemiseANiveauCost: number;
  /** Total "valorisation" — augmente la valeur de revente */
  totalValorisationCost: number;
  /** Valeur de revente estimée apportée par les travaux de valorisation */
  valorisationResaleValue: number;
  /** Détail par poste */
  items: TravauxItemResult[];
}

/** Presets de niveau de rénovation globale */
export type TravauxPreset = "none" | "habitable" | "renove" | "premium";

export const TRAVAUX_PRESETS: { key: TravauxPreset; label: string; targetRating: number; description: string }[] = [
  { key: "none", label: "Aucun", targetRating: 0, description: "Pas de travaux prévus" },
  { key: "habitable", label: "Habitable", targetRating: 3, description: "Remise à niveau minimum (3★)" },
  { key: "renove", label: "Rénové", targetRating: 4, description: "Bon état général (4★)" },
  { key: "premium", label: "Premium", targetRating: 5, description: "Tout refait à neuf (5★)" },
];

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

/** Parse le JSON des targets — accepte un objet { key: number } */
export const parseTravauxTargets = parseTravauxRatings;

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
 * Calcule le facteur de coût pour passer d'un rating source à un rating cible.
 * Le coût est proportionnel au delta de facteurs RATING_FACTORS.
 */
function computeDeltaFactor(currentRating: number, targetRating: number): number {
  if (targetRating <= currentRating) return 0;
  const currentFactor = RATING_FACTORS[currentRating] ?? 0;
  const targetFactor = RATING_FACTORS[targetRating] ?? 0;
  // Le facteur représente "combien il reste à faire pour atteindre 5★"
  // Donc le delta = ce qu'on économise en passant de current à target
  return currentFactor - targetFactor;
}

/**
 * Applique un preset global à tous les postes notés.
 * Le preset écrase TOUTES les targets — pas de conservation d'overrides manuels.
 */
export function applyPresetToTargets(
  ratings: Record<string, number>,
  presetTargetRating: number
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const poste of TRAVAUX_POSTES) {
    const currentRating = ratings[poste.key];
    if (currentRating == null) continue; // pas noté = pas de travaux
    if (presetTargetRating > 0 && presetTargetRating > currentRating) {
      result[poste.key] = presetTargetRating;
    }
    // Si preset = "none" (0) ou rating >= preset → pas de target
  }
  return result;
}

/**
 * Calcule le résumé travaux complet pour un bien.
 * Avec targets : le coût = delta entre rating actuel et target.
 * Sans targets (rétrocompatible) : le coût = ancien comportement (rating → 5★).
 */
export function calculateTravaux(
  surface: number,
  ratingsJson: string,
  overridesJson: string,
  targetsJson?: string
): TravauxSummary {
  const ratings = parseTravauxRatings(ratingsJson);
  const overrides = parseTravauxOverrides(overridesJson);
  const targets = targetsJson ? parseTravauxTargets(targetsJson) : null;

  let totalRenovationCost = 0;
  let monthlyMaintenanceCost = 0;
  let totalRemiseANiveauCost = 0;
  let totalValorisationCost = 0;
  let valorisationResaleValue = 0;
  const items: TravauxItemResult[] = [];

  for (const poste of TRAVAUX_POSTES) {
    const rating = ratings[poste.key] ?? null;
    const target = targets ? (targets[poste.key] ?? null) : null;
    const referenceCost = computeReferenceCost(poste, surface);

    // Calcul du coût estimé
    let estimatedCost: number;
    let remiseANiveauCost = 0;
    let valorisationCost = 0;

    if (target !== null && rating !== null && target > rating) {
      // Coût = delta entre rating actuel et target
      const deltaFactor = computeDeltaFactor(rating, target);
      estimatedCost = Math.round(referenceCost * deltaFactor);

      // Split remise à niveau vs valorisation
      // Remise à niveau = de rating actuel jusqu'à min(target, 3)
      const remiseTarget = Math.min(target, 3);
      const remiseFactor = computeDeltaFactor(rating, remiseTarget);
      remiseANiveauCost = Math.round(referenceCost * remiseFactor);

      // Valorisation = de max(rating, 3) jusqu'à target
      valorisationCost = Math.max(0, estimatedCost - remiseANiveauCost);
    } else {
      // Pas de target, ou target ≤ rating → pas de travaux chiffrés
      // Le rating seul sert à documenter l'état, pas à générer un coût
      estimatedCost = 0;
    }

    const overrideCost = overrides[poste.key] ?? null;
    let finalCost: number;
    let finalRemise: number;
    let finalValo: number;

    if (overrideCost !== null) {
      finalCost = overrideCost;
      // Répartir l'override proportionnellement
      const totalSplit = remiseANiveauCost + valorisationCost;
      if (totalSplit > 0) {
        finalRemise = Math.round(overrideCost * (remiseANiveauCost / totalSplit));
        finalValo = overrideCost - finalRemise;
      } else {
        finalRemise = 0;
        finalValo = overrideCost;
      }
    } else {
      finalCost = estimatedCost;
      finalRemise = remiseANiveauCost;
      finalValo = valorisationCost;
    }

    let monthlyProvision = 0;
    if (poste.isRecurrent && poste.lifespanYears && rating !== null && rating <= 3) {
      const provisionBase = overrideCost !== null ? overrideCost : referenceCost;
      monthlyProvision = Math.round(provisionBase / (poste.lifespanYears * 12));
    }

    // Coefficient effectif (override via valo_coeff_<key> ou défaut du registre)
    const effectiveCoeff = overrides[`valo_coeff_${poste.key}`] ?? poste.valorisationCoefficient ?? 0;

    items.push({
      key: poste.key,
      label: poste.label,
      category: poste.category,
      rating,
      target,
      referenceCost: Math.round(referenceCost),
      estimatedCost,
      overrideCost,
      finalCost,
      remiseANiveauCost: finalRemise,
      valorisationCost: finalValo,
      valorisationCoefficient: effectiveCoeff,
      monthlyProvision,
      isRecurrent: !!poste.isRecurrent,
    });

    if (poste.isRecurrent) {
      monthlyMaintenanceCost += monthlyProvision;
    } else {
      totalRenovationCost += finalCost;
      totalRemiseANiveauCost += finalRemise;
      totalValorisationCost += finalValo;

      // Valorisation resale = coût valo × coefficient de retour
      if (finalValo > 0 && effectiveCoeff > 0) {
        valorisationResaleValue += Math.round(finalValo * effectiveCoeff);
      }
    }
  }

  return {
    totalRenovationCost,
    monthlyMaintenanceCost,
    totalRemiseANiveauCost,
    totalValorisationCost,
    valorisationResaleValue,
    items,
  };
}
