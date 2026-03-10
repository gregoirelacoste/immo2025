"use server";

import { revalidatePath } from "next/cache";
import {
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyBySourceUrl,
} from "@/lib/db";
import { calculateNotaryFees } from "@/lib/calculations";
import { scrapeUrl } from "@/lib/scraping/orchestrator";
import { getMarketData, MarketData } from "@/lib/market-data";
import { Property } from "@/types/property";

type PropertyFormData = Omit<Property, "id" | "created_at" | "updated_at">;

export async function saveProperty(
  formData: PropertyFormData,
  existingId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Garantir que property_type est valide (CHECK constraint SQLite)
    const propertyType: "ancien" | "neuf" =
      formData.property_type === "neuf" ? "neuf" : "ancien";

    const payload = {
      ...formData,
      property_type: propertyType,
      notary_fees:
        formData.notary_fees > 0
          ? formData.notary_fees
          : calculateNotaryFees(formData.purchase_price, propertyType),
    };

    if (existingId) {
      await updateProperty(existingId, payload);
    } else {
      await createProperty(payload);
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeProperty(id: string): Promise<void> {
  await deleteProperty(id);
  revalidatePath("/dashboard");
}

export async function rescrapeProperty(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const { getPropertyById } = await import("@/lib/db");
  const property = await getPropertyById(id);
  if (!property || !property.source_url) {
    return { success: false, error: "Pas d'URL source pour ce bien." };
  }

  const result = await scrapeUrl(property.source_url);
  if (!result.success || !result.data) {
    return { success: false, error: result.error || "Échec du scraping." };
  }

  const d = result.data;

  // Déterminer les nouvelles valeurs
  const newPrice = d.purchase_price ?? property.purchase_price;
  const newType = d.property_type ?? property.property_type;

  // Recalculer les frais de notaire si le prix ou le type a changé
  const priceChanged = d.purchase_price != null && d.purchase_price !== property.purchase_price;
  const typeChanged = d.property_type != null && d.property_type !== property.property_type;
  let newNotaryFees = property.notary_fees;
  if ((priceChanged || typeChanged) && property.notary_fees === 0) {
    // Notaire était auto-calculé (0 = auto) → on le laisse à 0 pour recalcul auto
    newNotaryFees = 0;
  }

  // Mettre à jour prefill_sources
  const existingPrefill: Record<string, { source: string; value: number | string }> = (() => {
    try { return JSON.parse(property.prefill_sources || "{}"); }
    catch { return {}; }
  })();
  const scrapeLabel = `Rescraping (${result.method})`;
  if (d.purchase_price != null) existingPrefill.purchase_price = { source: scrapeLabel, value: d.purchase_price };
  if (d.surface != null) existingPrefill.surface = { source: scrapeLabel, value: d.surface };
  if (d.city) existingPrefill.city = { source: scrapeLabel, value: d.city };
  if (d.address) existingPrefill.address = { source: scrapeLabel, value: d.address };
  if (d.postal_code) existingPrefill.postal_code = { source: scrapeLabel, value: d.postal_code };

  await updateProperty(id, {
    ...property,
    ...(d.purchase_price != null && { purchase_price: d.purchase_price }),
    ...(d.surface != null && { surface: d.surface }),
    ...(d.city != null && { city: d.city }),
    ...(d.postal_code != null && { postal_code: d.postal_code }),
    ...(d.address != null && { address: d.address }),
    ...(d.description != null && { description: d.description }),
    ...(d.property_type != null && { property_type: d.property_type }),
    notary_fees: newNotaryFees,
    image_urls: d.image_urls ? JSON.stringify(d.image_urls) : property.image_urls,
    prefill_sources: JSON.stringify(existingPrefill),
  });

  revalidatePath(`/property/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function scrapeAndSaveProperty(
  url: string
): Promise<{ propertyId?: string; error?: string; warning?: string }> {
  // Vérifier si l'URL existe déjà en DB
  const existing = await getPropertyBySourceUrl(url);
  if (existing) {
    return { propertyId: existing.id };
  }

  let result;
  try {
    result = await scrapeUrl(url);
  } catch {
    result = { success: false, data: null, method: "manual" as const, source_url: url };
  }

  const d = result.data ?? {};
  const propertyType: "ancien" | "neuf" =
    d.property_type === "neuf" ? "neuf" : "ancien";
  const price = d.purchase_price || 0;
  const surface = d.surface || 0;
  const notary = calculateNotaryFees(price, propertyType);
  const city = d.city || "";
  const scrapeWarning = !result.success
    ? (result.error || "Scraping échoué — complétez les données manuellement.")
    : result.error;

  // Pré-remplir les champs locatifs avec les données marché
  let monthlyRent = 0;
  let condoCharges = 0;
  let propertyTax = 0;
  const prefill: Record<string, { source: string; value: number | string }> = {};

  // Sources scraping
  const methodLabels: Record<string, string> = {
    jsonld: "Scraping (JSON-LD)",
    manifest: "Scraping (manifest)",
    ai: "Scraping (IA)",
    manual: "Saisie manuelle",
  };
  const scrapeLabel = methodLabels[result.method] || "Scraping";
  if (price > 0) prefill.purchase_price = { source: scrapeLabel, value: price };
  if (surface > 0) prefill.surface = { source: scrapeLabel, value: surface };
  if (d.city) prefill.city = { source: scrapeLabel, value: d.city };
  if (d.address) prefill.address = { source: scrapeLabel, value: d.address };
  if (d.postal_code) prefill.postal_code = { source: scrapeLabel, value: d.postal_code };

  // Sources marché
  if (city && surface > 0) {
    try {
      const market = await getMarketData(city);
      if (market?.avgRentPerM2) {
        const rentSource = market.rentSource === "reference"
          ? "Observatoire des loyers"
          : "Estimation DVF (5.5%)";
        monthlyRent = Math.round(market.avgRentPerM2 * surface);
        prefill.monthly_rent = { source: rentSource, value: monthlyRent };
        // Taxe foncière estimée ~1.5 mois de loyer
        propertyTax = Math.round(monthlyRent * 1.5);
        prefill.property_tax = { source: "Estimation (~1.5× loyer)", value: propertyTax };
      }
      // Charges copro estimées ~2.5 €/m²/mois (appartement ancien)
      if (propertyType === "ancien") {
        condoCharges = Math.round(surface * 2.5);
        prefill.condo_charges = { source: "Estimation (2.5 €/m²)", value: condoCharges };
      }
    } catch {
      // Pas de données marché → garder les défauts à 0
    }
  }

  // Calculs auto
  const loanAmount = Math.max(0, price + notary);
  prefill.loan_amount = { source: "Calcul (prix + notaire)", value: loanAmount };
  prefill.notary_fees = {
    source: `Calcul (${propertyType === "ancien" ? "7.5%" : "2.5%"} du prix)`,
    value: notary,
  };

  const id = await createProperty({
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

export async function fetchMarketDataForCity(
  city: string
): Promise<MarketData | null> {
  return getMarketData(city);
}

/** Fallback : extraire les données depuis du texte collé par l'utilisateur */
export async function extractAndUpdateFromText(
  propertyId: string,
  rawText: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { extractFromText } = await import("@/lib/scraping/text-extractor");
    const { getPropertyById } = await import("@/lib/db");

    const property = await getPropertyById(propertyId);
    if (!property) return { success: false, error: "Bien introuvable." };

    const d = await extractFromText(rawText);

    // Recalculer les valeurs dépendantes
    const newPrice = d.purchase_price ?? property.purchase_price;
    const newSurface = d.surface ?? property.surface;
    const newType = d.property_type ?? property.property_type;
    const newCity = d.city ?? property.city;
    const notary = calculateNotaryFees(newPrice, newType);

    // Pré-remplir loyer si on a la ville et la surface
    let monthlyRent = property.monthly_rent;
    let propertyTax = property.property_tax;
    let condoCharges = property.condo_charges;
    const prefill: Record<string, { source: string; value: number | string }> = (() => {
      try { return JSON.parse(property.prefill_sources || "{}"); }
      catch { return {}; }
    })();

    if (d.purchase_price != null) prefill.purchase_price = { source: "Collage texte (IA)", value: d.purchase_price };
    if (d.surface != null) prefill.surface = { source: "Collage texte (IA)", value: d.surface };
    if (d.city) prefill.city = { source: "Collage texte (IA)", value: d.city };
    if (d.address) prefill.address = { source: "Collage texte (IA)", value: d.address };
    if (d.postal_code) prefill.postal_code = { source: "Collage texte (IA)", value: d.postal_code };

    // Si le loyer est à 0 et qu'on a ville + surface, pré-remplir
    if (monthlyRent === 0 && newCity && newSurface > 0) {
      try {
        const market = await getMarketData(newCity);
        if (market?.avgRentPerM2) {
          const rentLabel = market.rentSource === "reference"
            ? "Observatoire des loyers"
            : "Estimation DVF (5.5%)";
          monthlyRent = Math.round(market.avgRentPerM2 * newSurface);
          prefill.monthly_rent = { source: rentLabel, value: monthlyRent };
          propertyTax = Math.round(monthlyRent * 1.5);
          prefill.property_tax = { source: "Estimation (~1.5× loyer)", value: propertyTax };
        }
        if (newType === "ancien" && condoCharges === 0) {
          condoCharges = Math.round(newSurface * 2.5);
          prefill.condo_charges = { source: "Estimation (2.5 €/m²)", value: condoCharges };
        }
      } catch { /* pas de données marché */ }
    }

    await updateProperty(propertyId, {
      ...property,
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
