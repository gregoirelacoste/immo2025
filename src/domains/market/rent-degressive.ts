/**
 * Calcul de loyer avec dégressivité par la surface.
 *
 * Le loyer total suit une loi de puissance : L = k × S^α
 * où α ∈ [0.6, 0.8] (défaut 0.72).
 *
 * Le loyer/m² de référence (avg_rent_per_m2) correspond à une surface
 * de référence T2 (~45 m²). Pour une surface différente, on ajuste :
 *
 *   adjustedRentPerM2 = rentPerM2 × (surface / refSurface)^(α - 1)
 *
 * Effet : les petites surfaces ont un loyer/m² plus élevé,
 * les grandes surfaces un loyer/m² plus bas.
 */

/** Exposant α par défaut (marché français, habitation standard) */
export const DEFAULT_RENT_ALPHA = 0.72;

/** Surface de référence T2 en m² */
export const DEFAULT_RENT_REFERENCE_SURFACE = 45;

/**
 * Calcule le loyer/m² ajusté à la surface selon la loi de dégressivité.
 *
 * @param baseRentPerM2 - Loyer moyen au m² de référence (données localité)
 * @param surface - Surface réelle du bien en m²
 * @param alpha - Exposant d'élasticité (0.6–0.8, défaut 0.72)
 * @param referenceSurface - Surface de référence du loyer moyen (défaut 45 m²)
 * @returns Loyer/m² ajusté (arrondi à 2 décimales)
 */
export function adjustRentPerM2(
  baseRentPerM2: number,
  surface: number,
  alpha: number = DEFAULT_RENT_ALPHA,
  referenceSurface: number = DEFAULT_RENT_REFERENCE_SURFACE
): number {
  if (baseRentPerM2 <= 0 || surface <= 0) return baseRentPerM2;

  const ratio = surface / referenceSurface;
  const adjustment = Math.pow(ratio, alpha - 1);
  return Math.round(baseRentPerM2 * adjustment * 100) / 100;
}

/**
 * Calcule le loyer mensuel ajusté à la surface.
 *
 * @returns Loyer mensuel arrondi à l'euro
 */
export function calculateDegressiveRent(
  baseRentPerM2: number,
  surface: number,
  alpha: number = DEFAULT_RENT_ALPHA,
  referenceSurface: number = DEFAULT_RENT_REFERENCE_SURFACE
): number {
  const adjusted = adjustRentPerM2(baseRentPerM2, surface, alpha, referenceSurface);
  return Math.round(adjusted * surface);
}
