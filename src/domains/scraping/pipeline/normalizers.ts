/**
 * "250 000 €" → 250000
 * "1.200.000 €" → 1200000
 * "1 200 000,50 €" → 1200000
 *
 * Stratégie : si le texte contient une virgule suivie de 1-2 chiffres à la fin,
 * c'est un séparateur décimal FR. Sinon les points et virgules sont des séparateurs de milliers.
 */
export function normalizePrice(raw: string): number {
  let cleaned = raw.replace(/[^\d.,]/g, "");

  // Détecter si virgule est un séparateur décimal (ex: "250 000,50")
  const hasDecimalComma = /,\d{1,2}$/.test(cleaned);

  if (hasDecimalComma) {
    // Format FR : points = milliers, virgule = décimale
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Pas de décimale : supprimer tous les séparateurs
    cleaned = cleaned.replace(/[.,]/g, "");
  }

  return Math.round(parseFloat(cleaned) || 0);
}

/**
 * "45 m²" → 45
 * "45,5 m2" → 45.5
 * "120.5 m²" → 120.5
 */
export function normalizeSurface(raw: string): number {
  const cleaned = raw
    .replace(/[^\d,.]/g, "")
    .replace(",", ".");
  return parseFloat(cleaned) || 0;
}

/** Applique la transformation selon le type */
export function applyTransform(
  raw: string,
  transform: "number" | "text" | "area" | null
): string | number {
  switch (transform) {
    case "number":
      return normalizePrice(raw);
    case "area":
      return normalizeSurface(raw);
    case "text":
    default:
      return raw.trim();
  }
}
