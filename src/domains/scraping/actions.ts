"use server";

import { revalidatePath } from "next/cache";
import {
  createProperty,
  updateProperty,
  updateOrphanProperty,
  getPropertyBySourceUrl,
  getOrphanPropertyBySourceUrl,
  getRecentDuplicateProperty,
  stripMeta,
  getOwnerOrAllowOrphan,
  updateCollectFields,
} from "@/domains/property/repository";
import { getOptionalUserId } from "@/lib/auth-actions";
import { calculateNotaryFees } from "@/lib/calculations";
import { scrapeUrl } from "@/domains/scraping/pipeline/orchestrator";
import { extractFromText } from "@/domains/scraping/ai/text-extractor";
import { getMarketData } from "@/domains/market/service";
import {
  buildPrefillFromScrape,
  applyMarketDataToPrefill,
  mergeTextExtractionIntoPrefill,
  parsePrefill,
} from "@/domains/property/prefill";
import { Property } from "@/domains/property/types";
import { enrichPropertyQuiet } from "@/domains/enrich/actions";
import { resolveLocalityData } from "@/domains/locality/resolver";
import { createSimulation } from "@/domains/simulation/repository";

/** Normalize URL for dedup: strip fragment, trailing slash, utm params */
function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    // Remove common tracking params
    for (const p of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"]) {
      u.searchParams.delete(p);
    }
    // Sort remaining params for consistency
    u.searchParams.sort();
    // Remove trailing slash on path
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    return u.toString();
  } catch {
    return raw.trim();
  }
}

/** Check for existing property by URL (normalized), returns id if found */
async function findExistingByUrl(
  url: string,
  userId: string | null
): Promise<string | null> {
  const normalized = normalizeUrl(url);
  if (userId) {
    // Check both raw and normalized URLs
    const existing = await getPropertyBySourceUrl(url, userId)
      ?? await getPropertyBySourceUrl(normalized, userId);
    return existing?.id ?? null;
  } else {
    const existing = await getOrphanPropertyBySourceUrl(url)
      ?? await getOrphanPropertyBySourceUrl(normalized);
    return existing?.id ?? null;
  }
}

export async function scrapeAndSaveProperty(
  url: string,
  sharedText?: string
): Promise<{ propertyId?: string; error?: string; warning?: string }> {
  const userId = await getOptionalUserId();

  // Dedup: check if a property with this URL already exists
  const existingId = await findExistingByUrl(url, userId);
  if (existingId) {
    return { propertyId: existingId };
  }

  let result;
  try {
    result = await scrapeUrl(url);
  } catch {
    result = { success: false, data: null, method: "manual" as const, source_url: url };
  }

  let d = result.data ?? {};

  if (!result.success && sharedText && sharedText.trim().length > 10) {
    try {
      const extracted = await extractFromText(sharedText);
      if (extracted && (extracted.purchase_price || extracted.city || extracted.surface)) {
        d = { ...d, ...extracted };
        result.method = "ai" as const;
      }
    } catch {
      // Extraction IA échouée → on continue avec ce qu'on a
    }
  }

  const propertyType: "ancien" | "neuf" =
    d.property_type === "neuf" ? "neuf" : "ancien";
  const price = d.purchase_price || 0;
  const surface = d.surface || 0;
  const notary = calculateNotaryFees(price, propertyType);
  const city = d.city || "";
  const scrapeWarning = !result.success
    ? (result.error || "Scraping échoué — complétez les données manuellement.")
    : result.error;

  // buildPrefillFromScrape now also includes scraped monthly_rent, condo_charges, property_tax
  let prefill = buildPrefillFromScrape(d, result.method);

  // Priority: scraped values > market data estimates
  // Scraped values are already in prefill, applyMarketDataToPrefill respects existing entries
  let rentPerM2 = 0;
  let monthlyRent = d.monthly_rent || 0;
  let condoCharges = d.condo_charges || 0;
  let propertyTax = d.property_tax || 0;

  if (city && surface > 0) {
    try {
      const market = await getMarketData(city);
      if (market) {
        const applied = applyMarketDataToPrefill(prefill, market, surface, propertyType);
        prefill = applied.prefill;
        rentPerM2 = applied.rentPerM2;
        monthlyRent = applied.monthlyRent || monthlyRent;
        propertyTax = applied.propertyTax || propertyTax;
        condoCharges = applied.condoCharges || condoCharges;
      }
    } catch {
      // Pas de données marché → garder les défauts à 0
    }
  }

  // Locality data fallback for fields not filled by scraping or market data
  if (city) {
    try {
      const localityData = await resolveLocalityData(city, d.postal_code || undefined);
      if (localityData?.fields && surface > 0) {
        const f = localityData.fields;
        const src = `Données locales (${localityData.locality.name})`;
        if (rentPerM2 === 0 && monthlyRent === 0 && f.avg_rent_per_m2) {
          rentPerM2 = f.avg_rent_per_m2;
          monthlyRent = Math.round(f.avg_rent_per_m2 * surface);
          prefill.rent_per_m2 = { source: src, value: rentPerM2 };
          prefill.monthly_rent = { source: src, value: monthlyRent };
        }
        if (propertyTax === 0 && f.avg_property_tax_per_m2) {
          propertyTax = Math.round(f.avg_property_tax_per_m2 * surface);
          prefill.property_tax = { source: src, value: propertyTax };
        }
        if (condoCharges === 0 && f.avg_condo_charges_per_m2) {
          condoCharges = Math.round(f.avg_condo_charges_per_m2 * surface);
          prefill.condo_charges = { source: src, value: condoCharges };
        }
      }
    } catch (e) { console.warn("Locality data not available:", e); }
  }

  const loanAmount = Math.max(0, price + notary);
  prefill.loan_amount = { source: "Calcul (prix + notaire)", value: loanAmount };
  prefill.notary_fees = {
    source: `Calcul (${propertyType === "ancien" ? "7.5%" : "2.5%"} du prix)`,
    value: notary,
  };

  // Second dedup check right before creation (catches race conditions)
  const raceCheckId = await findExistingByUrl(url, userId);
  if (raceCheckId) {
    return { propertyId: raceCheckId };
  }

  const normalizedUrl = normalizeUrl(url);
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
    neighborhood: d.neighborhood || "",
    loan_amount: loanAmount,
    interest_rate: 3.5,
    loan_duration: 20,
    personal_contribution: 0,
    insurance_rate: 0.34,
    loan_fees: 0,
    notary_fees: 0,
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
    amenities: d.amenities ? JSON.stringify(d.amenities) : "[]",
    source_url: normalizedUrl,
    image_urls: d.image_urls ? JSON.stringify(d.image_urls) : "[]",
    prefill_sources: JSON.stringify(prefill),
  });

  // Set collect_urls with this URL
  await updateCollectFields(id, {
    collect_urls: JSON.stringify([url]),
    source_url: normalizedUrl,
  });

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

  // Fire-and-forget enrichment
  enrichPropertyQuiet(id).catch(() => {});

  return { propertyId: id, warning: scrapeWarning };
}

