import { getDb } from "@/infrastructure/database/client";
import { Simulation, SimulationFormData } from "./types";

function generateId(): string {
  return crypto.randomUUID();
}

export async function getSimulationsForProperty(propertyId: string): Promise<Simulation[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM simulations WHERE property_id = ? ORDER BY created_at ASC",
    args: [propertyId],
  });
  return result.rows.map(rowToSimulation);
}

export async function getSimulationById(id: string): Promise<Simulation | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM simulations WHERE id = ?",
    args: [id],
  });
  return result.rows.length > 0 ? rowToSimulation(result.rows[0]) : null;
}

export async function createSimulation(
  propertyId: string,
  userId: string,
  data: SimulationFormData
): Promise<string> {
  const db = await getDb();
  const id = generateId();
  await db.execute({
    sql: `INSERT INTO simulations (
      id, property_id, user_id, name,
      loan_amount, interest_rate, loan_duration, personal_contribution,
      insurance_rate, loan_fees, notary_fees,
      monthly_rent, condo_charges, property_tax, vacancy_rate,
      airbnb_price_per_night, airbnb_occupancy_rate, airbnb_charges,
      renovation_cost, fiscal_regime, maintenance_per_m2, pno_insurance, gli_rate,
      holding_duration, annual_appreciation
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, propertyId, userId, data.name,
      data.loan_amount, data.interest_rate, data.loan_duration, data.personal_contribution,
      data.insurance_rate, data.loan_fees, data.notary_fees,
      data.monthly_rent, data.condo_charges, data.property_tax, data.vacancy_rate,
      data.airbnb_price_per_night, data.airbnb_occupancy_rate, data.airbnb_charges,
      data.renovation_cost, data.fiscal_regime, data.maintenance_per_m2, data.pno_insurance, data.gli_rate,
      data.holding_duration, data.annual_appreciation,
    ],
  });
  return id;
}

export async function updateSimulation(
  id: string,
  userId: string,
  data: Partial<SimulationFormData>
): Promise<void> {
  const db = await getDb();
  const sets: string[] = [];
  const args: (string | number)[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      args.push(value as string | number);
    }
  }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  args.push(id, userId);

  await db.execute({
    sql: `UPDATE simulations SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  });
}

export async function deleteSimulation(id: string, userId: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM simulations WHERE id = ? AND user_id = ?",
    args: [id, userId],
  });
}

export async function countSimulationsForProperty(propertyId: string): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM simulations WHERE property_id = ?",
    args: [propertyId],
  });
  return Number(result.rows[0]?.cnt ?? 0);
}

/**
 * Get the first (oldest) simulation for a single property.
 * Returns null if no simulation exists.
 */
export async function getFirstSimulationForProperty(propertyId: string): Promise<Simulation | null> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM simulations WHERE property_id = ? ORDER BY created_at ASC LIMIT 1",
    args: [propertyId],
  });
  return result.rows.length > 0 ? rowToSimulation(result.rows[0]) : null;
}

/**
 * Get the active (favorite) simulation for a single property.
 * If active_simulation_id is set and valid → returns that simulation.
 * If active_simulation_id is "" or "__system__" → returns null (= system simulation).
 * Otherwise falls back to the first (oldest) simulation.
 */
export async function getActiveSimulationForProperty(property: { id: string; active_simulation_id: string }): Promise<Simulation | null> {
  // System simulation → no DB simulation
  if (!property.active_simulation_id || property.active_simulation_id === "__system__") {
    return null;
  }

  // Try to load the specific active simulation
  const sim = await getSimulationById(property.active_simulation_id);
  if (sim) return sim;

  // Fallback to first simulation if active_simulation_id points to a deleted sim
  return getFirstSimulationForProperty(property.id);
}

/**
 * Get the first (oldest) simulation for each property in a batch.
 * Returns a map of property_id → Simulation.
 */
