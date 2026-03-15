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
      renovation_cost, fiscal_regime
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id, propertyId, userId, data.name,
      data.loan_amount, data.interest_rate, data.loan_duration, data.personal_contribution,
      data.insurance_rate, data.loan_fees, data.notary_fees,
      data.monthly_rent, data.condo_charges, data.property_tax, data.vacancy_rate,
      data.airbnb_price_per_night, data.airbnb_occupancy_rate, data.airbnb_charges,
      data.renovation_cost, data.fiscal_regime,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSimulation(row: any): Simulation {
  return {
    id: String(row.id),
    property_id: String(row.property_id),
    user_id: String(row.user_id),
    name: String(row.name),
    loan_amount: Number(row.loan_amount),
    interest_rate: Number(row.interest_rate),
    loan_duration: Number(row.loan_duration),
    personal_contribution: Number(row.personal_contribution),
    insurance_rate: Number(row.insurance_rate),
    loan_fees: Number(row.loan_fees),
    notary_fees: Number(row.notary_fees),
    monthly_rent: Number(row.monthly_rent),
    condo_charges: Number(row.condo_charges),
    property_tax: Number(row.property_tax),
    vacancy_rate: Number(row.vacancy_rate),
    airbnb_price_per_night: Number(row.airbnb_price_per_night),
    airbnb_occupancy_rate: Number(row.airbnb_occupancy_rate),
    airbnb_charges: Number(row.airbnb_charges),
    renovation_cost: Number(row.renovation_cost),
    fiscal_regime: String(row.fiscal_regime || "micro_bic"),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}
