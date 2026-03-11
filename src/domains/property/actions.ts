"use server";

import { revalidatePath } from "next/cache";
import {
  createProperty,
  updateProperty,
  deleteProperty,
  getOwnPropertyById,
} from "@/domains/property/repository";
import { auth } from "@/lib/auth";
import { calculateNotaryFees } from "@/lib/calculations";
import { scrapeUrl } from "@/domains/scraping/pipeline/orchestrator";
import { Property } from "@/domains/property/types";
import { mergeRescrapeIntoPrefill, parsePrefill } from "@/domains/property/prefill";

type PropertyFormData = Omit<Property, "id" | "created_at" | "updated_at">;

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");
  return session.user.id;
}

async function getOptionalUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.id || "";
}

function stripMeta(p: Property) {
  const { id, user_id, created_at, updated_at, ...rest } = p;
  void id; void user_id; void created_at; void updated_at;
  return rest;
}

export async function saveProperty(
  formData: PropertyFormData,
  existingId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const propertyType: "ancien" | "neuf" =
      formData.property_type === "neuf" ? "neuf" : "ancien";

    const { user_id: _uid, ...formWithoutUserId } = formData;
    void _uid;

    const payload = {
      ...formWithoutUserId,
      property_type: propertyType,
      notary_fees:
        formData.notary_fees > 0
          ? formData.notary_fees
          : calculateNotaryFees(formData.purchase_price, propertyType),
    };

    if (existingId) {
      const userId = await requireUserId();
      await updateProperty(existingId, userId, payload);
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

export async function removeProperty(id: string): Promise<void> {
  const userId = await requireUserId();
  await deleteProperty(id, userId);
  revalidatePath("/dashboard");
}

export async function rescrapeProperty(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const userId = await requireUserId();
  const property = await getOwnPropertyById(id, userId);
  if (!property || !property.source_url) {
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
  await updateProperty(id, userId, {
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
  });

  revalidatePath(`/property/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}
