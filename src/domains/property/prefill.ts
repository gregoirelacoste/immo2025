import { ScrapedPropertyData, ScrapeResult } from "@/domains/scraping/types";
import { MarketData } from "@/domains/market/types";
import { PhotoExtractedListing } from "@/domains/collect/types";
import { calculateDegressiveRent, adjustRentPerM2 } from "@/domains/market/rent-degressive";

export type Confidence = "estimated" | "declared" | "verified";

type PrefillRecord = Record<string, { source: string; value: number | string; confidence?: Confidence }>;

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
  if (data.neighborhood) prefill.neighborhood = { source: label, value: data.neighborhood };
  if (data.address) prefill.address = { source: label, value: data.address };
  if (data.postal_code) prefill.postal_code = { source: label, value: data.postal_code };
  // Champs locatifs scrapés
  if (data.monthly_rent && data.monthly_rent > 0)
    prefill.monthly_rent = { source: label, value: data.monthly_rent };
  if (data.condo_charges && data.condo_charges > 0)
    prefill.condo_charges = { source: label, value: data.condo_charges };
  if (data.property_tax && data.property_tax > 0)
    prefill.property_tax = { source: label, value: data.property_tax };

  return prefill;
}

/** Adds market data entries to an existing prefill record.
 *  Respects priority: scraped values (already in prefill) > market data estimates.
 */
export function applyMarketDataToPrefill(
  prefill: PrefillRecord,
  market: MarketData,
  surface: number,
  propertyType: "ancien" | "neuf"
): { prefill: PrefillRecord; rentPerM2: number; monthlyRent: number; propertyTax: number; condoCharges: number } {
  let rentPerM2 = 0;
  let monthlyRent = 0;
  let propertyTax = 0;
  let condoCharges = 0;

  if (market.avgRentPerM2) {
    const rentSource =
      market.rentSource === "locality"
        ? "Données locales"
        : market.rentSource === "reference"
          ? "Observatoire des loyers"
          : "Estimation DVF (5.5%)";

    const alpha = market.rentElasticityAlpha ?? undefined;
    const refSurface = market.rentReferenceSurface ?? undefined;

    // Ajuster le loyer/m² à la surface du bien (dégressivité)
    rentPerM2 = adjustRentPerM2(market.avgRentPerM2, surface, alpha, refSurface);
    prefill.rent_per_m2 = { source: `${rentSource} (ajusté surface)`, value: Math.round(rentPerM2 * 100) / 100 };

    // monthly_rent: only fill if not already set by scraping
    if (!prefill.monthly_rent) {
      monthlyRent = calculateDegressiveRent(market.avgRentPerM2, surface, alpha, refSurface);
      prefill.monthly_rent = { source: `Calcul dégressif (${rentSource})`, value: monthlyRent };
    } else {
      monthlyRent = Number(prefill.monthly_rent.value) || 0;
    }

    // property_tax: use real local data if available, otherwise estimate
    if (!prefill.property_tax) {
      if (market.avgPropertyTaxPerM2) {
        propertyTax = Math.round(market.avgPropertyTaxPerM2 * surface / 12);
        prefill.property_tax = { source: "Données locales (taxe foncière)", value: propertyTax };
      } else {
        propertyTax = Math.round(monthlyRent * 1.5);
        prefill.property_tax = { source: "Estimation (~1.5× loyer)", value: propertyTax };
      }
    } else {
      propertyTax = Number(prefill.property_tax.value) || 0;
    }
  }

  // condo_charges: use real local data if available, otherwise estimate
  if (!prefill.condo_charges) {
    if (market.avgCondoChargesPerM2) {
      condoCharges = Math.round(market.avgCondoChargesPerM2 * surface);
      prefill.condo_charges = { source: "Données locales (charges copro)", value: condoCharges };
    } else if (propertyType === "ancien") {
      condoCharges = Math.round(surface * 2.5);
      prefill.condo_charges = { source: "Estimation (2.5 €/m²)", value: condoCharges };
    }
  } else {
    condoCharges = Number(prefill.condo_charges.value) || 0;
  }

  return { prefill, rentPerM2, monthlyRent, propertyTax, condoCharges };
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
  if (data.neighborhood) merged.neighborhood = { source: label, value: data.neighborhood };
  if (data.address) merged.address = { source: label, value: data.address };
  if (data.postal_code) merged.postal_code = { source: label, value: data.postal_code };
  if (data.monthly_rent != null) merged.monthly_rent = { source: label, value: data.monthly_rent };
  if (data.condo_charges != null) merged.condo_charges = { source: label, value: data.condo_charges };
  if (data.property_tax != null) merged.property_tax = { source: label, value: data.property_tax };

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
  if (data.neighborhood) merged.neighborhood = { source: "Collage texte (IA)", value: data.neighborhood };
  if (data.address) merged.address = { source: "Collage texte (IA)", value: data.address };
  if (data.postal_code) merged.postal_code = { source: "Collage texte (IA)", value: data.postal_code };
  if (data.monthly_rent != null) merged.monthly_rent = { source: "Collage texte (IA)", value: data.monthly_rent };
  if (data.condo_charges != null) merged.condo_charges = { source: "Collage texte (IA)", value: data.condo_charges };
  if (data.property_tax != null) merged.property_tax = { source: "Collage texte (IA)", value: data.property_tax };

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
