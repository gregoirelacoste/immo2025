import { randomUserAgent, FETCH_TIMEOUT_MS, FETCH_RETRY_COUNT, FETCH_RETRY_DELAY_MS } from "./constants";

/** Fetch le HTML d'une URL avec headers réalistes, retry sur 403 */
export async function fetchPage(url: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= FETCH_RETRY_COUNT; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, FETCH_RETRY_DELAY_MS * attempt));
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": randomUserAgent(),
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
          "Accept-Encoding": "gzip, deflate, br",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        // Retry on 403/429, fail immediately on other errors
        if (response.status === 403 || response.status === 429) continue;
        throw lastError;
      }

      return await response.text();
    } catch (e) {
      lastError = e as Error;
      // Only retry on 403/429, not on network errors or timeouts
      if (lastError.message.includes("403") || lastError.message.includes("429")) continue;
      throw lastError;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error("Fetch failed");
}

/** Extrait les blocs JSON-LD d'un HTML, y compris les @graph imbriqués */
export function extractJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else if (parsed["@graph"] && Array.isArray(parsed["@graph"])) {
        results.push(...parsed["@graph"]);
      } else {
        results.push(parsed);
      }
    } catch {
      // JSON invalide, on skip
    }
  }

  return results;
}

/** Extrait les URLs d'images depuis og:image et JSON-LD */
export function extractImages(
  html: string,
  jsonLdBlocks: Record<string, unknown>[],
  baseUrl: string
): string[] {
  const images: string[] = [];
  const seen = new Set<string>();

  function addImage(url: string | undefined | null) {
    if (!url || typeof url !== "string") return;
    try {
      const absolute = new URL(url, baseUrl).href;
      if (!seen.has(absolute) && /^https?:/.test(absolute)) {
        seen.add(absolute);
        images.push(absolute);
      }
    } catch {
      // URL invalide
    }
  }

  // 1. Meta image tags (og:image, og:image:secure_url, twitter:image)
  const metaImageProps = ["og:image", "og:image:secure_url", "twitter:image"];
  for (const prop of metaImageProps) {
    const re1 = new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["'][^>]*\\/?>`, "gi");
    const re2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${prop}["'][^>]*\\/?>`, "gi");
    let m;
    while ((m = re1.exec(html)) !== null) addImage(m[1]);
    while ((m = re2.exec(html)) !== null) addImage(m[1]);
  }

  // 2. JSON-LD image fields
  for (const block of jsonLdBlocks) {
    const img = block.image;
    if (typeof img === "string") {
      addImage(img);
    } else if (Array.isArray(img)) {
      for (const item of img) {
        if (typeof item === "string") addImage(item);
        else if (item && typeof item === "object" && (item as Record<string, unknown>).url) {
          addImage(String((item as Record<string, unknown>).url));
        }
      }
    } else if (img && typeof img === "object" && (img as Record<string, unknown>).url) {
      addImage(String((img as Record<string, unknown>).url));
    }

    // Also check photos/photo field
    const photos = block.photo || block.photos;
    if (Array.isArray(photos)) {
      for (const p of photos) {
        if (typeof p === "string") addImage(p);
        else if (p && typeof p === "object" && (p as Record<string, unknown>).contentUrl) {
          addImage(String((p as Record<string, unknown>).contentUrl));
        }
      }
    }
  }

  return images.slice(0, 10);
}

/** Tente d'extraire les données immobilières depuis les JSON-LD */
export function parseJsonLdProperty(
  jsonLdBlocks: Record<string, unknown>[]
): {
  purchase_price?: number;
  surface?: number;
  city?: string;
  address?: string;
  description?: string;
} | null {
  for (const block of jsonLdBlocks) {
    const type = String(block["@type"] || "");

    if (
      !/(realestate|product|residence|apartment|house|offer|listing|singlefamily)/i.test(
        type
      )
    ) {
      continue;
    }

    const result: Record<string, unknown> = {};

    // Prix
    const offers = block.offers as Record<string, unknown> | undefined;
    const price =
      offers?.price ?? offers?.lowPrice ?? block.price ?? block.value;
    if (price != null) {
      result.purchase_price =
        typeof price === "number"
          ? price
          : parseInt(String(price).replace(/\D/g, ""), 10) || undefined;
    }

    // Surface
    const floorSize = block.floorSize as Record<string, unknown> | undefined;
    if (floorSize?.value) {
      result.surface = parseFloat(String(floorSize.value));
    } else if (block.floorSize && typeof block.floorSize === "string") {
      result.surface = parseFloat(String(block.floorSize).replace(/[^\d.]/g, ""));
    }

    // Adresse
    const address = block.address as Record<string, unknown> | undefined;
    if (address) {
      result.city =
        (address.addressLocality as string) ||
        (address.addressRegion as string) ||
        undefined;
      const parts = [
        address.streetAddress,
        address.postalCode,
        address.addressLocality,
      ].filter(Boolean);
      if (parts.length > 0) {
        result.address = parts.join(", ");
      }
    }

    // Description
    if (block.description) {
      result.description = String(block.description).slice(0, 1000);
    }

    if (result.purchase_price || result.surface) {
      return result as {
        purchase_price?: number;
        surface?: number;
        city?: string;
        address?: string;
        description?: string;
      };
    }
  }

  return null;
}
