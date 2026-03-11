import { ScrapedPropertyData, ScrapeResult } from "@/domains/scraping/types";
import { MarketData } from "@/domains/market/types";
import { PhotoExtractedListing } from "@/domains/collect/types";

type PrefillRecord = Record<string, { source: string; value: number | string }>;

const METHOD_LABELS: Record<string, string> = {
  jsonld: "Scraping (JSON-LD)",
  manifest: "Scraping (manifest)",
  ai: "Scraping (IA)",
  manual: "Saisie manuelle",
};

/** Builds the prefill record from a scrape result */
export function buildPrefillFromScrape(
  data: ScrapedPropertyData,
  method: ScrapeResult["method"]
): PrefillRecord {
  const label = METHOD_LABELS[method] || "Scraping";
  const prefill: PrefillRecord = {};

  if (data.purchase_price && data.purchase_price > 0)
    prefill.purchase_price = { source: label, value: data.purchase_price };
  if (data.surface && data.surface > 0)
    prefill.surface = { source: label, value: data.surface };
  if (data.city) prefill.city = { source: label, value: data.city };
  if (data.address) prefill.address = { source: label, value: data.address };
  if (data.postal_code) prefill.postal_code = { source: label, value: data.postal_code };

  return prefill;
}

/** Adds market data entries to an existing prefill record */
export function applyMarketDataToPrefill(
  prefill: PrefillRecord,
  market: MarketData,
  surface: number,
  propertyType: "ancien" | "neuf"
): { prefill: PrefillRecord; monthlyRent: number; propertyTax: number; condoCharges: number } {
  let monthlyRent = 0;
  let propertyTax = 0;
  let condoCharges = 0;

  if (market.avgRentPerM2) {
    const rentSource =
      market.rentSource === "reference"
        ? "Observatoire des loyers"
        : "Estimation DVF (5.5%)";
    monthlyRent = Math.round(market.avgRentPerM2 * surface);
    prefill.monthly_rent = { source: rentSource, value: monthlyRent };
    propertyTax = Math.round(monthlyRent * 1.5);
    prefill.property_tax = { source: "Estimation (~1.5× loyer)", value: propertyTax };
  }

  if (propertyType === "ancien") {
    condoCharges = Math.round(surface * 2.5);
    prefill.condo_charges = { source: "Estimation (2.5 €/m²)", value: condoCharges };
  }

  return { prefill, monthlyRent, propertyTax, condoCharges };
}

/** Merges existing prefill with new fields from a rescrape */
export function mergeRescrapeIntoPrefill(
  existing: PrefillRecord,
  data: ScrapedPropertyData,
  method: ScrapeResult["method"]
): PrefillRecord {
  const label = `Rescraping (${method})`;
  const merged = { ...existing };

  if (data.purchase_price != null) merged.purchase_price = { source: label, value: data.purchase_price };
  if (data.surface != null) merged.surface = { source: label, value: data.surface };
  if (data.city) merged.city = { source: label, value: data.city };
  if (data.address) merged.address = { source: label, value: data.address };
  if (data.postal_code) merged.postal_code = { source: label, value: data.postal_code };

  return merged;
}

/** Merges existing prefill with fields extracted from pasted text */
export function mergeTextExtractionIntoPrefill(
  existing: PrefillRecord,
  data: ScrapedPropertyData
): PrefillRecord {
  const merged = { ...existing };

  if (data.purchase_price != null) merged.purchase_price = { source: "Collage texte (IA)", value: data.purchase_price };
  if (data.surface != null) merged.surface = { source: "Collage texte (IA)", value: data.surface };
  if (data.city) merged.city = { source: "Collage texte (IA)", value: data.city };
  if (data.address) merged.address = { source: "Collage texte (IA)", value: data.address };
  if (data.postal_code) merged.postal_code = { source: "Collage texte (IA)", value: data.postal_code };

  return merged;
}

/** Merges existing prefill with fields extracted from photo analysis */
export function mergePhotoExtractionIntoPrefill(
  existing: PrefillRecord,
  data: PhotoExtractedListing
): PrefillRecord {
  const merged = { ...existing };

  if (data.purchase_price != null) merged.purchase_price = { source: "Photo (IA Vision)", value: data.purchase_price };
  if (data.surface != null) merged.surface = { source: "Photo (IA Vision)", value: data.surface };
  if (data.city) merged.city = { source: "Photo (IA Vision)", value: data.city };
  if (data.address) merged.address = { source: "Photo (IA Vision)", value: data.address };
  if (data.postal_code) merged.postal_code = { source: "Photo (IA Vision)", value: data.postal_code };
  if (data.monthly_rent != null) merged.monthly_rent = { source: "Photo (IA Vision)", value: data.monthly_rent };

  return merged;
}

export function parsePrefill(json: string): PrefillRecord {
  try { return JSON.parse(json || "{}"); }
  catch { return {}; }
}
