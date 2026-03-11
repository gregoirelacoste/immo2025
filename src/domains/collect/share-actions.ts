"use server";

import { revalidatePath } from "next/cache";
import { consumeShareData } from "@/domains/collect/share-store";
import { scrapeAndSaveProperty } from "@/domains/scraping/actions";
import { extractFromPhoto } from "@/domains/collect/ai/photo-extractor";
import { extractFromText } from "@/domains/scraping/ai/text-extractor";
import { getOptionalUserId } from "@/lib/auth-actions";
import { createProperty, updateProperty, updateOrphanProperty, updateCollectFields } from "@/domains/property/repository";
import { calculateNotaryFees } from "@/lib/calculations";
import { getMarketData } from "@/domains/market/service";
import { buildPrefillFromScrape, applyMarketDataToPrefill, mergePhotoExtractionIntoPrefill } from "@/domains/property/prefill";
import { enrichPropertyQuiet } from "@/domains/enrich/actions";
import { PhotoExtractedListing } from "@/domains/collect/types";

/**
 * Process shared data: URL scraping, photo analysis, or text extraction.
 * Returns extracted preview data without creating a property yet.
 */
export async function processShareForPreview(
  sessionId: string
): Promise<{
  success: boolean;
  preview?: SharePreviewData;
  error?: string;
}> {
  try {
    const shareData = consumeShareData(sessionId);
    if (!shareData) {
      return { success: false, error: "Session expirée. Veuillez repartager." };
    }

    const preview: SharePreviewData = {
      url: shareData.url,
      source: shareData.source,
      images: shareData.images,
      extractedData: {},
      method: "manual",
    };

    // 1. If URL present, try scraping
    if (shareData.url) {
      try {
        const { scrapeUrl } = await import("@/domains/scraping/pipeline/orchestrator");
        const result = await scrapeUrl(shareData.url);
        if (result.success && result.data) {
          preview.extractedData = { ...result.data };
          preview.method = "scrape";
        }
      } catch { /* scraping failed, continue */ }
    }

    // 2. If images present, analyze first image
    if (shareData.images.length > 0 && !preview.extractedData.purchase_price) {
      try {
        const dataUri = shareData.images[0];
        const [header, base64] = dataUri.split(",");
        const mimeType = header.match(/data:(.*?);/)?.[1] || "image/jpeg";
        const result = await extractFromPhoto(base64, mimeType);

        if (result.listings.length > 0) {
          // Take first listing for preview (multi-listing handled after creation)
          const listing = result.listings[0];
          preview.extractedData = {
            ...preview.extractedData,
            ...listing,
          };
          preview.method = "photo";
          if (result.isMultiListing) {
            preview.multiListings = result.listings;
          }
        }
      } catch { /* photo analysis failed */ }
    }

    // 3. If text present and no data yet, try text extraction
    const combinedText = [shareData.title, shareData.text].filter(Boolean).join("\n");
    if (combinedText.length > 10 && !preview.extractedData.purchase_price) {
      try {
        const extracted = await extractFromText(combinedText);
        if (extracted.purchase_price || extracted.city || extracted.surface) {
          preview.extractedData = { ...preview.extractedData, ...extracted };
          preview.method = "text";
        }
      } catch { /* text extraction failed */ }
    }

    // 4. Merge app-specific hints (they have lower priority)
    if (shareData.hints.price && !preview.extractedData.purchase_price) {
      preview.extractedData.purchase_price = shareData.hints.price;
    }
    if (shareData.hints.surface && !preview.extractedData.surface) {
      preview.extractedData.surface = shareData.hints.surface;
    }
    if (shareData.hints.city && !preview.extractedData.city) {
      preview.extractedData.city = shareData.hints.city;
    }

    return { success: true, preview };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/**
 * Confirm and create a property from previewed share data.
 */
export async function confirmShareProperty(
  preview: SharePreviewData
): Promise<{ propertyId?: string; error?: string }> {
  try {
    // If we have a URL and scrape was successful, use the existing flow
    if (preview.url && preview.method === "scrape") {
      const result = await scrapeAndSaveProperty(preview.url);
      return { propertyId: result.propertyId, error: result.error || result.warning };
    }

    // Otherwise create property from extracted data
    const userId = await getOptionalUserId();
    const d = preview.extractedData;

    const propertyType: "ancien" | "neuf" =
      d.property_type === "neuf" ? "neuf" : "ancien";
    const price = d.purchase_price || 0;
    const surface = d.surface || 0;
    const city = d.city || "";
    const notary = calculateNotaryFees(price, propertyType);

    const sourceLabel = preview.method === "photo" ? "Photo (IA Vision)" : "Partage (IA)";
    let prefill: Record<string, { source: string; value: number | string }> = {};
    if (price > 0) prefill.purchase_price = { source: sourceLabel, value: price };
    if (surface > 0) prefill.surface = { source: sourceLabel, value: surface };
    if (d.city) prefill.city = { source: sourceLabel, value: d.city };
    if (d.address) prefill.address = { source: sourceLabel, value: d.address };
    if (d.postal_code) prefill.postal_code = { source: sourceLabel, value: d.postal_code };

    let monthlyRent = d.monthly_rent || 0;
    let condoCharges = 0;
    let propertyTax = 0;

    if (city && surface > 0) {
      try {
        const market = await getMarketData(city);
        if (market) {
          const applied = applyMarketDataToPrefill(prefill, market, surface, propertyType);
          prefill = applied.prefill;
          monthlyRent = applied.monthlyRent || monthlyRent;
          propertyTax = applied.propertyTax;
          condoCharges = applied.condoCharges;
        }
      } catch { /* no market data */ }
    }

    const loanAmount = Math.max(0, price + notary);
    prefill.loan_amount = { source: "Calcul (prix + notaire)", value: loanAmount };
    prefill.notary_fees = {
      source: `Calcul (${propertyType === "ancien" ? "7.5%" : "2.5%"} du prix)`,
      value: notary,
    };

    const id = await createProperty({
      user_id: userId,
      visibility: "public",
      address: d.address || "",
      city,
      postal_code: d.postal_code || "",
      purchase_price: price,
      surface,
      property_type: propertyType,
      description: d.description || "",
      loan_amount: loanAmount,
      interest_rate: 3.5,
      loan_duration: 20,
      personal_contribution: 0,
      insurance_rate: 0.34,
      loan_fees: 0,
      notary_fees: 0,
      monthly_rent: monthlyRent,
      condo_charges: condoCharges,
      property_tax: propertyTax,
      vacancy_rate: 5,
      airbnb_price_per_night: 0,
      airbnb_occupancy_rate: 60,
      airbnb_charges: 0,
      source_url: preview.url || "",
      image_urls: d.image_urls ? JSON.stringify(d.image_urls) : "[]",
      prefill_sources: JSON.stringify(prefill),
    });

    // Set collect URLs/texts
    if (preview.url) {
      await updateCollectFields(id, {
        collect_urls: JSON.stringify([preview.url]),
        source_url: preview.url,
      });
    }

    revalidatePath("/dashboard");
    enrichPropertyQuiet(id).catch(() => {});

    return { propertyId: id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Preview data passed between process and confirm steps */
export interface SharePreviewData {
  url: string;
  source: string;
  images: string[];
  extractedData: Partial<PhotoExtractedListing & { image_urls?: string[] }>;
  method: "scrape" | "photo" | "text" | "manual";
  multiListings?: PhotoExtractedListing[];
}
