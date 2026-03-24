"use server";

import { Agency } from "./types";
import { createAgency, getAgenciesByCity } from "./repository";

interface ScrapedAgency {
  name: string;
  address: string;
  phone: string;
  website: string;
  city: string;
  postal_code: string;
}

/**
 * Scrape agencies from Pages Jaunes for a given city.
 * Uses the PJ search API endpoint which returns HTML.
 * Falls back gracefully if scraping fails.
 */
async function scrapePagesJaunes(city: string): Promise<ScrapedAgency[]> {
  const query = encodeURIComponent(`agence immobilière gestion locative ${city}`);
  const url = `https://www.pagesjaunes.fr/annuaire/chercherlespros?quoiqui=${query}&ou=${encodeURIComponent(city)}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`[agency-scraper] PagesJaunes returned ${response.status} for ${city}`);
      return [];
    }

    const html = await response.text();
    return parsePagesJaunesHtml(html, city);
  } catch (e) {
    console.warn(`[agency-scraper] PagesJaunes scrape failed for ${city}:`, e);
    return [];
  }
}

function parsePagesJaunesHtml(html: string, city: string): ScrapedAgency[] {
  const agencies: ScrapedAgency[] = [];

  // Extract business listings from PagesJaunes HTML
  // PJ uses structured data blocks with denomination, address, phone
  const listingRegex =
    /<div[^>]*class="[^"]*bi-denomination[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
  const nameRegex = />([\w\s'&àâäéèêëïîôùûüÿçœæ\-.]+)</i;

  // Try JSON-LD first (PJ sometimes includes it)
  const jsonLdMatch = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const jsonStr = match.replace(/<\/?script[^>]*>/gi, "").trim();
        const data = JSON.parse(jsonStr);
        const items = Array.isArray(data) ? data : data["@graph"] || [data];
        for (const item of items) {
          if (
            item["@type"] === "LocalBusiness" ||
            item["@type"] === "RealEstateAgent"
          ) {
            agencies.push({
              name: item.name || "",
              address: typeof item.address === "string"
                ? item.address
                : item.address?.streetAddress || "",
              phone: item.telephone || "",
              website: item.url || "",
              city: item.address?.addressLocality || city,
              postal_code: item.address?.postalCode || "",
            });
          }
        }
      } catch {
        // Invalid JSON-LD, continue
      }
    }
  }

  // Fallback: regex-based extraction from HTML
  if (agencies.length === 0) {
    // Look for listing blocks
    const blockRegex =
      /<article[^>]*class="[^"]*pj-bloc[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
    let blockMatch;
    while ((blockMatch = blockRegex.exec(html)) !== null && agencies.length < 20) {
      const block = blockMatch[1];
      const nameMatch = block.match(
        /class="[^"]*denomination[^"]*"[^>]*>[\s]*<(?:a|span)[^>]*>([^<]+)</i
      );
      const phoneMatch = block.match(
        /(?:tel:|href="tel:)([0-9\s.+()-]+)/i
      );
      const addressMatch = block.match(
        /class="[^"]*adresse[^"]*"[^>]*>([^<]+)/i
      );

      if (nameMatch) {
        agencies.push({
          name: nameMatch[1].trim(),
          address: addressMatch ? addressMatch[1].trim() : "",
          phone: phoneMatch ? phoneMatch[1].trim().replace(/\s+/g, " ") : "",
          website: "",
          city,
          postal_code: "",
        });
      }
    }
  }

  return agencies;
}

/**
 * Scrape agencies for a city and save them to DB.
 * Deduplicates by name (case-insensitive).
 * Returns number of new agencies added.
 */
export async function scrapeAgenciesForCity(
  city: string,
  userId: string
): Promise<{ added: number; total: number; error?: string }> {
  try {
    // Get existing agencies to deduplicate
    const existing = await getAgenciesByCity(city);
    const existingNames = new Set(
      existing.map((a) => a.name.toLowerCase().trim())
    );

    // Scrape from Pages Jaunes
    const scraped = await scrapePagesJaunes(city);

    let added = 0;
    for (const item of scraped) {
      const normalizedName = item.name.toLowerCase().trim();
      if (!normalizedName || existingNames.has(normalizedName)) continue;

      const agency: Agency = {
        id: crypto.randomUUID(),
        user_id: userId,
        name: item.name,
        city: item.city || city,
        postal_code: item.postal_code,
        address: item.address,
        phone: item.phone,
        email: "",
        website: item.website,
        management_fee_rate: 7, // Default 7%
        source: "pagesjaunes",
        google_rating: null,
        google_reviews_count: null,
        description: "",
        image_url: "",
        created_at: "",
        updated_at: "",
      };

      await createAgency(agency);
      existingNames.add(normalizedName);
      added++;
    }

    return { added, total: existing.length + added };
  } catch (e) {
    return {
      added: 0,
      total: 0,
      error: e instanceof Error ? e.message : "Erreur de scraping",
    };
  }
}
