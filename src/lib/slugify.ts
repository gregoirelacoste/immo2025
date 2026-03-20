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
