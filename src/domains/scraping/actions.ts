"use server";

import { revalidatePath } from "next/cache";
import { createProperty, updateProperty, getPropertyBySourceUrl, getOwnPropertyById } from "@/domains/property/repository";
import { auth } from "@/lib/auth";
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

async function getOptionalUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.id || "";
}

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

function stripMeta(p: Property) {
  const { id, user_id, created_at, updated_at, ...rest } = p;
  void id; void user_id; void created_at; void updated_at;
  return rest;
}

export async function scrapeAndSaveProperty(
  url: string,
  sharedText?: string
): Promise<{ propertyId?: string; error?: string; warning?: string }> {
  const userId = await getOptionalUserId();

  if (userId) {
    const existing = await getPropertyBySourceUrl(url, userId);
    if (existing) {
      return { propertyId: existing.id };
    }
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

  let prefill = buildPrefillFromScrape(d, result.method);

  let monthlyRent = 0;
  let condoCharges = 0;
  let propertyTax = 0;

  if (city && surface > 0) {
    try {
      const market = await getMarketData(city);
      if (market) {
        const applied = applyMarketDataToPrefill(prefill, market, surface, propertyType);
        prefill = applied.prefill;
        monthlyRent = applied.monthlyRent;
        propertyTax = applied.propertyTax;
        condoCharges = applied.condoCharges;
      }
    } catch {
      // Pas de données marché → garder les défauts à 0
    }
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
    source_url: url,
    image_urls: d.image_urls ? JSON.stringify(d.image_urls) : "[]",
    prefill_sources: JSON.stringify(prefill),
  });

  revalidatePath("/dashboard");
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

    let prefill: Record<string, { source: string; value: number | string }> = {};
    if (price > 0) prefill.purchase_price = { source: "Collage texte (IA)", value: price };
    if (surface > 0) prefill.surface = { source: "Collage texte (IA)", value: surface };
    if (d.city) prefill.city = { source: "Collage texte (IA)", value: d.city };
    if (d.address) prefill.address = { source: "Collage texte (IA)", value: d.address };
    if (d.postal_code) prefill.postal_code = { source: "Collage texte (IA)", value: d.postal_code };

    let monthlyRent = 0;
    let condoCharges = 0;
    let propertyTax = 0;

    if (city && surface > 0) {
      try {
        const market = await getMarketData(city);
        if (market) {
          const applied = applyMarketDataToPrefill(prefill, market, surface, propertyType);
          prefill = applied.prefill;
          monthlyRent = applied.monthlyRent;
          propertyTax = applied.propertyTax;
          condoCharges = applied.condoCharges;
        }
      } catch { /* pas de données marché */ }
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
      source_url: "",
      image_urls: "[]",
      prefill_sources: JSON.stringify(prefill),
    });

    revalidatePath("/dashboard");
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
    const userId = await requireUserId();
    const property = await getOwnPropertyById(propertyId, userId);
    if (!property) return { success: false, error: "Bien introuvable." };

    const d = await extractFromText(rawText);

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
          const applied = applyMarketDataToPrefill(prefill, market, newSurface, newType);
          prefill = applied.prefill;
          monthlyRent = applied.monthlyRent || monthlyRent;
          propertyTax = applied.propertyTax || propertyTax;
          condoCharges = applied.condoCharges || condoCharges;
        }
      } catch { /* pas de données marché */ }
    }

    const baseData = stripMeta(property);
    await updateProperty(propertyId, userId, {
      ...baseData,
      ...(d.purchase_price != null && { purchase_price: d.purchase_price }),
      ...(d.surface != null && { surface: d.surface }),
      ...(d.city && { city: d.city }),
      ...(d.postal_code && { postal_code: d.postal_code }),
      ...(d.address && { address: d.address }),
      ...(d.description && { description: d.description }),
      ...(d.property_type && { property_type: d.property_type }),
      loan_amount: Math.max(0, newPrice + notary - property.personal_contribution),
      monthly_rent: monthlyRent,
      property_tax: propertyTax,
      condo_charges: condoCharges,
      prefill_sources: JSON.stringify(prefill),
    });

    revalidatePath(`/property/${propertyId}`);
    revalidatePath(`/property/${propertyId}/edit`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
