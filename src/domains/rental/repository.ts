import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import { Property } from "@/domains/property/types";
import type { Simulation } from "@/domains/simulation/types";
import { calculateAll, calculateSimulation } from "@/lib/calculations";
import { RentalEntry, RentalSummary } from "./types";

export async function getRentalEntries(propertyId: string): Promise<RentalEntry[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM rental_entries WHERE property_id = ? ORDER BY month DESC",
    args: [propertyId],
  });
  return result.rows.map((r) => rowAs<RentalEntry>(r));
}

export async function addRentalEntry(
  entry: Omit<RentalEntry, "id" | "created_at">
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();

  await db.execute({
    sql: `INSERT INTO rental_entries (id, property_id, user_id, month, rent_received, charges_paid, vacancy_days, notes)
          VALUES ($id, $property_id, $user_id, $month, $rent_received, $charges_paid, $vacancy_days, $notes)
          ON CONFLICT(property_id, month) DO UPDATE SET
            rent_received = $rent_received,
            charges_paid = $charges_paid,
            vacancy_days = $vacancy_days,
            notes = $notes`,
    args: {
      id,
      property_id: entry.property_id,
      user_id: entry.user_id,
      month: entry.month,
      rent_received: entry.rent_received,
      charges_paid: entry.charges_paid,
      vacancy_days: entry.vacancy_days,
      notes: entry.notes,
    },
  });

  return id;
}

export async function deleteRentalEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: "DELETE FROM rental_entries WHERE id = ?",
    args: [id],
  });
}

export async function getRentalSummary(
  propertyId: string,
  property: Property,
  simulation?: Simulation | null
): Promise<RentalSummary | null> {
  const entries = await getRentalEntries(propertyId);
  if (entries.length === 0) return null;

  const total_rent_received = entries.reduce((s, e) => s + e.rent_received, 0);
  const total_charges_paid = entries.reduce((s, e) => s + e.charges_paid, 0);
  const total_vacancy_days = entries.reduce((s, e) => s + e.vacancy_days, 0);
  const months_tracked = entries.length;

  const avg_monthly_rent = total_rent_received / months_tracked;
  const avg_monthly_charges = total_charges_paid / months_tracked;

  // Calculate actual net yield based on real data
  const calcs = simulation ? calculateSimulation(property, simulation) : calculateAll(property);
  const annual_actual_net = (avg_monthly_rent - avg_monthly_charges) * 12;
  const actual_net_yield =
    calcs.total_project_cost > 0
      ? (annual_actual_net / calcs.total_project_cost) * 100
      : 0;

  return {
    total_rent_received: Math.round(total_rent_received),
    total_charges_paid: Math.round(total_charges_paid),
    total_vacancy_days,
    months_tracked,
    avg_monthly_rent: Math.round(avg_monthly_rent * 100) / 100,
    avg_monthly_charges: Math.round(avg_monthly_charges * 100) / 100,
    actual_net_yield: Math.round(actual_net_yield * 100) / 100,
    predicted_net_yield: calcs.net_yield,
    yield_delta: Math.round((actual_net_yield - calcs.net_yield) * 100) / 100,
  };
}
