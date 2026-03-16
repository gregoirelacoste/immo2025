"use server";

import { revalidatePath } from "next/cache";
import {
  createProperty,
  updateProperty,
  updatePropertyAsAdmin,
  updateOrphanProperty,
  deleteProperty,
  deletePropertyAsAdmin,
  getOrphanPropertyById,
  getPropertyByIdPublic,
  stripMeta,
  getOwnerOrAllowOrphan,
  updatePropertyStatus,
  updatePropertyStatusAsAdmin,
  togglePropertyFavorite,
  togglePropertyFavoriteAsAdmin,
  setActiveSimulation,
  setActiveSimulationAsAdmin,
} from "@/domains/property/repository";
import { requireUserId, getOptionalUserId, isAdmin } from "@/lib/auth-actions";
import { calculateNotaryFees } from "@/lib/calculations";
import { scrapeUrl } from "@/domains/scraping/pipeline/orchestrator";
import { Property, PropertyFormData, PROPERTY_STATUSES, type PropertyStatus } from "@/domains/property/types";
import { mergeRescrapeIntoPrefill, parsePrefill } from "@/domains/property/prefill";
import { enrichPropertyQuiet } from "@/domains/enrich/actions";
import { createSimulation, getFirstSimulationForProperty, getSimulationsForProperty, updateSimulation } from "@/domains/simulation/repository";

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
      // Fetch old property to detect price/type changes
      const oldProperty = await getPropertyByIdPublic(existingId);

      const orphan = await getOrphanPropertyById(existingId);
      if (orphan) {
        await updateOrphanProperty(existingId, payload);
      } else {
        const userId = await requireUserId();
        const admin = await isAdmin();
        if (admin) {
          await updatePropertyAsAdmin(existingId, payload);
        } else {
          await updateProperty(existingId, userId, payload);
        }
      }

      // Sync simulation loan_amounts when purchase_price or property_type changes
      if (oldProperty && (
        oldProperty.purchase_price !== payload.purchase_price ||
        oldProperty.property_type !== payload.property_type
      )) {
        try {
          const sims = await getSimulationsForProperty(existingId);
          for (const sim of sims) {
            const newNotary = sim.notary_fees > 0
              ? sim.notary_fees
              : calculateNotaryFees(payload.purchase_price, propertyType);
            const newLoan = Math.max(0, payload.purchase_price + newNotary + sim.renovation_cost - sim.personal_contribution);
            await updateSimulation(sim.id, sim.user_id, { loan_amount: newLoan });
          }
        } catch { /* simulation sync is non-fatal */ }
      }
    } else {
      const userId = await getOptionalUserId();
      const newId = await createProperty({ ...payload, user_id: userId });

      // Create default simulation for new property
      try {
        await createSimulation(newId, userId, {
          name: "Simulation 1",
          loan_amount: payload.loan_amount,
          interest_rate: payload.interest_rate,
          loan_duration: payload.loan_duration,
          personal_contribution: payload.personal_contribution,
          insurance_rate: payload.insurance_rate,
          loan_fees: payload.loan_fees,
          notary_fees: payload.notary_fees > 0 ? payload.notary_fees : 0,
          monthly_rent: 0, // 0 = fallback to property value
          condo_charges: payload.condo_charges, // ignored by calculateSimulation
          property_tax: payload.property_tax, // ignored by calculateSimulation
          vacancy_rate: payload.vacancy_rate,
          airbnb_price_per_night: payload.airbnb_price_per_night,
          airbnb_occupancy_rate: payload.airbnb_occupancy_rate,
          airbnb_charges: payload.airbnb_charges,
          renovation_cost: payload.renovation_cost ?? 0,
          fiscal_regime: payload.fiscal_regime || "micro_bic",
          maintenance_per_m2: payload.property_type === "neuf" ? 8 : 12,
          pno_insurance: 200,
          gli_rate: 0,
          holding_duration: 0,
          annual_appreciation: 1.5,
        });
      } catch (simErr) {
        console.error("Failed to create default simulation:", simErr);
      }

      enrichPropertyQuiet(newId).catch(() => {});
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
    // Admin can delete any property
    const admin = await isAdmin();
    if (admin) {
      await deletePropertyAsAdmin(id);
    } else {
      await deleteProperty(id, userId);
    }
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

    const { property, userId, adminAccess } = await getOwnerOrAllowOrphan(propertyId);
    const baseData = stripMeta(property);
    const payload = { ...baseData, image_urls: JSON.stringify(images) };

    if (userId === null) {
      await updateOrphanProperty(propertyId, payload);
    } else if (adminAccess) {
      await updatePropertyAsAdmin(propertyId, payload);
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
  let adminAccess: boolean | undefined;
  try {
    ({ property, userId, adminAccess } = await getOwnerOrAllowOrphan(id));
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
    ...(d.neighborhood != null && { neighborhood: d.neighborhood }),
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
  } else if (adminAccess) {
    await updatePropertyAsAdmin(id, updatePayload);
  } else {
    await updateProperty(id, userId, updatePayload);
  }

  // Sync first simulation with scraped rental data
  const simUpdateData: Record<string, number> = {};
  if (d.monthly_rent != null) simUpdateData.monthly_rent = d.monthly_rent;
  if (d.condo_charges != null) simUpdateData.condo_charges = d.condo_charges;
  if (d.property_tax != null) simUpdateData.property_tax = d.property_tax;
  if (Object.keys(simUpdateData).length > 0) {
    try {
      const firstSim = await getFirstSimulationForProperty(id);
      if (firstSim) {
        await updateSimulation(firstSim.id, firstSim.user_id, simUpdateData);
      }
    } catch { /* simulation sync is non-fatal */ }
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
    const admin = await isAdmin();
    if (admin) {
      await togglePropertyFavoriteAsAdmin(propertyId);
    } else {
      await togglePropertyFavorite(propertyId, userId);
    }
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
    const userId = await requireUserId();
    if (!PROPERTY_STATUSES.includes(status)) {
      return { success: false, error: "Statut invalide." };
    }
    const admin = await isAdmin();
    if (admin) {
      await updatePropertyStatusAsAdmin(propertyId, status);
    } else {
      await updatePropertyStatus(propertyId, status, userId);
    }
    revalidatePath(`/property/${propertyId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Set the active (favorite) simulation for a property. "" = system simulation. */
export async function setActiveSimulationAction(
  propertyId: string,
  simulationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await requireUserId();
    const admin = await isAdmin();
    if (admin) {
      await setActiveSimulationAsAdmin(propertyId, simulationId);
    } else {
      await setActiveSimulation(propertyId, userId, simulationId);
    }
    revalidatePath(`/property/${propertyId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
