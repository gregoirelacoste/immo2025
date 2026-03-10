import { FieldSelector, ScrapedPropertyData, ScrapeResult } from "@/types/scraping";
import {
  getManifestByHostname,
  upsertManifest,
  incrementManifestSuccess,
  incrementManifestFailure,
} from "@/lib/db";
import { fetchPage, extractJsonLd, parseJsonLdProperty, extractImages } from "./fetcher";
import { directScrape } from "./direct-scraper";
import { generateWithAi } from "./ai-generator";
import { quickValidate, validateWithAi } from "./ai-validator";
import { FAILURE_THRESHOLD, MAX_AI_RETRIES } from "./constants";

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

/** Fusionne les données, en priorité aux données de `base` */
function mergeScrapedData(
  base: ScrapedPropertyData,
  extra: ScrapedPropertyData
): ScrapedPropertyData {
  return {
    purchase_price: base.purchase_price ?? extra.purchase_price,
    surface: base.surface ?? extra.surface,
    city: base.city ?? extra.city,
    postal_code: base.postal_code ?? extra.postal_code,
    address: base.address ?? extra.address,
    description: base.description ?? extra.description,
    property_type: base.property_type ?? extra.property_type,
    image_urls: base.image_urls ?? extra.image_urls,
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

/**
 * Pipeline multi-round IA :
 *   Round 1 — IA génère sélecteurs + extrait les valeurs
 *   Round 2 — Cheerio parse la page avec les sélecteurs
 *   Round 3 — Contextualisation : fusion AI-extracted + Cheerio-extracted + JSON-LD
 *   Round 4 — Validation locale (quickValidate) puis IA (validateWithAi)
 *   Round 5 — Si invalide → retry avec prompt enrichi (max MAX_AI_RETRIES)
 */
async function aiPipeline(
  html: string,
  hostname: string,
  url: string,
  jsonLdData: ScrapedPropertyData | null
): Promise<ScrapeResult> {
  const errors: string[] = [];
  let lastData: ScrapedPropertyData | null = null;
  let validatedSelectors: Record<string, FieldSelector> | null = null;

  for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt++) {
    try {
      // ── Round 1 : IA génère sélecteurs + extrait valeurs ──
      const aiResult = await generateWithAi(html, errors);

      // ── Round 2 : Cheerio parse avec les sélecteurs ──
      const { data: cheerioData } = directScrape(html, aiResult.selectors);

      // ── Round 3 : Contextualisation — fusionner toutes les sources ──
      // Priorité : Cheerio (le plus fiable) > AI-extracted > JSON-LD
      let merged: ScrapedPropertyData = aiResult.extractedValues;
      if (cheerioData) {
        merged = mergeScrapedData(cheerioData, merged);
      }
      if (jsonLdData) {
        merged = mergeScrapedData(merged, jsonLdData);
      }
      lastData = merged;

      // Vérifier qu'on a au moins prix + surface
      if (merged.purchase_price == null || merged.surface == null) {
        errors.push(
          `Champs requis manquants — prix=${merged.purchase_price ?? "manquant"}, surface=${merged.surface ?? "manquante"}`
        );
        continue;
      }

      // ── Round 4 : Validation ──
      // 4a. Validation locale rapide
      const quickErrors = quickValidate(merged);
      if (quickErrors.length > 0) {
        errors.push(quickErrors.join(" ; "));
        continue;
      }

      // 4b. Validation IA
      const validation = await validateWithAi(merged);
      if (!validation.valid) {
        errors.push(`IA invalide — ${validation.errors.join(" ; ")}`);
        continue;
      }

      // ── Succès → sauvegarder le manifest validé ──
      validatedSelectors = aiResult.selectors;
    } catch (e) {
      // Erreur AI (API, JSON invalide…) → retry
      errors.push(`Erreur : ${(e as Error).message}`);
      continue;
    }

    // On sort de la boucle seulement en cas de succès validé
    break;
  }

  // Sauvegarder le manifest uniquement si validé
  if (validatedSelectors) {
    await upsertManifest({
      site_hostname: hostname,
      page_pattern: "*",
      selectors: JSON.stringify(validatedSelectors),
      sample_url: url,
    });

    return {
      success: true,
      data: lastData!,
      source_url: url,
      method: "ai",
    };
  }

  // Toutes les tentatives ont échoué
  if (errors.length > 0) {
    console.warn(`[scraping] aiPipeline échoué pour ${hostname} après ${MAX_AI_RETRIES} tentatives:`, errors);
  }
  // Retourner les dernières données même si la validation a échoué
  if (lastData && (lastData.purchase_price != null || lastData.surface != null)) {
    return {
      success: true,
      data: lastData,
      source_url: url,
      method: "ai",
      error: `Données extraites après ${MAX_AI_RETRIES} tentatives, vérifiez les valeurs.`,
    };
  }

  return {
    success: false,
    data: null,
    source_url: url,
    method: "manual",
    error:
      "Impossible d'extraire les informations après plusieurs tentatives. Saisissez les données manuellement.",
  };
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

  // 3b. Extraire les images (og:image + JSON-LD)
  const imageUrls = extractImages(html, jsonLdBlocks, url);

  // Helper: injecter les images dans les données
  function withImages(data: ScrapedPropertyData): ScrapedPropertyData {
    return { ...data, image_urls: imageUrls.length > 0 ? imageUrls : data.image_urls };
  }

  // Si JSON-LD a tout ce qu'il faut (prix + surface), on retourne directement
  if (jsonLdData?.purchase_price && jsonLdData?.surface) {
    return {
      success: true,
      data: withImages(jsonLdData),
      source_url: url,
      method: "jsonld",
    };
  }

  // 4. Chercher un manifest existant
  const manifest = await getManifestByHostname(hostname);

  if (manifest && manifest.failure_count < FAILURE_THRESHOLD) {
    const selectors = parseManifestSelectors(manifest.selectors);
    if (selectors) {
      const { data, allRequiredFound } = directScrape(html, selectors);

      if (allRequiredFound && data) {
        // Validation rapide des données du manifest
        const quickErrors = quickValidate(data);
        if (quickErrors.length === 0) {
          await incrementManifestSuccess(manifest.id);
          const merged = jsonLdData ? mergeScrapedData(data, jsonLdData) : data;
          return {
            success: true,
            data: withImages(merged),
            source_url: url,
            method: "manifest",
          };
        }
      }

      await incrementManifestFailure(manifest.id);
    }
  }

  // 5. Pipeline multi-round IA
  try {
    const result = await aiPipeline(html, hostname, url, jsonLdData);
    if (result.data) {
      result.data = withImages(result.data);
    }
    return result;
  } catch (e) {
    // Même en cas d'erreur IA, retourner les données JSON-LD partielles si dispo
    if (jsonLdData) {
      return {
        success: true,
        data: withImages(jsonLdData),
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
