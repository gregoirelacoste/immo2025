"use server";

import { revalidatePath } from "next/cache";
import {
  createSimulation,
  updateSimulation,
  deleteSimulation,
  getSimulationById,
  getSimulationsForProperty,
  countSimulationsForProperty,
} from "./repository";
import { SimulationFormData } from "./types";
import { getOptionalUserId } from "@/lib/auth-actions";
import { getPropertyById } from "@/domains/property/repository";
import { isAdmin } from "@/lib/auth-actions";
import { Property } from "@/domains/property/types";

/** Create a simulation with given data */
export async function saveSimulation(
  propertyId: string,
  data: SimulationFormData
): Promise<{ success: boolean; simulationId?: string; error?: string }> {
  try {
    const userId = await getOptionalUserId();
    const id = await createSimulation(propertyId, userId, data);
    revalidatePath(`/property/${propertyId}`);
    return { success: true, simulationId: id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Update an existing simulation */
export async function updateSimulationAction(
  simulationId: string,
  data: Partial<SimulationFormData>
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getOptionalUserId();
    const existing = await getSimulationById(simulationId);
    if (!existing) return { success: false, error: "Simulation introuvable." };

    const admin = userId ? await isAdmin() : false;
    if (!admin && existing.user_id !== userId) {
      return { success: false, error: "Non autorisé." };
    }

    await updateSimulation(simulationId, existing.user_id, data);
    revalidatePath(`/property/${existing.property_id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Delete a simulation */
export async function removeSimulation(
  simulationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getOptionalUserId();
    const existing = await getSimulationById(simulationId);
    if (!existing) return { success: false, error: "Simulation introuvable." };

    const admin = userId ? await isAdmin() : false;
    if (!admin && existing.user_id !== userId) {
      return { success: false, error: "Non autorisé." };
    }

    // Don't allow deleting the last simulation
    const count = await countSimulationsForProperty(existing.property_id);
    if (count <= 1) {
      return { success: false, error: "Impossible de supprimer la dernière simulation." };
    }

    await deleteSimulation(simulationId, existing.user_id);
    revalidatePath(`/property/${existing.property_id}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Duplicate a simulation with a new name */
export async function duplicateSimulation(
  simulationId: string
): Promise<{ success: boolean; simulationId?: string; error?: string }> {
  try {
    const userId = await getOptionalUserId();
    const existing = await getSimulationById(simulationId);
    if (!existing) return { success: false, error: "Simulation introuvable." };

    const count = await countSimulationsForProperty(existing.property_id);
    const newName = `Simulation ${count + 1}`;

    const data: SimulationFormData = {
      name: newName,
      loan_amount: existing.loan_amount,
      interest_rate: existing.interest_rate,
      loan_duration: existing.loan_duration,
      personal_contribution: existing.personal_contribution,
      insurance_rate: existing.insurance_rate,
      loan_fees: existing.loan_fees,
      notary_fees: existing.notary_fees,
      monthly_rent: existing.monthly_rent,
      condo_charges: existing.condo_charges,
      property_tax: existing.property_tax,
      vacancy_rate: existing.vacancy_rate,
      airbnb_price_per_night: existing.airbnb_price_per_night,
      airbnb_occupancy_rate: existing.airbnb_occupancy_rate,
      airbnb_charges: existing.airbnb_charges,
      renovation_cost: existing.renovation_cost,
      fiscal_regime: existing.fiscal_regime,
      holding_duration: existing.holding_duration,
      annual_appreciation: existing.annual_appreciation,
    };

    const id = await createSimulation(existing.property_id, userId, data);
    revalidatePath(`/property/${existing.property_id}`);
    return { success: true, simulationId: id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Create a default simulation from property data (internal helper).
 *  monthly_rent defaults to 0 (= use property value). condo_charges/property_tax
 *  are stored for DB compatibility but ignored by calculateSimulation.
 */
export async function createDefaultSimulation(property: Property): Promise<string> {
  const userId = property.user_id || "";
  const data: SimulationFormData = {
    name: "Simulation 1",
    loan_amount: property.loan_amount,
    interest_rate: property.interest_rate,
    loan_duration: property.loan_duration,
    personal_contribution: property.personal_contribution,
    insurance_rate: property.insurance_rate,
    loan_fees: property.loan_fees,
    notary_fees: property.notary_fees,
    monthly_rent: 0, // 0 = fallback to property value
    condo_charges: property.condo_charges, // ignored by calculateSimulation
    property_tax: property.property_tax, // ignored by calculateSimulation
    vacancy_rate: property.vacancy_rate,
    airbnb_price_per_night: property.airbnb_price_per_night,
    airbnb_occupancy_rate: property.airbnb_occupancy_rate,
    airbnb_charges: property.airbnb_charges,
    renovation_cost: property.renovation_cost,
    fiscal_regime: property.fiscal_regime || "micro_bic",
    holding_duration: 0, // 0 = utiliser loan_duration
    annual_appreciation: 1.5,
  };
  return createSimulation(property.id, userId, data);
}

/** Server action: create a default simulation for a property (auto-repair / client button) */
export async function createDefaultSimulationAction(
  propertyId: string
): Promise<{ success: boolean; simulationId?: string; error?: string }> {
  try {
    const userId = await getOptionalUserId();
    const property = await getPropertyById(propertyId, userId ?? undefined);
    if (!property) return { success: false, error: "Bien introuvable." };

    const id = await createDefaultSimulation(property);
    revalidatePath(`/property/${propertyId}`);
    return { success: true, simulationId: id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
