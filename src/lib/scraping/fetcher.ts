import { USER_AGENT, FETCH_TIMEOUT_MS } from "./constants";

/** Fetch le HTML d'une URL avec timeout et User-Agent réaliste */
export async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
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
        // Gérer les JSON-LD avec @graph wrapper
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

    // Chercher RealEstateListing, Product, Residence, Apartment, House, SingleFamilyResidence
    if (
      !/(realestate|product|residence|apartment|house|offer|listing|singlefamily)/i.test(
        type
      )
    ) {
      continue;
    }

    const result: Record<string, unknown> = {};

    // Prix — chercher dans offers ou directement sur le bloc
    const offers = block.offers as Record<string, unknown> | undefined;
    const price =
      offers?.price ?? offers?.lowPrice ?? block.price ?? block.value;
    if (price != null) {
      result.purchase_price =
        typeof price === "number"
          ? price
          : parseInt(String(price).replace(/\D/g, ""), 10) || undefined;
    }

    // Surface — chercher floorSize ou numberOfRooms comme fallback
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

    // On a trouvé au moins un prix ou une surface
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
