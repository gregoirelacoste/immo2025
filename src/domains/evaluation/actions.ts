"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth-actions";
import { getPropertyByIdPublic, updateAiEvaluation } from "@/domains/property/repository";
import { calculateSimulation } from "@/lib/calculations";
import { buildSystemSimulation } from "@/domains/simulation/system";
import { resolveLocalityData } from "@/domains/locality/resolver";
import { evaluatePropertyWithAI } from "./service";
import type { Simulation } from "@/domains/simulation/types";

/** Get simulation by ID from DB */
async function getSimulationById(simId: string): Promise<Simulation | null> {
  const { getDb } = await import("@/infrastructure/database/client");
  const db = await getDb();
  const result = await db.execute({ sql: "SELECT * FROM simulations WHERE id = ?", args: [simId] });
  return (result.rows[0] as unknown as Simulation) ?? null;
}

export async function runAiEvaluation(
  propertyId: string
): Promise<{ success: boolean; error?: string }> {
  const { userId, isAdmin, isPremium } = await getAuthContext();
  if (!userId) return { success: false, error: "Non authentifié" };
  if (!isAdmin && !isPremium) return { success: false, error: "Fonctionnalité réservée premium/admin" };

  try {
    const property = await getPropertyByIdPublic(propertyId);
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
