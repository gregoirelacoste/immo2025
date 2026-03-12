"use server";

import { revalidatePath } from "next/cache";
import {
  createProperty,
  updateProperty,
  updateOrphanProperty,
  deleteProperty,
  getOrphanPropertyById,
  stripMeta,
  getOwnerOrAllowOrphan,
  updatePropertyStatus,
  togglePropertyFavorite,
} from "@/domains/property/repository";
import { requireUserId, getOptionalUserId } from "@/lib/auth-actions";
import { calculateNotaryFees } from "@/lib/calculations";
import { scrapeUrl } from "@/domains/scraping/pipeline/orchestrator";
import { Property, PropertyFormData, PROPERTY_STATUSES, type PropertyStatus } from "@/domains/property/types";
import { mergeRescrapeIntoPrefill, parsePrefill } from "@/domains/property/prefill";
import { enrichPropertyQuiet } from "@/domains/enrich/actions";

export async function saveProperty(
  formData: PropertyFormData,
  existingId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const propertyType: "ancien" | "neuf" =
      formData.property_type === "neuf" ? "neuf" : "ancien";

    const { user_id: _uid, ...formWithoutUserId } = formData;

    const payload = {
      ...formWithoutUserId,
      property_type: propertyType,
      notary_fees:
        formData.notary_fees > 0
          ? formData.notary_fees
          : calculateNotaryFees(formData.purchase_price, propertyType),
    };

    if (existingId) {
      const orphan = await getOrphanPropertyById(existingId);
      if (orphan) {
        await updateOrphanProperty(existingId, payload);
      } else {
        const userId = await requireUserId();
        await updateProperty(existingId, userId, payload);
      }
    } else {
      const userId = await getOptionalUserId();
      await createProperty({ ...payload, user_id: userId });
    }

    revalidatePath("/dashboard");

    // Re-enrich after save (address/city may have changed)
    const propId = existingId || undefined;
    if (propId) enrichPropertyQuiet(propId).catch(() => {});

    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeProperty(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    await deleteProperty(id, userId);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function savePropertyPhotos(
  propertyId: string,
  imageUrlsJson: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate and enforce max 5 photos
    let images: string[];
    try {
      images = JSON.parse(imageUrlsJson);
      if (!Array.isArray(images)) images = [];
      images = images.slice(0, 5);
    } catch {
      return { success: false, error: "Format d'images invalide." };
    }

    const { property, userId } = await getOwnerOrAllowOrphan(propertyId);
    const baseData = stripMeta(property);
    const payload = { ...baseData, image_urls: JSON.stringify(images) };

    if (userId === null) {
      await updateOrphanProperty(propertyId, payload);
    } else {
      await updateProperty(propertyId, userId, payload);
    }

    revalidatePath(`/property/${propertyId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function rescrapeProperty(
  id: string
): Promise<{ success: boolean; error?: string }> {
  let property: Property;
  let userId: string | null;
  try {
    ({ property, userId } = await getOwnerOrAllowOrphan(id));
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  if (!property.source_url) {
    return { success: false, error: "Pas d'URL source pour ce bien." };
  }

  const result = await scrapeUrl(property.source_url);
  if (!result.success || !result.data) {
    return { success: false, error: result.error || "Échec du scraping." };
  }

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
    ...(d.amenities && d.amenities.length > 0 && {
      amenities: JSON.stringify([...new Set([
        ...JSON.parse(property.amenities || "[]"),
        ...d.amenities,
      ])]),
    }),
    // Scraped rental data updates (only if found)
    ...(d.monthly_rent != null && { monthly_rent: d.monthly_rent }),
    ...(d.condo_charges != null && { condo_charges: d.condo_charges }),
    ...(d.property_tax != null && { property_tax: d.property_tax }),
    notary_fees: newNotaryFees,
    image_urls: d.image_urls ? JSON.stringify(d.image_urls) : property.image_urls,
    prefill_sources: JSON.stringify(updatedPrefill),
  };

  if (userId === null) {
    await updateOrphanProperty(id, updatePayload);
  } else {
    await updateProperty(id, userId, updatePayload);
  }

  revalidatePath(`/property/${id}`);
  revalidatePath("/dashboard");

  // Re-enrich after rescrape
  enrichPropertyQuiet(id).catch(() => {});

  return { success: true };
}

export async function toggleFavorite(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    await togglePropertyFavorite(propertyId, userId);
    revalidatePath(`/property/${propertyId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function changePropertyStatus(
  propertyId: string,
  status: PropertyStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!PROPERTY_STATUSES.includes(status)) {
      return { success: false, error: "Statut invalide." };
    }
    await updatePropertyStatus(propertyId, status);
    revalidatePath(`/property/${propertyId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
