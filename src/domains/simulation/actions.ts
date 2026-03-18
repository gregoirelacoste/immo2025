"use server";

import { revalidatePath } from "next/cache";
import {
  createSimulation,
  updateSimulation,
  deleteSimulation,
  getSimulationById,
  countSimulationsForProperty,
  getSimulationsForProperty,
} from "./repository";
import { SimulationFormData } from "./types";
import { getOptionalUserId } from "@/lib/auth-actions";
import { getPropertyById } from "@/domains/property/repository";
import { isAdmin } from "@/lib/auth-actions";
import { Property } from "@/domains/property/types";
import { calculateNotaryFees } from "@/lib/calculations";
import { enrichPropertyQuiet } from "@/domains/enrich/actions";

/** Validate simulation data — returns error message or null */
function validateSimulationData(data: Partial<SimulationFormData>): string | null {
  if (data.loan_amount !== undefined && (data.loan_amount < 0 || data.loan_amount > 50_000_000)) {
    return "Montant du prêt invalide (0 – 50M€).";
  }
  if (data.interest_rate !== undefined && (data.interest_rate < 0 || data.interest_rate > 30)) {
    return "Taux d'intérêt invalide (0 – 30%).";
  }
  if (data.loan_duration !== undefined && (data.loan_duration < 1 || data.loan_duration > 50)) {
    return "Durée du prêt invalide (1 – 50 ans).";
  }
  if (data.vacancy_rate !== undefined && (data.vacancy_rate < 0 || data.vacancy_rate > 100)) {
    return "Taux de vacance invalide (0 – 100%).";
  }
  if (data.monthly_rent !== undefined && data.monthly_rent < 0) {
    return "Loyer mensuel invalide.";
  }
  return null;
}

/** Create a simulation with given data */
export async function saveSimulation(
  propertyId: string,
  data: SimulationFormData
): Promise<{ success: boolean; simulationId?: string; error?: string }> {
  try {
    const validationError = validateSimulationData(data);
    if (validationError) return { success: false, error: validationError };

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

    const validationError = validateSimulationData(data);
    if (validationError) return { success: false, error: validationError };

    await updateSimulation(simulationId, existing.user_id, data);

    // Re-score: the updated simulation may be the active one used for scoring
    enrichPropertyQuiet(existing.property_id).catch(() => {});

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

    // No guard needed — system simulation always exists as baseline
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
      maintenance_per_m2: existing.maintenance_per_m2,
      pno_insurance: existing.pno_insurance,
      gli_rate: existing.gli_rate,
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
    maintenance_per_m2: property.property_type === "neuf" ? 8 : 12,
    pno_insurance: 200,
    gli_rate: 0,
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

/** Sync a single property field to all user simulations + recalculate loan_amount */
export async function syncFieldToSimulations(
  propertyId: string,
  field: string,
  value: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getOptionalUserId();
    const property = await getPropertyById(propertyId, userId ?? undefined);
    if (!property) return { success: false, error: "Bien introuvable." };

    const simulations = await getSimulationsForProperty(propertyId);
    if (simulations.length === 0) return { success: true };

    const updatedProperty = { ...property, [field]: value };

    for (const sim of simulations) {
      // Use each simulation's own values for loan recalculation
      const updatedSim = { ...sim, [field]: value };
      const simNotary = updatedSim.notary_fees > 0
        ? updatedSim.notary_fees
        : calculateNotaryFees(updatedProperty.purchase_price, updatedProperty.property_type);
      const loanAmount = Math.max(0, updatedProperty.purchase_price + simNotary + updatedSim.renovation_cost - updatedSim.personal_contribution);

      await updateSimulation(sim.id, sim.user_id, {
        [field]: value,
        loan_amount: loanAmount,
      });
    }

    revalidatePath(`/property/${propertyId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

/** Resync all user simulations: recalculate loan_amount from current property price
 *  while preserving each simulation's user-customized parameters
 *  (personal_contribution, interest_rate, loan_duration, vacancy_rate, etc.).
 *  Only updates fields that are strictly property-derived (charges, tax, notary).
 */
export async function resyncSimulationsAction(
  propertyId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const userId = await getOptionalUserId();
    const property = await getPropertyById(propertyId, userId ?? undefined);
    if (!property) return { success: false, error: "Bien introuvable." };

    const simulations = await getSimulationsForProperty(propertyId);
    if (simulations.length === 0) return { success: true, count: 0 };

    for (const sim of simulations) {
      // Use each simulation's own notary_fees / personal_contribution / renovation_cost
      const simNotary = sim.notary_fees > 0
        ? sim.notary_fees
        : calculateNotaryFees(property.purchase_price, property.property_type);
      const loanAmount = Math.max(0, property.purchase_price + simNotary + sim.renovation_cost - sim.personal_contribution);

      // Only sync property-derived fields that the user cannot customize per-simulation
      await updateSimulation(sim.id, sim.user_id, {
        loan_amount: loanAmount,
        condo_charges: property.condo_charges,
        property_tax: property.property_tax,
      });
    }

    enrichPropertyQuiet(propertyId).catch(() => {});
    revalidatePath(`/property/${propertyId}`);
    return { success: true, count: simulations.length };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