/**
 * Crée une nouvelle propriété à partir de texte brut (annonce collée).
 * Flow : texte → IA → extraction → createProperty → propertyId
 * Différent de extractAndUpdateFromText qui met à jour une propriété existante.
 */
export async function createPropertyFromText(
  rawText: string
): Promise<{ propertyId?: string; error?: string }> {
  try {
    const userId = await getOptionalUserId();

    const d = await extractFromText(rawText);

    const propertyType: "ancien" | "neuf" =
      d.property_type === "neuf" ? "neuf" : "ancien";
    const price = d.purchase_price || 0;
    const surface = d.surface || 0;
    const city = d.city || "";
    const notary = calculateNotaryFees(price, propertyType);

    // Dedup: check if a property with same key data was recently created
    if (city && price > 0 && surface > 0) {
      const existing = await getRecentDuplicateProperty(userId, city, price, surface);
      if (existing) {
        // Update existing property with text data instead of creating duplicate
        const texts = (() => { try { return JSON.parse(existing.collect_texts || "[]"); } catch { return []; } })();
        texts.push(rawText);
        await updateCollectFields(existing.id, { collect_texts: JSON.stringify(texts) });
        return { propertyId: existing.id };
      }
    }

    let prefill: Record<string, { source: string; value: number | string }> = {};
    if (price > 0) prefill.purchase_price = { source: "Collage texte (IA)", value: price };
    if (surface > 0) prefill.surface = { source: "Collage texte (IA)", value: surface };
    if (d.city) prefill.city = { source: "Collage texte (IA)", value: d.city };
    if (d.neighborhood) prefill.neighborhood = { source: "Collage texte (IA)", value: d.neighborhood };
    if (d.address) prefill.address = { source: "Collage texte (IA)", value: d.address };
    if (d.postal_code) prefill.postal_code = { source: "Collage texte (IA)", value: d.postal_code };
    // Scraped rental fields (priority over calculated)
    if (d.monthly_rent) prefill.monthly_rent = { source: "Collage texte (IA)", value: d.monthly_rent };
    if (d.condo_charges) prefill.condo_charges = { source: "Collage texte (IA)", value: d.condo_charges };
    if (d.property_tax) prefill.property_tax = { source: "Collage texte (IA)", value: d.property_tax };

    let rentPerM2 = 0;
    let monthlyRent = d.monthly_rent || 0;
    let condoCharges = d.condo_charges || 0;
    let propertyTax = d.property_tax || 0;

    if (city && surface > 0) {
      try {
        const market = await getMarketData(city);
        if (market) {
          const applied = applyMarketDataToPrefill(prefill, market, surface, propertyType);
          prefill = applied.prefill;
          rentPerM2 = applied.rentPerM2;
          monthlyRent = applied.monthlyRent || monthlyRent;
          propertyTax = applied.propertyTax || propertyTax;
          condoCharges = applied.condoCharges || condoCharges;
        }
      } catch (e) { console.warn("Market data not available:", e); }
    }

    // Locality data fallback for fields not filled by text extraction or market data
    if (city) {
      try {
        const localityData = await resolveLocalityData(city, d.postal_code || undefined);
        if (localityData?.fields && surface > 0) {
          const f = localityData.fields;
          const src = `Données locales (${localityData.locality.name})`;
          if (rentPerM2 === 0 && monthlyRent === 0 && f.avg_rent_per_m2) {
            rentPerM2 = f.avg_rent_per_m2;
            monthlyRent = Math.round(f.avg_rent_per_m2 * surface);
            prefill.rent_per_m2 = { source: src, value: rentPerM2 };
            prefill.monthly_rent = { source: src, value: monthlyRent };
          }
          if (propertyTax === 0 && f.avg_property_tax_per_m2) {
            propertyTax = Math.round(f.avg_property_tax_per_m2 * surface);
            prefill.property_tax = { source: src, value: propertyTax };
          }
          if (condoCharges === 0 && f.avg_condo_charges_per_m2) {
            condoCharges = Math.round(f.avg_condo_charges_per_m2 * surface);
            prefill.condo_charges = { source: src, value: condoCharges };
          }
        }
      } catch (e) { console.warn("Locality data not available:", e); }
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
      neighborhood: d.neighborhood || "",
      loan_amount: loanAmount,
      interest_rate: 3.5,
      loan_duration: 20,
      personal_contribution: 0,
      insurance_rate: 0.34,
      loan_fees: 0,
      notary_fees: 0,
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
      amenities: d.amenities ? JSON.stringify(d.amenities) : "[]",
      source_url: "",
      image_urls: "[]",
      prefill_sources: JSON.stringify(prefill),
    });

    // Set collect_texts with this text
    await updateCollectFields(id, {
      collect_texts: JSON.stringify([rawText]),
    });

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

    // Fire-and-forget enrichment
    enrichPropertyQuiet(id).catch(() => {});

    return { propertyId: id };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function extractAndUpdateFromText(
  propertyId: string,
  rawText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { property, userId } = await getOwnerOrAllowOrphan(propertyId);

    const d = await extractFromText(rawText);

    const newPrice = d.purchase_price ?? property.purchase_price;
    const newSurface = d.surface ?? property.surface;
    const newType = d.property_type ?? property.property_type;
    const newCity = d.city ?? property.city;
    const notary = calculateNotaryFees(newPrice, newType);

    // Priority: scraped > existing calculated values
    let monthlyRent = d.monthly_rent ?? property.monthly_rent;
    let propertyTax = d.property_tax ?? property.property_tax;
    let condoCharges = d.condo_charges ?? property.condo_charges;
    let prefill = mergeTextExtractionIntoPrefill(
      parsePrefill(property.prefill_sources),
      d
    );

    if (monthlyRent === 0 && newCity && newSurface > 0) {
      try {
        const market = await getMarketData(newCity);
        if (market) {
          const applied = applyMarketDataToPrefill(prefill, market, newSurface, newType);
          prefill = applied.prefill;
          monthlyRent = applied.monthlyRent || monthlyRent;
          propertyTax = applied.propertyTax || propertyTax;
          condoCharges = applied.condoCharges || condoCharges;
        }
      } catch (e) { console.warn("Market data not available:", e); }
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
      ...(d.neighborhood && { neighborhood: d.neighborhood }),
      ...(d.property_type && { property_type: d.property_type }),
      ...(d.amenities && d.amenities.length > 0 && {
        amenities: JSON.stringify([...new Set([
          ...JSON.parse(property.amenities || "[]"),
          ...d.amenities,
        ])]),
      }),
      loan_amount: Math.max(0, newPrice + notary - property.personal_contribution),
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

    revalidatePath(`/property/${propertyId}`);
    revalidatePath(`/property/${propertyId}/edit`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
