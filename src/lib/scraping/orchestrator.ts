import { FieldSelector, ScrapedPropertyData, ScrapeResult } from "@/types/scraping";
import {
  getManifestByHostname,
  upsertManifest,
  incrementManifestSuccess,
  incrementManifestFailure,
} from "@/lib/db";
import { fetchPage, extractJsonLd, parseJsonLdProperty } from "./fetcher";
import { directScrape } from "./direct-scraper";
import { generateSelectorsWithAi } from "./ai-generator";
import { FAILURE_THRESHOLD } from "./constants";

/** Valide qu'une URL est bien HTTP(S) et pas locale/privée */
function validateUrl(url: string): URL {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Seules les URLs HTTP/HTTPS sont supportées");
  }
  const h = parsed.hostname;
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "[::1]" ||
    h.startsWith("192.168.") ||
    h.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  ) {
    throw new Error("URLs locales non autorisées");
  }
  return parsed;
}

/** Fusionne les données JSON-LD avec les données scrapées, en priorité aux données existantes */
function mergeScrapedData(
  base: ScrapedPropertyData,
  extra: ScrapedPropertyData
): ScrapedPropertyData {
  return {
    purchase_price: base.purchase_price ?? extra.purchase_price,
    surface: base.surface ?? extra.surface,
    city: base.city ?? extra.city,
    address: base.address ?? extra.address,
    description: base.description ?? extra.description,
    property_type: base.property_type ?? extra.property_type,
  };
}

/** Parse les selectors depuis la colonne JSON text de SQLite */
function parseManifestSelectors(
  raw: unknown
): Record<string, FieldSelector> | null {
  try {
    if (typeof raw === "string") return JSON.parse(raw);
    if (typeof raw === "object" && raw !== null)
      return raw as Record<string, FieldSelector>;
    return null;
  } catch {
    return null;
  }
}

/** Point d'entrée principal du scraping */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  // 1. Valider l'URL
  let parsed: URL;
  try {
    parsed = validateUrl(url);
  } catch (e) {
    return {
      success: false,
      data: null,
      source_url: url,
      method: "manual",
      error: (e as Error).message,
    };
  }

  const hostname = parsed.hostname;

  // 2. Fetch la page
  let html: string;
  try {
    html = await fetchPage(url);
  } catch (e) {
    return {
      success: false,
      data: null,
      source_url: url,
      method: "manual",
      error: `Impossible de charger la page : ${(e as Error).message}`,
    };
  }

  // 3. Tenter extraction JSON-LD (gratuit, stable)
  let jsonLdData: ScrapedPropertyData | null = null;
  const jsonLdBlocks = extractJsonLd(html);
  if (jsonLdBlocks.length > 0) {
    jsonLdData = parseJsonLdProperty(jsonLdBlocks);
  }

  // Si JSON-LD a tout ce qu'il faut (prix + surface), on retourne directement
  if (jsonLdData?.purchase_price && jsonLdData?.surface) {
    return {
      success: true,
      data: jsonLdData,
      source_url: url,
      method: "jsonld",
    };
  }

  // 4. Chercher un manifest existant
  const manifest = getManifestByHostname(hostname);

  if (manifest && manifest.failure_count < FAILURE_THRESHOLD) {
    const selectors = parseManifestSelectors(manifest.selectors);
    if (selectors) {
      const { data, allRequiredFound } = directScrape(html, selectors);

      if (allRequiredFound && data) {
        incrementManifestSuccess(manifest.id);
        // Enrichir avec JSON-LD si on avait des données partielles
        const merged = jsonLdData ? mergeScrapedData(data, jsonLdData) : data;
        return {
          success: true,
          data: merged,
          source_url: url,
          method: "manifest",
        };
      }

      incrementManifestFailure(manifest.id);
    }
  }

  // 5. Générer/régénérer via IA
  try {
    const selectors = await generateSelectorsWithAi(html);

    // Sauvegarder le manifest
    upsertManifest({
      site_hostname: hostname,
      page_pattern: "*",
      selectors: JSON.stringify(selectors),
      sample_url: url,
    });

    // Appliquer les nouveaux sélecteurs
    const { data } = directScrape(html, selectors);

    if (data) {
      const merged = jsonLdData ? mergeScrapedData(data, jsonLdData) : data;
      return {
        success: true,
        data: merged,
        source_url: url,
        method: "ai",
      };
    }

    // L'IA a généré des sélecteurs mais ils ne marchent pas
    // Tenter de retourner les données JSON-LD partielles quand même
    if (jsonLdData) {
      return {
        success: true,
        data: jsonLdData,
        source_url: url,
        method: "jsonld",
      };
    }

    return {
      success: false,
      data: null,
      source_url: url,
      method: "manual",
      error:
        "Impossible d'extraire les informations. Saisissez les données manuellement.",
    };
  } catch (e) {
    // Même en cas d'erreur IA, retourner les données JSON-LD partielles si dispo
    if (jsonLdData) {
      return {
        success: true,
        data: jsonLdData,
        source_url: url,
        method: "jsonld",
      };
    }

    return {
      success: false,
      data: null,
      source_url: url,
      method: "manual",
      error: `Erreur IA : ${(e as Error).message}. Saisissez les données manuellement.`,
    };
  }
}
