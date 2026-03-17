import type { MetadataRoute } from "next";
import { getAllPublishedSlugs } from "@/domains/blog/repository";
import { getAllLocalities } from "@/domains/locality/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tiili.fr";
  const now = new Date().toISOString();

  const entries: MetadataRoute.Sitemap = [
    // Pages statiques
    { url: `${baseUrl}/guide`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  // Guides villes (une page par ville en base)
  try {
    const localities = await getAllLocalities();
    const cities = localities.filter((l) => l.type === "ville");
    for (const city of cities) {
      const slug = city.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      entries.push({
        url: `${baseUrl}/guide/${slug}`,
        lastModified: city.updated_at || now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch { /* DB not ready */ }

  // Articles blog
  try {
    const slugs = await getAllPublishedSlugs();
    for (const slug of slugs) {
      entries.push({
        url: `${baseUrl}/blog/${slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch { /* DB not ready */ }

  return entries;
}
