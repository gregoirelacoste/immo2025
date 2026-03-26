/**
 * Normalize neighborhood (quartier) names for consistent matching.
 * Handles accents, casing, extra whitespace, common abbreviations,
 * and French prefixes like "Le ", "La ", "Les ", "L'".
 */

/** Remove diacritics (accents) from a string */
function removeDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** French particles that should stay lowercase (except at the start) */
const LOWERCASE_PARTICLES = new Set([
  "de", "du", "des", "en", "sur", "sous", "aux", "le", "la", "les", "l",
]);

/** French ordinals: "1er", "2e", "3e" etc. — keep lowercase */
const ORDINAL_RE = /^(\d+)(er|e|ème)$/i;

/**
 * Normalize a neighborhood name for **storage and display**.
 * - Trims whitespace
 * - Collapses multiple spaces
 * - Title-cases each word, except French particles (de, du, sur…)
 * - Preserves accents and articles
 * - Handles ordinals ("3e arrondissement" stays lowercase)
 *
 * Example: "  saint cyprien  " → "Saint Cyprien"
 *          "centre HISTORIQUE" → "Centre Historique"
 *          "neuilly-sur-seine" → "Neuilly-sur-Seine"
 *          "3e arrondissement" → "3e Arrondissement"
 */
export function normalizeNeighborhoodName(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  let isFirst = true;
  return trimmed
    .split(/(\s+|[-'])/)
    .map((part) => {
      // Keep separators as-is
      if (/^[\s\-']$/.test(part)) return part;
      if (!part) return part;

      const lower = part.toLowerCase();

      // Ordinals: keep as-is (lowercase)
      if (ORDINAL_RE.test(lower)) return lower;

      // French particles: lowercase unless first word
      if (!isFirst && LOWERCASE_PARTICLES.has(lower)) return lower;

      isFirst = false;
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
 * - Normalize all variants (saint, sainte, st, ste) to "st"
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
  s = s.replace(/^(le|la|les|l)\s+/, "");

  // Normalize saint/sainte/st/ste → "st"
  s = s.replace(/\bsainte?\b|\bste?\b/g, "st");

  return s.trim();
}
