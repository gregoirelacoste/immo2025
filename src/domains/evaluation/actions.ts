"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth-actions";
import { getPropertyById, updateAiEvaluation } from "@/domains/property/repository";
import { calculateSimulation, calculateNotaryFees, computeLoanAmount } from "@/lib/calculations";
import { buildSystemSimulation } from "@/domains/simulation/system";
import { resolveLocalityData } from "@/domains/locality/resolver";
import { getSimulationById, createSimulation, countSimulationsForProperty } from "@/domains/simulation/repository";
import { evaluatePropertyWithAI } from "./service";
import type { Simulation } from "@/domains/simulation/types";
import type { AiOptimalSimulation } from "./types";

export async function runAiEvaluation(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, isAdmin, isPremium } = await getAuthContext();
  if (!userId) return { success: false, error: "Non authentifié" };
  if (!isAdmin && !isPremium) return { success: false, error: "Fonctionnalité réservée premium/admin" };

  try {
    const property = await getPropertyById(propertyId, userId, isAdmin);
    if (!property) return { success: false, error: "Bien introuvable" };

    // Resolve active simulation
    let simulation: Simulation | null = null;
    if (property.active_simulation_id) {
      simulation = await getSimulationById(property.active_simulation_id);
    }

    // Resolve locality data
    const localityResult = await resolveLocalityData(
      property.city,
      property.postal_code || undefined
    ).catch(() => null);

    const localityFields = localityResult?.fields ?? null;

    // Build system simulation if no active sim
    if (!simulation) {
      simulation = buildSystemSimulation(property, localityFields);
    }

    // Calculate financials
    const calcs = calculateSimulation(property, simulation);

    // Run AI evaluation
    const evaluation = await evaluatePropertyWithAI(property, simulation, calcs, localityFields);

    // Save to DB
    await updateAiEvaluation(propertyId, {
      ai_evaluation: JSON.stringify(evaluation),
      ai_evaluation_at: new Date().toISOString(),
    });

    revalidatePath(`/property/${propertyId}`);
    return { success: true };
  } catch (e) {
    console.error("[runAiEvaluation] Error:", e);
    return { success: false, error: (e as Error).message };
  }
}

export async function applyOptimalSimulation(
  propertyId: string,
  optimal: AiOptimalSimulation
): Promise<{ success: boolean; simulationId?: string; error?: string }> {
  const { userId } = await getAuthContext();
  if (!userId) return { success: false, error: "Non authentifié" };

  try {
    const property = await getPropertyById(propertyId, userId);
    if (!property) return { success: false, error: "Bien introuvable" };

    const effectivePrice = optimal.negotiated_price > 0 ? optimal.negotiated_price : property.purchase_price;
    const notary = calculateNotaryFees(effectivePrice, property.property_type);
    const furnitureCost = optimal.furniture_cost > 0 ? optimal.furniture_cost : (property.meuble_status === "meuble" ? (property.furniture_cost || 0) : 0);
    const loanAmount = computeLoanAmount(effectivePrice, notary, optimal.renovation_cost, furnitureCost, optimal.personal_contribution);

    const count = await countSimulationsForProperty(propertyId);
    const name = `Simulation IA ${count + 1}`;

    const id = await createSimulation(propertyId, userId, {
      name,
      negotiated_price: optimal.negotiated_price,
      loan_amount: loanAmount,
      interest_rate: optimal.interest_rate,
      loan_duration: optimal.loan_duration,
      personal_contribution: optimal.personal_contribution,
      insurance_rate: property.insurance_rate || 0.34,
      loan_fees: property.loan_fees || 0,
      notary_fees: 0, // auto-calculated
      monthly_rent: optimal.monthly_rent,
      condo_charges: property.condo_charges,
      property_tax: property.property_tax,
      vacancy_rate: optimal.vacancy_rate,
      airbnb_price_per_night: property.airbnb_price_per_night,
      airbnb_occupancy_rate: property.airbnb_occupancy_rate,
      airbnb_charges: property.airbnb_charges,
      renovation_cost: optimal.renovation_cost,
      furniture_cost: optimal.furniture_cost,
      fiscal_regime: optimal.fiscal_regime,
      maintenance_per_m2: property.maintenance_per_m2,
      pno_insurance: property.pno_insurance,
      gli_rate: property.gli_rate,
      holding_duration: 0,
      annual_appreciation: 1.5,
    });

    revalidatePath(`/property/${propertyId}`);
    return { success: true, simulationId: id };
  } catch (e) {
    console.error("[applyOptimalSimulation] Error:", e);
    return { success: false, error: (e as Error).message };
  }
}
