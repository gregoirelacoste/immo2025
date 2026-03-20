/** Converts a string to a URL-safe slug (lowercase, no accents, hyphens). */
export function slugify(text: string, maxLength?: number): string {
  let slug = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (maxLength) slug = slug.slice(0, maxLength);
  return slug;
}

/**
 * Extracts the department code from an INSEE code.
 * Mainland: first 2 digits (e.g., 75056 → "75")
 * DOM-TOM: first 3 digits (e.g., 97105 → "971")
 * Corsica: first 2 chars (e.g., "2A004" → "2a")
 */
export function deptFromInsee(code: string): string {
  if (!code) return "";
  if (code.startsWith("97")) return code.slice(0, 3).toLowerCase();
  return code.slice(0, 2).toLowerCase();
}

/**
 * Generates a unique city slug: slugified-name-dept.
 * e.g., "vernouillet-28", "lyon-69", "ajaccio-2a"
 */
export function citySlug(name: string, inseeCode: string): string {
  const dept = deptFromInsee(inseeCode);
  const base = slugify(name);
  return dept ? `${base}-${dept}` : base;
}
