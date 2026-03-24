import type { InValue } from "@libsql/client";
import { getDb } from "@/infrastructure/database/client";
import { rowAs } from "@/infrastructure/database/row-mapper";
import { Agency } from "./types";

export async function getAgenciesByCity(city: string): Promise<Agency[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM agencies WHERE LOWER(city) = LOWER(?) ORDER BY google_rating DESC NULLS LAST, name ASC",
    args: [city],
  });
  return result.rows.map((r) => rowAs<Agency>(r));
}

export async function getAgenciesByPostalCode(postalCode: string): Promise<Agency[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM agencies WHERE postal_code = ? ORDER BY google_rating DESC NULLS LAST, name ASC",
    args: [postalCode],
  });
  return result.rows.map((r) => rowAs<Agency>(r));
}

export async function getAgencyById(id: string): Promise<Agency | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: "SELECT * FROM agencies WHERE id = ?",
    args: [id],
  });
  return result.rows[0] ? rowAs<Agency>(result.rows[0]) : undefined;
}

export async function getAllAgencies(): Promise<Agency[]> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT * FROM agencies ORDER BY city ASC, name ASC"
  );
  return result.rows.map((r) => rowAs<Agency>(r));
}

export async function getAgencyCities(): Promise<Array<{ city: string; count: number }>> {
  const db = await getDb();
  const result = await db.execute(
    "SELECT city, COUNT(*) as count FROM agencies GROUP BY LOWER(city) ORDER BY count DESC, city ASC"
  );
  return result.rows.map((r) => ({
    city: r.city as string,
    count: Number(r.count),
  }));
}

export async function createAgency(agency: Agency): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO agencies (id, user_id, name, city, postal_code, address, phone, email, website, management_fee_rate, source, google_rating, google_reviews_count, description, image_url)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      agency.id,
      agency.user_id,
      agency.name,
      agency.city,
      agency.postal_code,
      agency.address,
      agency.phone,
      agency.email,
      agency.website,
      agency.management_fee_rate,
      agency.source,
      agency.google_rating,
      agency.google_reviews_count,
      agency.description,
      agency.image_url,
    ],
  });
}

export async function updateAgency(id: string, data: Partial<Agency>): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const args: InValue[] = [];

  const allowedFields = [
    "name", "city", "postal_code", "address", "phone", "email", "website",
    "management_fee_rate", "source", "google_rating", "google_reviews_count",
    "description", "image_url",
  ] as const;

  for (const key of allowedFields) {
    if (key in data) {
      fields.push(`${key} = ?`);
      args.push(data[key as keyof Agency] as InValue);
    }
  }

  if (fields.length === 0) return;

  fields.push("updated_at = datetime('now')");
  args.push(id);

  await db.execute({
    sql: `UPDATE agencies SET ${fields.join(", ")} WHERE id = ?`,
    args,
  });
}

export async function deleteAgency(id: string): Promise<void> {
  const db = await getDb();
  await db.execute({ sql: "DELETE FROM agencies WHERE id = ?", args: [id] });
}
