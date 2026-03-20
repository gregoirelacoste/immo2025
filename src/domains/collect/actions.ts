"use server";

import { revalidatePath } from "next/cache";
import {
  getOwnerOrAllowOrphan,
  updateCollectFields,
  stripMeta,
  updateProperty,
  updateOrphanProperty,
} from "@/domains/property/repository";
import { scrapeUrl } from "@/domains/scraping/pipeline/orchestrator";
import { extractFromText } from "@/domains/scraping/ai/text-extractor";
import { getMarketData } from "@/domains/market/service";
import {
  mergeTextExtractionIntoPrefill,
  mergePhotoExtractionIntoPrefill,
  mergeRescrapeIntoPrefill,
  parsePrefill,
} from "@/domains/property/prefill";
import { PhotoExtractionResult, PhotoExtractedListing } from "@/domains/collect/types";
import { extractFromPhoto, parseRawListing } from "@/domains/collect/ai/photo-extractor";
import { calculateNotaryFees } from "@/lib/calculations";
import { enrichPropertyQuiet } from "@/domains/enrich/actions";

// ─── Helpers ───

function parseJsonArray(json: string): string[] {
  try {
    const arr = JSON.parse(json || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ─── URL management ───

/**
 * Add a URL to the property's collect_urls list.
 * If it's the first URL, scrape it and update property data.
 * Otherwise, just store it.
 */
export async function addCollectUrl(
  propertyId: string,
  url: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { property, userId } = await getOwnerOrAllowOrphan(propertyId);
    const urls = parseJsonArray(property.collect_urls);

    // Don't add duplicates
    if (urls.includes(url)) {
      return { success: true };
    }

    const isFirst = urls.length === 0;
    urls.push(url);

    // Always update the collect_urls list
    const collectUpdate: { collect_urls: string; source_url?: string } = {
      collect_urls: JSON.stringify(urls),
    };

    // If first URL, set as source_url
    if (isFirst) {
      collectUpdate.source_url = url;
    }

    await updateCollectFields(propertyId, collectUpdate);

    // If first URL, scrape and update property data
    if (isFirst) {
      await scrapeAndUpdateProperty(propertyId, url, property, userId);
    }

    revalidatePath(`/property/${propertyId}`);
    revalidatePath(`/property/${propertyId}/edit`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Remove a URL from collect_urls.
 * If it was the source_url (first/scrape URL), promote the next one and rescrape.
 */
export async function removeCollectUrl(
  propertyId: string,
  index: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { property, userId } = await getOwnerOrAllowOrphan(propertyId);
    const urls = parseJsonArray(property.collect_urls);

    if (index < 0 || index >= urls.length) {
      return { success: false, error: "Index invalide." };
    }

    const removedUrl = urls[index];
    const wasSource = removedUrl === property.source_url;
    urls.splice(index, 1);

    const newSourceUrl = urls.length > 0 ? urls[0] : "";

    await updateCollectFields(propertyId, {
      collect_urls: JSON.stringify(urls),
      source_url: newSourceUrl,
    });

    // If we removed the scrape source and there's a new one, rescrape
    if (wasSource && newSourceUrl) {
      // Reload property after collect update
      const { property: updatedProperty, userId: uid } = await getOwnerOrAllowOrphan(propertyId);
      await scrapeAndUpdateProperty(propertyId, newSourceUrl, updatedProperty, uid);
    }

    revalidatePath(`/property/${propertyId}`);
    revalidatePath(`/property/${propertyId}/edit`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Text management ───

/**
 * Add a text to collect_texts and extract+merge data into property.
 */
export async function addCollectText(
  propertyId: string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { property, userId } = await getOwnerOrAllowOrphan(propertyId);
    const texts = parseJsonArray(property.collect_texts);
    texts.push(text);

    await updateCollectFields(propertyId, {
      collect_texts: JSON.stringify(texts),
    });

    // Extract and merge into property
    const d = await extractFromText(text);

    const newPrice = d.purchase_price ?? property.purchase_price;
    const newSurface = d.surface ?? property.surface;
    const newType = d.property_type ?? property.property_type;
    const newCity = d.city ?? property.city;
    const notary = calculateNotaryFees(newPrice, newType);

    let monthlyRent = property.monthly_rent;
    let propertyTax = property.property_tax;
    let condoCharges = property.condo_charges;
    let prefill = mergeTextExtractionIntoPrefill(
      parsePrefill(property.prefill_sources),
      d
    );

    if (monthlyRent === 0 && newCity && newSurface > 0) {
      try {
        const market = await getMarketData(newCity);
        if (market) {
          const { applyMarketDataToPrefill } = await import("@/domains/property/prefill");
          const applied = applyMarketDataToPrefill(prefill, market, newSurface, newType);
          prefill = applied.prefill;
          monthlyRent = applied.monthlyRent || monthlyRent;
          propertyTax = applied.propertyTax || propertyTax;
          condoCharges = applied.condoCharges || condoCharges;
        }
      } catch { /* pas de données marché */ }
    }

    const baseData = stripMeta(property);
    const updatePayload = {
      ...baseData,
      ...(d.purchase_price != null && { purchase_price: d.purchase_price }),
      ...(d.surface != null && { surface: d.surface }),
      ...(d.city && { city: d.city }),
      ...(d.postal_code && { postal_code: d.postal_code }),
      ...(d.address && { address: d.address }),
      ...(d.description && { description: d.description }),
      ...(d.property_type && { property_type: d.property_type }),
      loan_amount: Math.max(0, newPrice + notary + property.renovation_cost + (property.meuble_status === "meuble" ? (property.furniture_cost || 0) : 0) - property.personal_contribution),
      monthly_rent: monthlyRent,
      property_tax: propertyTax,
      condo_charges: condoCharges,
      prefill_sources: JSON.stringify(prefill),
    };

    if (userId === null) {
      await updateOrphanProperty(propertyId, updatePayload);
    } else {
      await updateProperty(propertyId, userId, updatePayload);
    }

    // Re-enrich
    enrichPropertyQuiet(propertyId).catch(() => {});

    revalidatePath(`/property/${propertyId}`);
    revalidatePath(`/property/${propertyId}/edit`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Remove a text from collect_texts (no un-extraction, just removes from list).
 */
export async function removeCollectText(
  propertyId: string,
  index: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { property } = await getOwnerOrAllowOrphan(propertyId);
    const texts = parseJsonArray(property.collect_texts);

    if (index < 0 || index >= texts.length) {
      return { success: false, error: "Index invalide." };
    }

    texts.splice(index, 1);

    await updateCollectFields(propertyId, {
      collect_texts: JSON.stringify(texts),
    });

    revalidatePath(`/property/${propertyId}`);
    revalidatePath(`/property/${propertyId}/edit`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Photo analysis ───

/**
 * Analyze a photo with Gemini Vision and merge extracted data into property.
 * Returns the extraction result (which may contain multiple listings for vitrines).
 */
export async function analyzeCollectPhoto(
  propertyId: string,
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<{ success: boolean; result?: PhotoExtractionResult; error?: string }> {
  try {
    const { property, userId } = await getOwnerOrAllowOrphan(propertyId);

    const result = await extractFromPhoto(imageBase64, mimeType);

    if (result.listings.length === 0) {
      return { success: true, result };
    }

    // For multi-listing, return results without auto-merging (user picks one)
    if (result.isMultiListing && result.listings.length > 1) {
      return { success: true, result };
    }

    // Single listing — merge directly into property
    const d = result.listings[0];
    await mergePhotoDataIntoProperty(propertyId, d, property, userId);

    revalidatePath(`/property/${propertyId}`);
    revalidatePath(`/property/${propertyId}/edit`);
    return { success: true, result };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Apply a selected listing from a multi-listing photo analysis.
 */
export async function applyPhotoListing(
  propertyId: string,
  listing: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { property, userId } = await getOwnerOrAllowOrphan(propertyId);

    const d = parseRawListing(listing);

    await mergePhotoDataIntoProperty(propertyId, d, property, userId);

    revalidatePath(`/property/${propertyId}`);
    revalidatePath(`/property/${propertyId}/edit`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Internal: merge photo-extracted data into property */
async function mergePhotoDataIntoProperty(
  propertyId: string,
  d: PhotoExtractedListing,
  property: Awaited<ReturnType<typeof getOwnerOrAllowOrphan>>["property"],
  userId: string | null
) {
  const newPrice = d.purchase_price ?? property.purchase_price;
  const newSurface = d.surface ?? property.surface;
  const newType = d.property_type ?? property.property_type;
  const newCity = d.city ?? property.city;
  const notary = calculateNotaryFees(newPrice, newType);

  let monthlyRent = d.monthly_rent ?? property.monthly_rent;
  let propertyTax = property.property_tax;
  let condoCharges = property.condo_charges;
  let prefill = mergePhotoExtractionIntoPrefill(
    parsePrefill(property.prefill_sources),
    d
  );

  if (monthlyRent === 0 && newCity && newSurface > 0) {
    try {
      const market = await getMarketData(newCity);
      if (market) {
        const { applyMarketDataToPrefill } = await import("@/domains/property/prefill");
        const applied = applyMarketDataToPrefill(prefill, market, newSurface, newType);
        prefill = applied.prefill;
        monthlyRent = applied.monthlyRent || monthlyRent;
        propertyTax = applied.propertyTax || propertyTax;
        condoCharges = applied.condoCharges || condoCharges;
      }
    } catch { /* no market data */ }
  }

  const baseData = stripMeta(property);
  const updatePayload = {
    ...baseData,
    ...(d.purchase_price != null && { purchase_price: d.purchase_price }),
    ...(d.surface != null && { surface: d.surface }),
    ...(d.city && { city: d.city }),
    ...(d.postal_code && { postal_code: d.postal_code }),
    ...(d.address && { address: d.address }),
    ...(d.description && { description: d.description }),
    ...(d.property_type && { property_type: d.property_type }),
    loan_amount: Math.max(0, newPrice + notary + property.renovation_cost - property.personal_contribution),
    monthly_rent: monthlyRent,
    property_tax: propertyTax,
    condo_charges: condoCharges,
    prefill_sources: JSON.stringify(prefill),
  };

  if (userId === null) {
    await updateOrphanProperty(propertyId, updatePayload);
  } else {
    await updateProperty(propertyId, userId, updatePayload);
  }

  enrichPropertyQuiet(propertyId).catch(() => {});
}

// ─── Internal: scrape URL and merge data into existing property ───

async function scrapeAndUpdateProperty(
  propertyId: string,
  url: string,
  property: Awaited<ReturnType<typeof getOwnerOrAllowOrphan>>["property"],
  userId: string | null
) {
  const result = await scrapeUrl(url);
  if (!result.success || !result.data) return;

  const d = result.data;
  const priceChanged = d.purchase_price != null && d.purchase_price !== property.purchase_price;
  const typeChanged = d.property_type != null && d.property_type !== property.property_type;
  const newNotaryFees =
    (priceChanged || typeChanged) && property.notary_fees === 0 ? 0 : property.notary_fees;

  const existingPrefill = parsePrefill(property.prefill_sources);
  const updatedPrefill = mergeRescrapeIntoPrefill(existingPrefill, d, result.method);

  const baseData = stripMeta(property);
  const updatePayload = {
    ...baseData,
    ...(d.purchase_price != null && { purchase_price: d.purchase_price }),
    ...(d.surface != null && { surface: d.surface }),
    ...(d.city != null && { city: d.city }),
    ...(d.postal_code != null && { postal_code: d.postal_code }),
    ...(d.address != null && { address: d.address }),
    ...(d.description != null && { description: d.description }),
    ...(d.property_type != null && { property_type: d.property_type }),
    source_url: url,
    notary_fees: newNotaryFees,
    image_urls: d.image_urls ? JSON.stringify(d.image_urls) : property.image_urls,
    prefill_sources: JSON.stringify(updatedPrefill),
  };

  if (userId === null) {
    await updateOrphanProperty(propertyId, updatePayload);
  } else {
    await updateProperty(propertyId, userId, updatePayload);
  }

  enrichPropertyQuiet(propertyId).catch(() => {});
}
