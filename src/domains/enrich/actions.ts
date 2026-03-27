"use server";

import { revalidatePath } from "next/cache";
import { runEnrichmentPipeline } from "./service";
import {
  getPropertyByIdPublic,
  updateEnrichmentFields,
} from "@/domains/property/repository";
import { ensureLocalityEnriched } from "@/domains/locality/enrichment/ensure";

// Track in-flight enrichments to prevent concurrent runs on the same property
const inFlight = new Set<string>();

/**
 * Run enrichment pipeline (internal, no revalidation).
 * Used by fire-and-forget calls from other server actions.
 * Does NOT call revalidatePath to avoid "revalidate during render" errors.
 * Skips silently if an enrichment is already running for this property.
 */
export async function enrichPropertyQuiet(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  // Skip if already running for this property (prevents concurrent runs)
  if (inFlight.has(propertyId)) {
    console.log(`[enrichPropertyQuiet] Skipping — already running for ${propertyId}`);
    return { success: true };
  }

  inFlight.add(propertyId);
  try {
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

    // Auto-enrich locality data for the property's city
    if (property.city) {
      await ensureLocalityEnriched(
        property.city,
        property.postal_code || undefined
      ).catch(() => {});
    }

    const result = await runEnrichmentPipeline(property);
    await updateEnrichmentFields(propertyId, result);

    return { success: true };
  } catch (e) {
    await updateEnrichmentFields(propertyId, {
      enrichment_status: "error",
      enrichment_error: (e as Error).message,
      enrichment_at: new Date().toISOString(),
    }).catch(() => {});
    return { success: false, error: (e as Error).message };
  } finally {
    inFlight.delete(propertyId);
  }
}

/**
 * Run enrichment + revalidate paths.
 * Called directly from the client (e.g. "Actualiser" button).
 */
export async function refreshEnrichment(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  const result = await enrichPropertyQuiet(propertyId);

  if (result.success) {
    revalidatePath(`/property/${propertyId}`);
    revalidatePath("/dashboard");
  }

  return result;
}
