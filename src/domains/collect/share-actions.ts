"use server";

import { revalidatePath } from "next/cache";
import { consumeShareData } from "@/domains/collect/share-store";
import { scrapeAndSaveProperty } from "@/domains/scraping/actions";
import { extractFromPhoto } from "@/domains/collect/ai/photo-extractor";
import { extractFromText } from "@/domains/scraping/ai/text-extractor";
import { getOptionalUserId } from "@/lib/auth-actions";
import { createProperty, updateCollectFields } from "@/domains/property/repository";
import { createSimulation } from "@/domains/simulation/repository";
import { calculateNotaryFees } from "@/lib/calculations";
import { getMarketData } from "@/domains/market/service";
import { applyMarketDataToPrefill } from "@/domains/property/prefill";
import { enrichPropertyQuiet } from "@/domains/enrich/actions";
import { PhotoExtractedListing } from "@/domains/collect/types";

/**
 * Fast path for URL-only shares (serverless-safe, no in-memory store).
 * scrapeAndSaveProperty already handles dedup internally.
 */
export async function processShareUrlDirect(
  url: string,
  text?: string,
  title?: string
): Promise<{ propertyId?: string; error?: string }> {
  if (!url) {
    return { error: "Aucune URL à traiter." };
  }

  try {
    const sharedText = [title, text].filter(Boolean).join("\n") || undefined;
    const result = await scrapeAndSaveProperty(url, sharedText);
    if (result.propertyId) {
      revalidatePath("/dashboard");
      return { propertyId: result.propertyId };
    }
    return { error: result.error || "Impossible d'analyser cette URL." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/**
 * Process shared data and create a property directly.
 * Priority: URL scraping → photo analysis → text extraction → hints.
 * Returns the created property ID or an error.
 */
export async function processShareAndCreate(
  sessionId: string
): Promise<{ propertyId?: string; error?: string }> {
  try {
    const shareData = consumeShareData(sessionId);
    if (!shareData) {
      return { error: "Session expirée. Veuillez repartager." };
    }

    // 1. If URL present, try scraping (uses existing full flow that creates property)
    if (shareData.url) {
      try {
        const result = await scrapeAndSaveProperty(shareData.url);
        if (result.propertyId) {
          revalidatePath("/dashboard");
          return { propertyId: result.propertyId };
        }
      } catch { /* scraping failed, continue to other methods */ }
    }

    // Extracted data accumulator
    let extracted: Partial<PhotoExtractedListing> = {};
    let method: "photo" | "text" | "hints" = "hints";

    // 2. If images present, analyze first image
    if (shareData.images.length > 0) {
      try {
        const dataUri = shareData.images[0];
        const [header, base64] = dataUri.split(",");
        const mimeType = header.match(/data:(.*?);/)?.[1] || "image/jpeg";
        const result = await extractFromPhoto(base64, mimeType);

        if (result.listings.length > 0) {
          extracted = { ...result.listings[0] };
          method = "photo";
        }
      } catch { /* photo analysis failed */ }
    }

    // 3. If text present and no price yet, try text extraction
    const combinedText = [shareData.title, shareData.text].filter(Boolean).join("\n");
    if (combinedText.length > 10 && !extracted.purchase_price) {
      try {
        const textResult = await extractFromText(combinedText);
        if (textResult.purchase_price || textResult.city || textResult.surface) {
          extracted = { ...extracted, ...textResult };
          method = "text";
        }
      } catch { /* text extraction failed */ }
    }

    // 4. Merge app-specific hints (lowest priority)
    if (shareData.hints.price && !extracted.purchase_price) {
      extracted.purchase_price = shareData.hints.price;
    }
    if (shareData.hints.surface && !extracted.surface) {
      extracted.surface = shareData.hints.surface;
    }
    if (shareData.hints.city && !extracted.city) {
      extracted.city = shareData.hints.city;
    }

    // Create the property from extracted data
    const userId = await getOptionalUserId();

    const propertyType: "ancien" | "neuf" =
      extracted.property_type === "neuf" ? "neuf" : "ancien";
    const price = extracted.purchase_price || 0;
    const surface = extracted.surface || 0;
    const city = extracted.city || "";
    const notary = calculateNotaryFees(price, propertyType);

    const sourceLabel = method === "photo" ? "Photo (IA Vision)" : "Partage (IA)";
    let prefill: Record<string, { source: string; value: number | string }> = {};
    if (price > 0) prefill.purchase_price = { source: sourceLabel, value: price };
    if (surface > 0) prefill.surface = { source: sourceLabel, value: surface };
    if (extracted.city) prefill.city = { source: sourceLabel, value: extracted.city };
    if (extracted.address) prefill.address = { source: sourceLabel, value: extracted.address };
    if (extracted.postal_code) prefill.postal_code = { source: sourceLabel, value: extracted.postal_code };

    if (extracted.monthly_rent) prefill.monthly_rent = { source: sourceLabel, value: extracted.monthly_rent };

    let rentPerM2 = 0;
    let monthlyRent = extracted.monthly_rent || 0;
    let condoCharges = 0;
    let propertyTax = 0;

    if (city && surface > 0) {
      try {
        const market = await getMarketData(city);
        if (market) {
          const applied = applyMarketDataToPrefill(prefill, market, surface, propertyType);
          prefill = applied.prefill;
          rentPerM2 = applied.rentPerM2;
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
      address: extracted.address || "",
      city,
      postal_code: extracted.postal_code || "",
      purchase_price: price,
      surface,
      property_type: propertyType,
      description: extracted.description || "",
      neighborhood: "",
      loan_amount: loanAmount,
      interest_rate: 3.5,
      loan_duration: 20,
      personal_contribution: 0,
      insurance_rate: 0.34,
      loan_fees: 0,
      notary_fees: 0,
      rent_mode: extracted.monthly_rent ? "manual" : "auto",
      rent_per_m2: rentPerM2,
      monthly_rent: monthlyRent,
      condo_charges: condoCharges,
      property_tax: propertyTax,
      vacancy_rate: 5,
      airbnb_price_per_night: 0,
      airbnb_occupancy_rate: 60,
      airbnb_charges: 0,
      renovation_cost: 0,
      dpe_rating: null,
      fiscal_regime: "micro_bic",
      amenities: extracted.amenities ? JSON.stringify(extracted.amenities) : "[]",
      travaux_ratings: "{}",
      travaux_overrides: "{}",
      equipment_costs: "{}",
      source_url: shareData.url || "",
      image_urls: "[]",
      prefill_sources: JSON.stringify(prefill),
    });

    // Set collect URLs
    if (shareData.url) {
      await updateCollectFields(id, {
        collect_urls: JSON.stringify([shareData.url]),
        source_url: shareData.url,
      });
    }

    revalidatePath("/dashboard");

    // Create default simulation
    try {
      await createSimulation(id, userId, {
        name: "Simulation 1",
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
        renovation_cost: 0,
        fiscal_regime: "micro_bic",
        maintenance_per_m2: 12,
        pno_insurance: 200,
        gli_rate: 0,
        holding_duration: 0,
        annual_appreciation: 1.5,
      });
    } catch (simErr) {
      console.error("Failed to create default simulation:", simErr);
    }

    enrichPropertyQuiet(id).catch(() => {});

    return { propertyId: id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
