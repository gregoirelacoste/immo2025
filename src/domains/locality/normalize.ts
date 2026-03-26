/**
 * Normalize neighborhood (quartier) names for consistent matching.
 * Handles accents, casing, extra whitespace, common abbreviations,
 * and French prefixes like "Le ", "La ", "Les ", "L'".
 */

/** Remove diacritics (accents) from a string */
function removeDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalize a neighborhood name for **storage and display**.
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Title-cases each word (first letter uppercase, rest lowercase)
 * - Preserves accents and articles
 *
 * Example: "  saint cyprien  " → "Saint Cyprien"
 *          "centre HISTORIQUE" → "Centre Historique"
 *          "l'île" → "L'Île"
 */
export function normalizeNeighborhoodName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  return trimmed
    .split(/(\s+|[-'])/)
    .map((part, i, arr) => {
      // Keep separators as-is
      if (/^[\s\-']$/.test(part)) return part;
      if (!part) return part;
      // Title case: first letter uppercase, rest lowercase
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}

/**
 * Build a matching key for fuzzy comparison.
 * - Lowercase
 * - Remove accents
 * - Collapse whitespace
 * - Strip common French articles: "le ", "la ", "les ", "l'"
 * - Strip "saint"/"sainte" → "st"/"ste" (and vice versa) for consistent matching
 *
 * Two neighborhoods match if their keys are equal.
 *
 * Example: "Saint-Cyprien" → "st cyprien"
 *          "saint cyprien" → "st cyprien"
 *          "L'Île-Saint-Louis" → "ile st louis"
 */
export function neighborhoodMatchKey(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = removeDiacritics(s);

  // Normalize separators: hyphens → spaces
  s = s.replace(/[-']/g, " ");
  // Collapse multiple spaces
  s = s.replace(/\s+/g, " ").trim();

  // Strip leading articles
  s = s.replace(/^(le|la|les|l)\s+/i, "");

  // Normalize saint/sainte abbreviations
  s = s.replace(/\bsainte?\b/g, "st");
  s = s.replace(/\bste?\b/g, "st");

  return s.trim();
}