export async function getFirstSimulationsForProperties(
  propertyIds: string[]
): Promise<Map<string, Simulation>> {
  if (propertyIds.length === 0) return new Map();
  const db = await getDb();
  // Use a window function to get the first simulation per property
  const placeholders = propertyIds.map(() => "?").join(",");
  const result = await db.execute({
    sql: `SELECT s.* FROM simulations s
      INNER JOIN (
        SELECT property_id, MIN(created_at) as min_created
        FROM simulations
        WHERE property_id IN (${placeholders})
        GROUP BY property_id
      ) first ON s.property_id = first.property_id AND s.created_at = first.min_created`,
    args: propertyIds,
  });
  const map = new Map<string, Simulation>();
  for (const row of result.rows) {
    const sim = rowToSimulation(row);
    if (!map.has(sim.property_id)) {
      map.set(sim.property_id, sim);
    }
  }
  return map;
}

/**
 * Get the active simulation for each property in a batch.
 * If active_simulation_id is set and valid, returns that simulation.
 * Otherwise falls back to the first (oldest) simulation.
 * Returns a map of property_id → Simulation (or undefined if no sim + active = system).
 */
export async function getActiveSimulationsForProperties(
  properties: Array<{ id: string; active_simulation_id: string }>
): Promise<Map<string, Simulation | null>> {
  if (properties.length === 0) return new Map();

  const propertyIds = properties.map((p) => p.id);
  const activeIds = properties
    .filter((p) => p.active_simulation_id && p.active_simulation_id !== "__system__")
    .map((p) => p.active_simulation_id);

  const db = await getDb();
  const map = new Map<string, Simulation | null>();

  // Batch-fetch active simulations by ID
  if (activeIds.length > 0) {
    const placeholders = activeIds.map(() => "?").join(",");
    const result = await db.execute({
      sql: `SELECT * FROM simulations WHERE id IN (${placeholders})`,
      args: activeIds,
    });
    const simById = new Map<string, Simulation>();
    for (const row of result.rows) {
      const sim = rowToSimulation(row);
      simById.set(sim.id, sim);
    }
    for (const p of properties) {
      if (p.active_simulation_id && simById.has(p.active_simulation_id)) {
        map.set(p.id, simById.get(p.active_simulation_id)!);
      }
    }
  }

  // For properties with active = "" or "__system__", mark as null (= system simulation)
  for (const p of properties) {
    if (map.has(p.id)) continue;
    if (!p.active_simulation_id || p.active_simulation_id === "__system__") {
      map.set(p.id, null); // null = system simulation
      continue;
    }
  }

  // Fallback: properties with active_simulation_id pointing to missing sim → first sim
  const needFallback = propertyIds.filter((id) => !map.has(id));
  if (needFallback.length > 0) {
    const fallback = await getFirstSimulationsForProperties(needFallback);
    for (const [pid, sim] of fallback) {
      map.set(pid, sim);
    }
    // Properties with no simulations at all → null (system)
    for (const pid of needFallback) {
      if (!map.has(pid)) map.set(pid, null);
    }
  }

  return map;
}

/** Convert a DB value to number, defaulting to fallback if NaN/null/undefined */
function safeNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSimulation(row: any): Simulation {
  return {
    id: String(row.id),
    property_id: String(row.property_id),
    user_id: String(row.user_id),
    name: String(row.name),
    loan_amount: safeNum(row.loan_amount),
    interest_rate: safeNum(row.interest_rate, 3.5),
    loan_duration: safeNum(row.loan_duration, 20),
    personal_contribution: safeNum(row.personal_contribution),
    insurance_rate: safeNum(row.insurance_rate, 0.34),
    loan_fees: safeNum(row.loan_fees),
    notary_fees: safeNum(row.notary_fees),
    monthly_rent: safeNum(row.monthly_rent),
    condo_charges: safeNum(row.condo_charges),
    property_tax: safeNum(row.property_tax),
    vacancy_rate: safeNum(row.vacancy_rate, 5),
    airbnb_price_per_night: safeNum(row.airbnb_price_per_night),
    airbnb_occupancy_rate: safeNum(row.airbnb_occupancy_rate, 60),
    airbnb_charges: safeNum(row.airbnb_charges),
    renovation_cost: safeNum(row.renovation_cost),
    fiscal_regime: String(row.fiscal_regime || "micro_bic"),
    maintenance_per_m2: safeNum(row.maintenance_per_m2, 12),
    pno_insurance: safeNum(row.pno_insurance, 200),
    gli_rate: safeNum(row.gli_rate),
    holding_duration: safeNum(row.holding_duration),
    annual_appreciation: safeNum(row.annual_appreciation, 1.5),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
