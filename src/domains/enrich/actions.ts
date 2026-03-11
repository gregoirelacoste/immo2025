"use server";

import { revalidatePath } from "next/cache";
import { runEnrichmentPipeline } from "./service";
import {
  getPropertyByIdPublic,
  updateEnrichmentFields,
} from "@/domains/property/repository";

export async function enrichProperty(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Mark as running
    await updateEnrichmentFields(propertyId, {
      enrichment_status: "running",
      enrichment_error: "",
    });

    const property = await getPropertyByIdPublic(propertyId);
    if (!property) {
      await updateEnrichmentFields(propertyId, {
        enrichment_status: "error",
        enrichment_error: "Bien introuvable.",
      });
      return { success: false, error: "Bien introuvable." };
    }

    const result = await runEnrichmentPipeline(property);

    await updateEnrichmentFields(propertyId, result);

    revalidatePath(`/property/${propertyId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    await updateEnrichmentFields(propertyId, {
      enrichment_status: "error",
      enrichment_error: (e as Error).message,
      enrichment_at: new Date().toISOString(),
    }).catch(() => {});
    return { success: false, error: (e as Error).message };
  }
}

export async function refreshEnrichment(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  return enrichProperty(propertyId);
}
