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
} from "@/domains/property/repository";
import { requireUserId, getOptionalUserId } from "@/lib/auth-actions";
import { calculateNotaryFees } from "@/lib/calculations";
import { scrapeUrl } from "@/domains/scraping/pipeline/orchestrator";
import { Property, PropertyFormData } from "@/domains/property/types";
import { mergeRescrapeIntoPrefill, parsePrefill } from "@/domains/property/prefill";

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
  return { success: true };
}
