import type { MetadataRoute } from "next";
import { getAllPublishedSlugs } from "@/domains/blog/repository";
import { getAllLocalities } from "@/domains/locality/repository";
import { slugify } from "@/lib/slugify";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://tiili.io";
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
      entries.push({
        url: `${baseUrl}/guide/${slugify(city.name)}`,
        lastModified: city.updated_at || now,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    // Comparatifs villes (top 30 cities, all pairs)
    const topCities = [...cities]
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
      .slice(0, 30);
    for (let i = 0; i < topCities.length; i++) {
      for (let j = i + 1; j < topCities.length; j++) {
        entries.push({
          url: `${baseUrl}/guide/comparatif/${slugify(topCities[i].name)}-vs-${slugify(topCities[j].name)}`,
          changeFrequency: "weekly",
          priority: 0.6,
        });
      }
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
